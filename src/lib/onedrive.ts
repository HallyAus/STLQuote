/**
 * OneDrive (Microsoft Graph) OAuth2 + API helpers.
 *
 * Uses raw fetch against Microsoft Graph API — no SDK.
 * Tokens are stored encrypted in CloudConnection.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_AUTH_BASE = "https://login.microsoftonline.com";
const MS_GRAPH_API = "https://graph.microsoft.com/v1.0";

const SCOPES = [
  "Files.ReadWrite.All",
  "User.Read",
  "offline_access",
].join(" ");

function getClientId(): string {
  const id = process.env.ONEDRIVE_CLIENT_ID;
  if (!id) throw new Error("ONEDRIVE_CLIENT_ID not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.ONEDRIVE_CLIENT_SECRET;
  if (!secret) throw new Error("ONEDRIVE_CLIENT_SECRET not configured");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.ONEDRIVE_REDIRECT_URI;
  if (!uri) throw new Error("ONEDRIVE_REDIRECT_URI not configured");
  return uri;
}

function getTenantId(): string {
  return process.env.ONEDRIVE_TENANT_ID || "common";
}

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

/** Build the Microsoft OAuth2 authorisation URL. */
export function getOneDriveAuthUrl(state: string): string {
  const tenant = getTenantId();
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
    response_mode: "query",
  });
  return `${MS_AUTH_BASE}/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

interface MsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Exchange an authorisation code for access + refresh tokens. */
export async function exchangeCodeForTokens(code: string): Promise<MsTokenResponse> {
  const tenant = getTenantId();
  const res = await fetch(`${MS_AUTH_BASE}/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive token exchange failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<MsTokenResponse>;
}

/** Refresh an expired access token. */
export async function refreshAccessToken(refreshToken: string): Promise<MsTokenResponse> {
  const tenant = getTenantId();
  const res = await fetch(`${MS_AUTH_BASE}/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive token refresh failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<MsTokenResponse>;
}

/** Get the email of the authenticated user. */
export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${MS_GRAPH_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Microsoft user info");
  const data = await res.json();
  return (data.mail || data.userPrincipalName) as string;
}

// ---------------------------------------------------------------------------
// Authenticated client
// ---------------------------------------------------------------------------

/**
 * Get a valid access token for a user's OneDrive connection.
 * Automatically refreshes if expired.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const conn = await prisma.cloudConnection.findUnique({
    where: { userId_provider: { userId, provider: "onedrive" } },
  });

  if (!conn) throw new Error("OneDrive not connected");

  let accessToken = decrypt(conn.accessToken);
  const expiresAt = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
  const isExpired = Date.now() >= expiresAt - 60_000;

  if (isExpired) {
    const refreshToken = decrypt(conn.refreshToken);
    const tokens = await refreshAccessToken(refreshToken);
    accessToken = tokens.access_token;

    await prisma.cloudConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encrypt(tokens.access_token),
        ...(tokens.refresh_token ? { refreshToken: encrypt(tokens.refresh_token) } : {}),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  }

  return accessToken;
}

// ---------------------------------------------------------------------------
// Drive operations
// ---------------------------------------------------------------------------

interface DriveItem {
  id: string;
  name: string;
  size?: number;
  lastModifiedDateTime?: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: { id: string; path: string };
}

/** Create a folder in OneDrive. Returns the folder ID. */
export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const path = parentId
    ? `${MS_GRAPH_API}/me/drive/items/${parentId}/children`
    : `${MS_GRAPH_API}/me/drive/root/children`;

  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive create folder failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

/** Upload a file to OneDrive (up to 4MB — simple upload). Returns the item metadata. */
export async function uploadFile(
  accessToken: string,
  name: string,
  _mimeType: string,
  content: Buffer,
  folderId?: string
): Promise<DriveItem> {
  const path = folderId
    ? `${MS_GRAPH_API}/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/content`
    : `${MS_GRAPH_API}/me/drive/root:/${encodeURIComponent(name)}:/content`;

  const res = await fetch(path, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(content),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive upload failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<DriveItem>;
}

/** Download a file from OneDrive. Returns the file content as a Buffer. */
export async function downloadFile(accessToken: string, itemId: string): Promise<Buffer> {
  const res = await fetch(`${MS_GRAPH_API}/me/drive/items/${itemId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "follow",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive download failed (${res.status}): ${body}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** List children of a folder (or root). */
export async function listFiles(
  accessToken: string,
  folderId?: string,
  skipToken?: string
): Promise<{ items: DriveItem[]; nextLink?: string }> {
  let url = folderId
    ? `${MS_GRAPH_API}/me/drive/items/${folderId}/children?$top=50&$orderby=name`
    : `${MS_GRAPH_API}/me/drive/root/children?$top=50&$orderby=name`;

  if (skipToken) url += `&$skiptoken=${skipToken}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive list files failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    items: data.value as DriveItem[],
    nextLink: data["@odata.nextLink"],
  };
}

/** Get item metadata. */
export async function getFileMetadata(accessToken: string, itemId: string): Promise<DriveItem> {
  const res = await fetch(`${MS_GRAPH_API}/me/drive/items/${itemId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OneDrive get metadata failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<DriveItem>;
}

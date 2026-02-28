/**
 * Google Drive OAuth2 + API helpers.
 *
 * Uses raw fetch against the Google APIs — no SDK.
 * Tokens are stored encrypted in CloudConnection.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function getClientId(): string {
  const id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_CLIENT_ID not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_DRIVE_CLIENT_SECRET not configured");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!uri) throw new Error("GOOGLE_DRIVE_REDIRECT_URI not configured");
  return uri;
}

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

/** Build the Google OAuth2 authorisation URL. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Exchange an authorisation code for access + refresh tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
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
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

/** Refresh an expired access token. */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
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
    throw new Error(`Google token refresh failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GoogleTokenResponse>;
}

/** Get the email of the authenticated user. */
export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google user info");
  const data = await res.json();
  return data.email as string;
}

// ---------------------------------------------------------------------------
// Authenticated client
// ---------------------------------------------------------------------------

/**
 * Get a valid access token for a user's Google Drive connection.
 * Automatically refreshes if expired.
 */
export async function getAccessToken(userId: string): Promise<string> {
  const conn = await prisma.cloudConnection.findUnique({
    where: { userId_provider: { userId, provider: "google_drive" } },
  });

  if (!conn) throw new Error("Google Drive not connected");

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

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

/** Create a folder in Google Drive. Returns the folder ID. */
export async function createFolder(
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const res = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive create folder failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

/** Upload a file to Google Drive. Returns the file metadata. */
export async function uploadFile(
  accessToken: string,
  name: string,
  mimeType: string,
  content: Buffer,
  folderId?: string
): Promise<DriveFile> {
  const metadata: Record<string, unknown> = { name };
  if (folderId) metadata.parents = [folderId];

  // Use multipart upload for files under 5MB, resumable for larger
  const boundary = "printforge_boundary_" + Date.now();
  const metaPart = JSON.stringify(metadata);

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(`${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Drive upload failed (${res.status}): ${errBody}`);
  }

  return res.json() as Promise<DriveFile>;
}

/** Download a file from Google Drive. Returns the file content as a Buffer. */
export async function downloadFile(accessToken: string, fileId: string): Promise<Buffer> {
  const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive download failed (${res.status}): ${body}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** List files in a folder (or root). */
export async function listFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : "'root' in parents and trashed = false";

  const params = new URLSearchParams({
    q: query,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents)",
    pageSize: "50",
    orderBy: "folder,name",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive list files failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<{ files: DriveFile[]; nextPageToken?: string }>;
}

/** Get file metadata. */
export async function getFileMetadata(accessToken: string, fileId: string): Promise<DriveFile> {
  const res = await fetch(`${GOOGLE_DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,parents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive get metadata failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<DriveFile>;
}

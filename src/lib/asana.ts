/**
 * Asana OAuth2 client — project management integration.
 * Creates tasks from quote requests, syncs job statuses.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

const ASANA_AUTH_URL = "https://app.asana.com/-/oauth_authorize";
const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";
const ASANA_API_BASE = "https://app.asana.com/api/1.0";

function getClientId(): string {
  const id = process.env.ASANA_CLIENT_ID;
  if (!id) throw new Error("ASANA_CLIENT_ID not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.ASANA_CLIENT_SECRET;
  if (!secret) throw new Error("ASANA_CLIENT_SECRET not configured");
  return secret;
}

function getRedirectUri(): string {
  return (
    process.env.ASANA_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/asana/callback`
  );
}

// --- OAuth ---

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
  });
  return `${ASANA_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  data: { id: string; name: string; email: string };
}> {
  const res = await fetch(ASANA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch(ASANA_TOKEN_URL, {
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
    const text = await res.text();
    throw new Error(`Asana token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

/** Get a valid access token for a user, auto-refreshing if expired. */
export async function getAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      asanaAccessToken: true,
      asanaRefreshToken: true,
      asanaTokenExpiresAt: true,
    },
  });

  if (!user?.asanaAccessToken || !user?.asanaRefreshToken) {
    throw new Error("Asana not connected");
  }

  const accessToken = decrypt(user.asanaAccessToken);
  const refreshToken = decrypt(user.asanaRefreshToken);

  // Refresh if token expires within 5 minutes
  const expiresAt = user.asanaTokenExpiresAt;
  const buffer = 5 * 60 * 1000;
  if (expiresAt && expiresAt.getTime() - Date.now() > buffer) {
    return accessToken;
  }

  // Refresh the token
  const result = await refreshAccessToken(refreshToken);

  await prisma.user.update({
    where: { id: userId },
    data: {
      asanaAccessToken: encrypt(result.access_token),
      asanaTokenExpiresAt: new Date(Date.now() + result.expires_in * 1000),
    },
  });

  return result.access_token;
}

// --- API Helpers ---

async function asanaGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${ASANA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.data;
}

async function asanaPost<T>(accessToken: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ASANA_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.data;
}

// --- Workspaces & Projects ---

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaProject {
  gid: string;
  name: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  permalink_url: string;
}

export async function listWorkspaces(accessToken: string): Promise<AsanaWorkspace[]> {
  return asanaGet<AsanaWorkspace[]>(accessToken, "/workspaces");
}

export async function listProjects(accessToken: string, workspaceGid: string): Promise<AsanaProject[]> {
  return asanaGet<AsanaProject[]>(accessToken, `/projects?workspace=${workspaceGid}&opt_fields=name`);
}

export async function createTask(
  accessToken: string,
  opts: {
    name: string;
    notes?: string;
    projectGid?: string;
    workspaceGid: string;
  }
): Promise<AsanaTask> {
  const body: Record<string, unknown> = {
    name: opts.name,
    notes: opts.notes || "",
    workspace: opts.workspaceGid,
  };
  if (opts.projectGid) {
    body.projects = [opts.projectGid];
  }
  return asanaPost<AsanaTask>(accessToken, "/tasks", body);
}

// --- Quote Request Auto-Create ---

/**
 * Create an Asana task for a new quote request (fire-and-forget).
 * Only creates if user has Asana connected + autoCreateTasks enabled.
 */
export async function createQuoteRequestTask(
  userId: string,
  data: {
    clientName: string;
    clientEmail: string;
    fileName: string;
    fileSize: number;
    description?: string | null;
    linkLabel: string;
  }
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        asanaAccessToken: true,
        asanaAutoCreateTasks: true,
        asanaWorkspaceGid: true,
        asanaProjectGid: true,
      },
    });

    if (!user?.asanaAccessToken || !user.asanaAutoCreateTasks || !user.asanaWorkspaceGid) {
      return;
    }

    const accessToken = await getAccessToken(userId);

    const fileSizeMB = (data.fileSize / 1024 / 1024).toFixed(1);
    const notes = [
      `Customer: ${data.clientName}`,
      `Email: ${data.clientEmail}`,
      `File: ${data.fileName} (${fileSizeMB} MB)`,
      data.description ? `Notes: ${data.description}` : null,
      "",
      `Submitted via upload link: ${data.linkLabel}`,
      `Created by Printforge CRM`,
    ]
      .filter(Boolean)
      .join("\n");

    await createTask(accessToken, {
      name: `Quote Request: ${data.clientName} — ${data.fileName}`,
      notes,
      workspaceGid: user.asanaWorkspaceGid,
      projectGid: user.asanaProjectGid || undefined,
    });
  } catch (err) {
    // Non-blocking — log but don't fail the upload
    console.error("Failed to create Asana task for quote request:", err);
  }
}

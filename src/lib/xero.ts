/**
 * Xero OAuth2 + API helpers.
 *
 * Uses raw fetch against the Xero API — no xero-node SDK.
 * Tokens are stored per-user on the User model.
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decryptOrPlaintext } from "@/lib/encryption";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XERO_AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "offline_access",
].join(" ");

function getClientId(): string {
  const id = process.env.XERO_CLIENT_ID;
  if (!id) throw new Error("XERO_CLIENT_ID not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.XERO_CLIENT_SECRET;
  if (!secret) throw new Error("XERO_CLIENT_SECRET not configured");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.XERO_REDIRECT_URI;
  if (!uri) throw new Error("XERO_REDIRECT_URI not configured");
  return uri;
}

// ---------------------------------------------------------------------------
// OAuth2 helpers
// ---------------------------------------------------------------------------

/** Build the Xero OAuth2 authorisation URL. */
export function getXeroAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    scope: XERO_SCOPES,
    state,
  });

  return `${XERO_AUTH_URL}?${params.toString()}`;
}

interface XeroTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: string;
  id_token?: string;
}

/** Exchange an authorisation code for access + refresh tokens. */
export async function exchangeCodeForTokens(code: string): Promise<XeroTokenResponse> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token exchange failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<XeroTokenResponse>;
}

/** Refresh an expired access token using the refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<XeroTokenResponse> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<XeroTokenResponse>;
}

// ---------------------------------------------------------------------------
// Tenant lookup
// ---------------------------------------------------------------------------

interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

/** Get the list of Xero organisations the user has authorised. */
export async function getXeroTenants(accessToken: string): Promise<XeroTenant[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero connections request failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<XeroTenant[]>;
}

// ---------------------------------------------------------------------------
// Authenticated API client
// ---------------------------------------------------------------------------

interface XeroClient {
  get: (path: string) => Promise<Response>;
  post: (path: string, body: unknown) => Promise<Response>;
  put: (path: string, body: unknown) => Promise<Response>;
}

/**
 * Get a ready-to-use Xero API client for a user.
 * Automatically refreshes expired tokens before making requests.
 */
export async function getXeroClient(userId: string): Promise<XeroClient> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xeroAccessToken: true,
      xeroRefreshToken: true,
      xeroTokenExpiresAt: true,
      xeroTenantId: true,
    },
  });

  if (!user?.xeroAccessToken || !user?.xeroRefreshToken || !user?.xeroTenantId) {
    throw new Error("Xero is not connected for this user");
  }

  let accessToken = decryptOrPlaintext(user.xeroAccessToken);
  const tenantId = user.xeroTenantId;

  // Refresh if expired (or within 60s of expiry)
  const expiresAt = user.xeroTokenExpiresAt ? new Date(user.xeroTokenExpiresAt).getTime() : 0;
  const isExpired = Date.now() >= expiresAt - 60_000;

  if (isExpired) {
    const decryptedRefresh = decryptOrPlaintext(user.xeroRefreshToken);
    const tokens = await refreshAccessToken(decryptedRefresh);
    accessToken = tokens.access_token;

    // Persist encrypted refreshed tokens
    await prisma.user.update({
      where: { id: userId },
      data: {
        xeroAccessToken: encrypt(tokens.access_token),
        xeroRefreshToken: encrypt(tokens.refresh_token),
        xeroTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  }

  function headers(): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  return {
    get: (path: string) =>
      fetch(`${XERO_API_BASE}${path}`, { headers: headers() }),

    post: (path: string, body: unknown) =>
      fetch(`${XERO_API_BASE}${path}`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      }),

    put: (path: string, body: unknown) =>
      fetch(`${XERO_API_BASE}${path}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(body),
      }),
  };
}

// ---------------------------------------------------------------------------
// Contact helpers
// ---------------------------------------------------------------------------

/**
 * Create or update a contact in Xero (matched by name).
 * Returns the Xero ContactID.
 */
export async function pushContactToXero(
  userId: string,
  client: { name: string; email?: string | null; phone?: string | null }
): Promise<string> {
  const xero = await getXeroClient(userId);

  const contactPayload: Record<string, unknown> = {
    Name: client.name,
  };

  if (client.email) {
    contactPayload.EmailAddress = client.email;
  }

  if (client.phone) {
    contactPayload.Phones = [
      { PhoneType: "DEFAULT", PhoneNumber: client.phone },
    ];
  }

  // Xero's Contacts endpoint with summarizeErrors=false returns individual statuses
  const res = await xero.post("/Contacts?summarizeErrors=false", {
    Contacts: [contactPayload],
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero push contact failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const contact = data?.Contacts?.[0];

  if (!contact?.ContactID) {
    // Contact might already exist — search by name and update
    const searchRes = await xero.get(`/Contacts?where=Name=="${encodeURIComponent(client.name)}"`);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = searchData?.Contacts?.[0];
      if (existing?.ContactID) {
        // Update the existing contact
        await xero.post("/Contacts?summarizeErrors=false", {
          Contacts: [{ ...contactPayload, ContactID: existing.ContactID }],
        });
        return existing.ContactID as string;
      }
    }
    throw new Error("Failed to create or find contact in Xero");
  }

  return contact.ContactID as string;
}

// ---------------------------------------------------------------------------
// Invoice helpers
// ---------------------------------------------------------------------------

interface XeroInvoiceInput {
  invoiceNumber: string;
  contactName: string;
  lineItems: { description: string; quantity: number; unitAmount: number }[];
  dueDate?: string;
  currency?: string;
}

/**
 * Create a DRAFT invoice in Xero.
 * Returns the Xero InvoiceID.
 */
export async function pushInvoiceToXero(
  userId: string,
  invoice: XeroInvoiceInput
): Promise<string> {
  const xero = await getXeroClient(userId);

  const xeroLineItems = invoice.lineItems.map((li) => ({
    Description: li.description,
    Quantity: li.quantity,
    UnitAmount: li.unitAmount,
    AccountCode: "200", // Sales revenue — standard Xero default
  }));

  const invoicePayload: Record<string, unknown> = {
    Type: "ACCREC", // Accounts Receivable (sales invoice)
    InvoiceNumber: invoice.invoiceNumber,
    Contact: { Name: invoice.contactName },
    LineItems: xeroLineItems,
    Status: "DRAFT",
    LineAmountTypes: "Exclusive", // Amounts exclude tax
  };

  if (invoice.dueDate) {
    invoicePayload.DueDate = invoice.dueDate;
  }

  if (invoice.currency) {
    invoicePayload.CurrencyCode = invoice.currency;
  }

  const res = await xero.post("/Invoices?summarizeErrors=false", {
    Invoices: [invoicePayload],
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero push invoice failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const xeroInvoice = data?.Invoices?.[0];

  if (!xeroInvoice?.InvoiceID) {
    throw new Error("Xero did not return an InvoiceID");
  }

  return xeroInvoice.InvoiceID as string;
}

// ---------------------------------------------------------------------------
// Payment helpers
// ---------------------------------------------------------------------------

/**
 * Record a payment against an invoice in Xero.
 * Looks up the invoice by InvoiceNumber.
 */
export async function recordPaymentInXero(
  userId: string,
  invoiceNumber: string,
  amount: number,
  date: string
): Promise<string> {
  const xero = await getXeroClient(userId);

  const paymentPayload = {
    Invoice: { InvoiceNumber: invoiceNumber },
    Account: { Code: "090" }, // Default bank account — user may need to adjust
    Amount: amount,
    Date: date,
  };

  const res = await xero.put("/Payments", {
    Payments: [paymentPayload],
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero record payment failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const payment = data?.Payments?.[0];

  if (!payment?.PaymentID) {
    throw new Error("Xero did not return a PaymentID");
  }

  return payment.PaymentID as string;
}

// ---------------------------------------------------------------------------
// Void invoice
// ---------------------------------------------------------------------------

/** Void an invoice in Xero by InvoiceNumber. */
export async function voidInvoiceInXero(
  userId: string,
  invoiceNumber: string
): Promise<void> {
  const xero = await getXeroClient(userId);

  const res = await xero.post("/Invoices?summarizeErrors=false", {
    Invoices: [
      {
        InvoiceNumber: invoiceNumber,
        Status: "VOIDED",
      },
    ],
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero void invoice failed (${res.status}): ${body}`);
  }
}

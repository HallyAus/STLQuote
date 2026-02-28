import { createHmac } from "crypto";

export function signImpersonation(adminId: string, targetId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET or AUTH_SECRET must be configured");
  const payload = `${adminId}:${targetId}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifyImpersonation(cookieValue: string, adminId: string): string | null {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;
  const [cookieAdminId, targetId, sig] = parts;
  if (cookieAdminId !== adminId) return null;
  const expectedSig = createHmac("sha256", secret).update(`${cookieAdminId}:${targetId}`).digest("hex");
  if (sig.length !== expectedSig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  return mismatch === 0 ? targetId : null;
}

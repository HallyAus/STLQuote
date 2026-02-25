import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(email: string): Promise<string> {
  // Delete any existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expires },
  });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<{ valid: true; email: string } | { valid: false }> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false };
  if (record.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return { valid: false };
  }

  return { valid: true, email: record.email };
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const result = await validatePasswordResetToken(token);
  if (!result.valid) return null;

  await prisma.passwordResetToken.deleteMany({ where: { email: result.email } });
  return result.email;
}

export async function createEmailVerificationToken(email: string): Promise<string> {
  // Delete any existing tokens for this email
  await prisma.emailVerificationToken.deleteMany({ where: { email } });

  const token = generateToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerificationToken.create({
    data: { email, token, expires },
  });

  return token;
}

export async function validateEmailVerificationToken(
  token: string
): Promise<{ valid: true; email: string } | { valid: false }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record) return { valid: false };
  if (record.expires < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return { valid: false };
  }

  // Consume the token
  await prisma.emailVerificationToken.deleteMany({ where: { email: record.email } });
  return { valid: true, email: record.email };
}

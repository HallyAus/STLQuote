import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  isImpersonating: boolean;
  realUserId?: string;
}

/**
 * Get the current session user. If an admin is impersonating another user,
 * returns the impersonated user's info with isImpersonating=true.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const realUserId = session.user.id;
  const role = session.user.role;

  // Check for impersonation (admin only)
  if (role === "ADMIN") {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get("impersonate-user-id")?.value;

    if (impersonateId && impersonateId !== realUserId) {
      const impersonatedUser = await prisma.user.findUnique({
        where: { id: impersonateId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (impersonatedUser) {
        return {
          id: impersonatedUser.id,
          email: impersonatedUser.email,
          name: impersonatedUser.name,
          role: impersonatedUser.role,
          isImpersonating: true,
          realUserId,
        };
      }
    }
  }

  return {
    id: realUserId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role,
    isImpersonating: false,
  };
}

/**
 * Require authentication — returns user or throws a Response with 401.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Require admin role — returns user or throws 403.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (session.user.role !== "ADMIN") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
    isImpersonating: false,
  };
}

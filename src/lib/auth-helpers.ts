import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveTier, hasFeatureWithOverrides, type Feature, type Tier } from "@/lib/tier";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  isImpersonating: boolean;
  realUserId?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  effectiveTier: Tier;
  moduleOverrides: Record<string, string>;
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
  const subscriptionTier = session.user.subscriptionTier ?? "free";
  const subscriptionStatus = session.user.subscriptionStatus ?? "trialing";
  const trialEndsAt = session.user.trialEndsAt ?? null;

  // Check for impersonation (admin or super admin only)
  if (isAdminRole(role)) {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get("impersonate-user-id")?.value;

    if (impersonateId && impersonateId !== realUserId) {
      const impersonatedUser = await prisma.user.findUnique({
        where: { id: impersonateId },
        select: { id: true, email: true, name: true, role: true, subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, modules: { select: { feature: true, override: true } } },
      });

      if (impersonatedUser) {
        const impTrialEndsAt = impersonatedUser.trialEndsAt?.toISOString() ?? null;
        const overrides: Record<string, string> = {};
        for (const m of impersonatedUser.modules) overrides[m.feature] = m.override;
        return {
          id: impersonatedUser.id,
          email: impersonatedUser.email,
          name: impersonatedUser.name,
          role: impersonatedUser.role,
          isImpersonating: true,
          realUserId,
          subscriptionTier: impersonatedUser.subscriptionTier,
          subscriptionStatus: impersonatedUser.subscriptionStatus,
          trialEndsAt: impTrialEndsAt,
          effectiveTier: getEffectiveTier({ subscriptionTier: impersonatedUser.subscriptionTier, subscriptionStatus: impersonatedUser.subscriptionStatus, trialEndsAt: impTrialEndsAt, role: impersonatedUser.role }),
          moduleOverrides: overrides,
        };
      }
    }
  }

  // Fetch module overrides for the current user
  const modules = await prisma.userModule.findMany({
    where: { userId: realUserId },
    select: { feature: true, override: true },
  });
  const moduleOverrides: Record<string, string> = {};
  for (const m of modules) moduleOverrides[m.feature] = m.override;

  return {
    id: realUserId,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role,
    isImpersonating: false,
    subscriptionTier,
    subscriptionStatus,
    trialEndsAt,
    effectiveTier: getEffectiveTier({ subscriptionTier, subscriptionStatus, trialEndsAt, role }),
    moduleOverrides,
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

/** Check if a role has admin-level access (ADMIN or SUPER_ADMIN) */
export function isAdminRole(role: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Check if a role is SUPER_ADMIN */
export function isSuperAdminRole(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Require a Pro feature — returns user or throws 403 with upgrade message.
 */
export async function requireFeature(feature: Feature): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!hasFeatureWithOverrides(user.effectiveTier, feature, user.moduleOverrides)) {
    throw new Response(
      JSON.stringify({ error: "This feature requires a Pro subscription", code: "PRO_REQUIRED", feature }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return user;
}

/**
 * Require admin role (ADMIN or SUPER_ADMIN) — returns user or throws 403.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isAdminRole(session.user.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const tier = session.user.subscriptionTier ?? "free";
  const status = session.user.subscriptionStatus ?? "trialing";
  const trial = session.user.trialEndsAt ?? null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
    isImpersonating: false,
    subscriptionTier: tier,
    subscriptionStatus: status,
    trialEndsAt: trial,
    effectiveTier: getEffectiveTier({ subscriptionTier: tier, subscriptionStatus: status, trialEndsAt: trial, role: session.user.role }),
    moduleOverrides: {},
  };
}

/**
 * Require SUPER_ADMIN role — returns user or throws 403.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!isSuperAdminRole(session.user.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden — Super Admin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const tier = session.user.subscriptionTier ?? "free";
  const status = session.user.subscriptionStatus ?? "trialing";
  const trial = session.user.trialEndsAt ?? null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    role: session.user.role,
    isImpersonating: false,
    subscriptionTier: tier,
    subscriptionStatus: status,
    trialEndsAt: trial,
    effectiveTier: getEffectiveTier({ subscriptionTier: tier, subscriptionStatus: status, trialEndsAt: trial, role: session.user.role }),
    moduleOverrides: {},
  };
}

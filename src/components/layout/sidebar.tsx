"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Calculator,
  Printer,
  Palette,
  FileText,
  Users,
  Briefcase,
  Settings,
  Shield,
  LogOut,
  X,
  Package,
  Receipt,
  Wrench,
  ShoppingCart,
  Lock,
  Plug,
  BookTemplate,
  UserCircle,
  Map,
  Inbox,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEffectiveTier, hasFeatureWithOverrides, type Feature } from "@/lib/tier";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calculator", label: "Calculator", icon: Calculator },
      { href: "/designs", label: "Design Studio", icon: Lightbulb, proOnly: true },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/quotes", label: "Quotes", icon: FileText },
      { href: "/quote-templates", label: "Templates", icon: BookTemplate },
      { href: "/invoices", label: "Invoices", icon: Receipt, proOnly: true },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/quote-requests", label: "Requests", icon: Inbox },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Equipment",
    items: [
      { href: "/printers", label: "Printers", icon: Printer },
      { href: "/materials", label: "Materials", icon: Palette },
      { href: "/suppliers", label: "Suppliers", icon: Package, proOnly: true },
      { href: "/consumables", label: "Consumables", icon: Wrench, proOnly: true },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, proOnly: true },
    ],
  },
  {
    label: "Integrations",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug, proOnly: true },
    ],
  },
];

const roadmapItem: NavItem = {
  href: "/roadmap",
  label: "Roadmap",
  icon: Map,
};

const accountItem: NavItem = {
  href: "/account",
  label: "Account",
  icon: UserCircle,
};

const settingsItem: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function NavLink({
  item,
  isActive,
  onClose,
  compact,
  locked,
  badge,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
  compact?: boolean;
  locked?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={locked ? "/settings" : item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 border-l-3 px-3 py-2 text-[13px] font-medium transition-all duration-150",
        locked && "opacity-50",
        isActive && !locked
          ? "border-sidebar-primary bg-sidebar-accent/60 text-sidebar-primary"
          : "border-transparent text-sidebar-foreground/70 hover:border-sidebar-accent hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
      )}
    >
      {locked ? (
        <Lock className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
      ) : (
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors duration-150",
            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
          )}
        />
      )}
      {item.label}
      {locked && (
        <span className="ml-auto rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
          Pro
        </span>
      )}
      {!locked && badge != null && badge > 0 && (
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function isRouteActive(href: string, pathname: string): boolean {
  return pathname === href || pathname?.startsWith(href + "/");
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const effectiveTier = session?.user ? getEffectiveTier({
    subscriptionTier: session.user.subscriptionTier ?? "free",
    subscriptionStatus: session.user.subscriptionStatus ?? "trialing",
    trialEndsAt: session.user.trialEndsAt ?? null,
    role: session.user.role,
  }) : "free";
  const isFree = effectiveTier === "free";

  // Fetch module overrides for current user
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    // Admin users manage their own overrides; for self, check via a lightweight endpoint
    // We'll use the session approach — piggyback on the existing session data
    // For now, fetch overrides from the modules endpoint for the logged-in user
    fetch("/api/user/modules")
      .then((res) => (res.ok ? res.json() : { overrides: {} }))
      .then((data) => {
        if (!cancelled && data.overrides) setModuleOverrides(data.overrides);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session?.user]);

  function isFeatureLocked(item: NavItem): boolean {
    if (!item.proOnly) return false;
    // Check module overrides first — map href to feature name
    const featureMap: Record<string, Feature> = {
      "/invoices": "invoicing",
      "/suppliers": "suppliers",
      "/consumables": "consumables",
      "/purchase-orders": "suppliers",
      "/integrations": "webhooks",
      "/designs": "design_studio",
    };
    const feature = featureMap[item.href];
    if (feature) {
      return !hasFeatureWithOverrides(effectiveTier, feature, moduleOverrides);
    }
    return isFree;
  }

  // Fetch pending waitlist count for admins
  const [waitlistCount, setWaitlistCount] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch("/api/waitlist")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { status?: string }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setWaitlistCount(data.filter((e) => e.status === "pending").length);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAdmin]);

  // Fetch queued job count
  const [queuedJobCount, setQueuedJobCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/jobs")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { status?: string }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setQueuedJobCount(data.filter((j) => j.status === "QUEUED").length);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch pending quote request count
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/quote-requests")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { status?: string }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setPendingRequestCount(data.filter((r) => r.status === "PENDING").length);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo / App name */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary shadow-sm">
              <Printer className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight tracking-tight">
                Printforge
              </span>
              <span className="text-[10px] font-medium leading-tight text-sidebar-foreground/40">
                Quote Manager
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-sidebar-accent transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Onboarding guide — shown for 14 days after signup */}
        <OnboardingGuide onClose={onClose} />

        {/* Navigation groups */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 pt-4 pb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isRouteActive(item.href, pathname)}
                    onClose={onClose}
                    locked={isFeatureLocked(item)}
                    badge={item.href === "/jobs" ? queuedJobCount : item.href === "/quote-requests" ? pendingRequestCount : undefined}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Admin nav item — only for ADMIN role */}
          {isAdmin && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-3 pt-4 pb-2">
                Admin
              </p>
              <div className="space-y-0.5">
                <NavLink
                  item={{ href: "/admin", label: "Admin", icon: Shield }}
                  isActive={isRouteActive("/admin", pathname)}
                  onClose={onClose}
                  badge={waitlistCount}
                />
              </div>
            </div>
          )}
        </nav>

        {/* Account, Settings & Roadmap — separated */}
        <div className="border-t border-sidebar-border px-2 py-2">
          <NavLink
            item={roadmapItem}
            isActive={isRouteActive(roadmapItem.href, pathname)}
            onClose={onClose}
            compact
          />
          <NavLink
            item={accountItem}
            isActive={isRouteActive(accountItem.href, pathname)}
            onClose={onClose}
            compact
          />
          <NavLink
            item={settingsItem}
            isActive={isRouteActive(settingsItem.href, pathname)}
            onClose={onClose}
            compact
          />
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-2 py-2">
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 border-l-3 border-transparent px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 hover:border-sidebar-accent hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-all duration-150"
            >
              <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
              Sign out
            </button>
          )}
          <div className="flex items-center justify-between px-3 mt-1">
            <p className="text-[11px] font-medium text-muted-foreground/50">
              Printforge
            </p>
            <p className="text-[10px] text-muted-foreground/40 tabular-nums">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

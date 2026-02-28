"use client";

import { useState, useEffect, useCallback } from "react";
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
  ChevronRight,
  CreditCard,
  Boxes,
  Ruler,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEffectiveTier,
  hasFeatureWithOverrides,
  type Feature,
} from "@/lib/tier";
import { OnboardingGuide } from "@/components/onboarding/onboarding-guide";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  proOnly?: boolean;
}

interface CollapsibleGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/** Always visible at the top — no group header */
const pinnedItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calculator", label: "Calculator", icon: Calculator },
];

/** Accordion sections */
const collapsibleGroups: CollapsibleGroup[] = [
  {
    key: "sales",
    label: "Sales & Clients",
    icon: CreditCard,
    items: [
      { href: "/quotes", label: "Quotes", icon: FileText },
      { href: "/quote-templates", label: "Templates", icon: BookTemplate },
      { href: "/invoices", label: "Invoices", icon: Receipt, proOnly: true },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/quote-requests", label: "Requests", icon: Inbox },
    ],
  },
  {
    key: "production",
    label: "Production",
    icon: Briefcase,
    items: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      {
        href: "/designs",
        label: "Design Studio",
        icon: Lightbulb,
        proOnly: true,
      },
      { href: "/printers", label: "Printers", icon: Printer },
      { href: "/materials", label: "Materials", icon: Palette },
    ],
  },
  {
    key: "engineering",
    label: "Engineering",
    icon: Ruler,
    items: [
      {
        href: "/drawings",
        label: "Part Drawings",
        icon: PenTool,
        proOnly: true,
      },
    ],
  },
  {
    key: "inventory",
    label: "Supply Chain",
    icon: Boxes,
    items: [
      {
        href: "/suppliers",
        label: "Suppliers",
        icon: Package,
        proOnly: true,
      },
      {
        href: "/consumables",
        label: "Consumables",
        icon: Wrench,
        proOnly: true,
      },
      {
        href: "/purchase-orders",
        label: "Purchase Orders",
        icon: ShoppingCart,
        proOnly: true,
      },
    ],
  },
];

const SIDEBAR_STATE_KEY = "sidebar-groups";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRouteActive(href: string, pathname: string): boolean {
  return pathname === href || pathname?.startsWith(href + "/");
}

function groupHasActiveRoute(
  group: CollapsibleGroup,
  pathname: string
): boolean {
  return group.items.some((item) => isRouteActive(item.href, pathname));
}

// ---------------------------------------------------------------------------
// NavLink
// ---------------------------------------------------------------------------

function NavLink({
  item,
  isActive,
  onClose,
  locked,
  badge,
  indent,
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
  locked?: boolean;
  badge?: number;
  indent?: boolean;
}) {
  return (
    <Link
      href={locked ? "/settings" : item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
        indent && "ml-2",
        locked && "opacity-50",
        isActive && !locked
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
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
      <span className="truncate">{item.label}</span>
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

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

function CollapsibleSection({
  group,
  expanded,
  onToggle,
  pathname,
  onClose,
  isFeatureLocked,
  getBadge,
}: {
  group: CollapsibleGroup;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
  onClose: () => void;
  isFeatureLocked: (item: NavItem) => boolean;
  getBadge: (href: string) => number | undefined;
}) {
  const hasActive = groupHasActiveRoute(group, pathname);
  const totalBadges = group.items.reduce(
    (sum, item) => sum + (getBadge(item.href) ?? 0),
    0
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] font-semibold transition-all duration-150",
          hasActive && !expanded
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
        )}
      >
        <group.icon
          className={cn(
            "h-4 w-4 shrink-0",
            hasActive && !expanded
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/40"
          )}
        />
        <span className="truncate">{group.label}</span>
        {/* Collapsed indicators */}
        {!expanded && totalBadges > 0 && (
          <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/80 px-1 text-[9px] font-bold text-primary-foreground">
            {totalBadges}
          </span>
        )}
        {!expanded && hasActive && totalBadges === 0 && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
        )}
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30 transition-transform duration-200",
            expanded && "rotate-90",
            // Push chevron to end when no badge/dot
            totalBadges === 0 && !(hasActive && !expanded) && "ml-auto"
          )}
        />
      </button>

      {/* Animated expand/collapse via CSS grid rows */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-1 pt-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isRouteActive(item.href, pathname)}
                onClose={onClose}
                locked={isFeatureLocked(item)}
                badge={getBadge(item.href)}
                indent
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const effectiveTier = session?.user
    ? getEffectiveTier({
        subscriptionTier: session.user.subscriptionTier ?? "free",
        subscriptionStatus: session.user.subscriptionStatus ?? "trialing",
        trialEndsAt: session.user.trialEndsAt ?? null,
        role: session.user.role,
      })
    : "free";
  const isFree = effectiveTier === "free";

  // Module overrides
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetch("/api/user/modules")
      .then((res) => (res.ok ? res.json() : { overrides: {} }))
      .then((data) => {
        if (!cancelled && data.overrides) setModuleOverrides(data.overrides);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const isFeatureLocked = useCallback(
    (item: NavItem): boolean => {
      if (!item.proOnly) return false;
      const featureMap: Record<string, Feature> = {
        "/invoices": "invoicing",
        "/suppliers": "suppliers",
        "/consumables": "consumables",
        "/purchase-orders": "suppliers",
        "/integrations": "webhooks",
        "/designs": "design_studio",
        "/drawings": "part_drawings",
      };
      const feature = featureMap[item.href];
      if (feature) {
        return !hasFeatureWithOverrides(effectiveTier, feature, moduleOverrides);
      }
      return isFree;
    },
    [effectiveTier, isFree, moduleOverrides]
  );

  // Badge counts
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [queuedJobCount, setQueuedJobCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sidebar-counts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setQueuedJobCount(data.queuedJobs ?? 0);
          setPendingRequestCount(data.pendingRequests ?? 0);
          setWaitlistCount(data.pendingWaitlist ?? 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const getBadge = useCallback(
    (href: string): number | undefined => {
      if (href === "/jobs") return queuedJobCount;
      if (href === "/quote-requests") return pendingRequestCount;
      return undefined;
    },
    [queuedJobCount, pendingRequestCount]
  );

  // -----------------------------------------------------------------------
  // Collapsible group state — persisted in localStorage
  // -----------------------------------------------------------------------

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (stored) setCollapsedGroups(new Set(JSON.parse(stored)));
    } catch {}
    setHydrated(true);
  }, []);

  // Auto-expand group containing the active route
  useEffect(() => {
    if (!hydrated) return;
    for (const group of collapsibleGroups) {
      if (
        groupHasActiveRoute(group, pathname) &&
        collapsedGroups.has(group.key)
      ) {
        setCollapsedGroups((prev) => {
          const next = new Set(prev);
          next.delete(group.key);
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hydrated]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
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

        {/* Onboarding guide */}
        <OnboardingGuide onClose={onClose} />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {/* Pinned items — always visible */}
          <div className="space-y-0.5 pt-3 pb-1">
            {pinnedItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isRouteActive(item.href, pathname)}
                onClose={onClose}
              />
            ))}
          </div>

          <div className="mx-3 my-2 h-px bg-sidebar-border" />

          {/* Collapsible groups */}
          <div className="space-y-0.5">
            {collapsibleGroups.map((group) => (
              <CollapsibleSection
                key={group.key}
                group={group}
                expanded={!collapsedGroups.has(group.key)}
                onToggle={() => toggleGroup(group.key)}
                pathname={pathname}
                onClose={onClose}
                isFeatureLocked={isFeatureLocked}
                getBadge={getBadge}
              />
            ))}
          </div>
        </nav>

        {/* Bottom utilities */}
        <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
          <NavLink
            item={{
              href: "/integrations",
              label: "Integrations",
              icon: Plug,
              proOnly: true,
            }}
            isActive={isRouteActive("/integrations", pathname)}
            onClose={onClose}
            locked={isFeatureLocked({
              href: "/integrations",
              label: "Integrations",
              icon: Plug,
              proOnly: true,
            })}
          />
          {isAdmin && (
            <NavLink
              item={{ href: "/admin", label: "Admin", icon: Shield }}
              isActive={isRouteActive("/admin", pathname)}
              onClose={onClose}
              badge={waitlistCount}
            />
          )}
          <NavLink
            item={{ href: "/roadmap", label: "Roadmap", icon: Map }}
            isActive={isRouteActive("/roadmap", pathname)}
            onClose={onClose}
          />
          <NavLink
            item={{ href: "/account", label: "Account", icon: UserCircle }}
            isActive={isRouteActive("/account", pathname)}
            onClose={onClose}
          />
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: Settings }}
            isActive={isRouteActive("/settings", pathname)}
            onClose={onClose}
          />
        </div>

        {/* Sign out + version */}
        <div className="border-t border-sidebar-border px-2 py-2">
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all duration-150"
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

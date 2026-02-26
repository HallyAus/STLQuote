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
  Lock,
  Plug,
  BookTemplate,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEffectiveTier } from "@/lib/tier";
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
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/quotes", label: "Quotes", icon: FileText },
      { href: "/quote-templates", label: "Templates", icon: BookTemplate },
      { href: "/invoices", label: "Invoices", icon: Receipt, proOnly: true },
      { href: "/integrations", label: "Integrations", icon: Plug, proOnly: true },
      { href: "/clients", label: "Clients", icon: Users },
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
    ],
  },
];

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
        "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium transition-colors",
        compact && "text-[13px]",
        locked && "opacity-60",
        isActive && !locked
          ? "border-sidebar-primary bg-sidebar-accent/50 text-sidebar-primary"
          : "border-transparent text-sidebar-foreground/80 hover:border-sidebar-accent hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
      )}
    >
      {locked ? (
        <Lock
          className={cn(
            "h-4 w-4 shrink-0 text-sidebar-foreground/40",
            compact && "h-[14px] w-[14px]"
          )}
        />
      ) : (
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            compact && "h-[14px] w-[14px]",
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

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
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
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shadow-sm">
              <Printer className="h-[18px] w-[18px] text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold leading-tight tracking-tight">
                Printforge
              </span>
              <span className="text-[11px] font-medium leading-tight text-sidebar-foreground/50">
                Quote Manager
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-sidebar-accent lg:hidden"
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pt-4 pb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isRouteActive(item.href, pathname)}
                    onClose={onClose}
                    locked={item.proOnly && isFree}
                    badge={item.href === "/jobs" ? queuedJobCount : undefined}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Admin nav item — only for ADMIN role */}
          {isAdmin && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pt-4 pb-1">
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

        {/* Account & Settings — separated */}
        <div className="border-t border-sidebar-border px-2 py-2">
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
        <div className="border-t border-sidebar-border px-4 py-3">
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2 text-[13px] font-medium text-sidebar-foreground/80 hover:border-sidebar-accent hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-[14px] w-[14px] shrink-0 text-sidebar-foreground/50" />
              Sign out
            </button>
          )}
          <p className="px-3 mt-1 text-xs font-medium text-muted-foreground">
            Printforge
          </p>
          <p className="px-3 mt-0.5 text-[10px] text-muted-foreground/50">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </p>
        </div>
      </aside>
    </>
  );
}

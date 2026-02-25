"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  Printer,
  Palette,
  FileText,
  Users,
  Briefcase,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
    ],
  },
  {
    label: "Equipment",
    items: [
      { href: "/printers", label: "Printers", icon: Printer },
      { href: "/materials", label: "Materials", icon: Palette },
    ],
  },
];

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
}: {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 border-l-2 px-3 py-2 text-sm font-medium transition-colors",
        compact && "text-[13px]",
        isActive
          ? "border-sidebar-primary bg-sidebar-accent/50 text-sidebar-primary"
          : "border-transparent text-sidebar-foreground/80 hover:border-sidebar-accent hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          compact && "h-[14px] w-[14px]",
          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
        )}
      />
      {item.label}
    </Link>
  );
}

function isRouteActive(href: string, pathname: string): boolean {
  return pathname === href || pathname?.startsWith(href + "/");
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

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
          <Link href="/" className="flex items-center gap-3">
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
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings — separated */}
        <div className="border-t border-sidebar-border px-2 py-2">
          <NavLink
            item={settingsItem}
            isActive={isRouteActive(settingsItem.href, pathname)}
            onClose={onClose}
            compact
          />
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Printforge
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/50">
            v{process.env.NEXT_PUBLIC_APP_VERSION}
          </p>
        </div>
      </aside>
    </>
  );
}

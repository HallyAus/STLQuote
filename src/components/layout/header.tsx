"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Moon, Sun, FileText, User, LogOut, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/layout/global-search";

interface HeaderProps {
  title: string;
  breadcrumb?: {
    label: string;
    href: string;
  };
  onMenuToggle: () => void;
}

export function Header({ title, breadcrumb, onMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatedName, setImpersonatedName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Check impersonation status via server endpoint (cookie is httpOnly)
  useEffect(() => {
    async function checkImpersonation() {
      const role = session?.user?.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") return;
      try {
        const res = await fetch("/api/admin/impersonate/status");
        if (res.ok) {
          const data = await res.json();
          setImpersonating(data.impersonating);
          setImpersonatedName(data.name || "");
        }
      } catch {
        // ignore
      }
    }
    checkImpersonation();
  }, [session]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function stopImpersonating() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    setImpersonating(false);
    setImpersonatedName("");
    router.push("/admin");
    router.refresh();
  }

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <>
      {/* Impersonation banner */}
      {impersonating && (
        <div className="flex items-center justify-between bg-amber-500 px-4 py-1.5 text-sm font-medium text-black">
          <span>
            Viewing as <strong>{impersonatedName}</strong>
          </span>
          <button
            onClick={stopImpersonating}
            className="rounded bg-black/20 px-2 py-0.5 text-xs font-semibold hover:bg-black/30"
          >
            Stop impersonating
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Mobile menu toggle — 44px touch target */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Page title with optional breadcrumb */}
        <div className="flex flex-col justify-center min-w-0">
          {breadcrumb && (
            <Link
              href={breadcrumb.href}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors leading-tight"
            >
              {breadcrumb.label}
            </Link>
          )}
          <h1 className={`truncate ${breadcrumb ? "text-base font-semibold leading-tight" : "text-lg font-semibold"}`}>
            {title}
          </h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Global search */}
        <GlobalSearch />

        {/* Quick action: New Quote (desktop only) */}
        <Link href="/quotes/new" className="hidden sm:flex">
          <Button variant="secondary" size="sm" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            New Quote
          </Button>
        </Link>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User menu */}
        {session?.user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {initials}
              </div>
              <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                {session.user.name}
              </span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg animate-scale-in origin-top-right">
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <div className="text-sm font-medium truncate">
                    {session.user.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {session.user.email}
                  </div>
                </div>

                {(session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Admin portal
                  </Link>
                )}

                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>

                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive-foreground transition-colors hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}

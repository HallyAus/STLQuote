"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Page title with optional breadcrumb */}
      <div className="flex flex-col justify-center">
        {breadcrumb && (
          <Link
            href={breadcrumb.href}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors leading-tight"
          >
            {breadcrumb.label}
          </Link>
        )}
        <h1 className={breadcrumb ? "text-base font-semibold leading-tight" : "text-lg font-semibold"}>
          {title}
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

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
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  );
}

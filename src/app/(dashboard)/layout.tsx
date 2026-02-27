"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DebugPanel } from "@/components/debug/debug-panel";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calculator": "Calculator",
  "/printers": "Printers",
  "/materials": "Materials",
  "/quotes": "Quotes",
  "/invoices": "Invoices",
  "/clients": "Clients",
  "/jobs": "Jobs",
  "/suppliers": "Suppliers",
  "/consumables": "Consumables",
  "/purchase-orders": "Purchase Orders",
  "/quote-requests": "Quote Requests",
  "/settings": "Settings",
  "/admin": "Admin",
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  // Match sub-routes (e.g. /quotes/new, /quotes/abc123)
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "Printforge Quote";
}

function resolveBreadcrumb(
  pathname: string
): { label: string; href: string } | undefined {
  // Only show breadcrumb for sub-routes, not top-level pages
  for (const [prefix, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(prefix + "/")) {
      return { label: title, href: prefix };
    }
  }
  return undefined;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = resolveTitle(pathname);
  const breadcrumb = resolveBreadcrumb(pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          breadcrumb={breadcrumb}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
      {process.env.NODE_ENV === "development" && <DebugPanel />}
    </div>
  );
}

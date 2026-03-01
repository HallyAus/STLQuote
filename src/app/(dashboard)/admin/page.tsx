"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Mail,
  CreditCard,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const AdminOverview = dynamic(() => import("@/components/admin/admin-overview").then(m => ({ default: m.AdminOverview })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminUsers = dynamic(() => import("@/components/admin/admin-users").then(m => ({ default: m.AdminUsers })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminSystem = dynamic(() => import("@/components/admin/admin-system").then(m => ({ default: m.AdminSystem })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminEmail = dynamic(() => import("@/components/admin/admin-email").then(m => ({ default: m.AdminEmail })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminBilling = dynamic(() => import("@/components/admin/admin-billing").then(m => ({ default: m.AdminBilling })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });

type Tab = "overview" | "users" | "system" | "email" | "billing";

const TABS: { key: Tab; icon: typeof LayoutDashboard; label: string }[] = [
  { key: "overview", icon: LayoutDashboard, label: "Overview" },
  { key: "users", icon: Users, label: "Users" },
  { key: "system", icon: Settings, label: "System" },
  { key: "email", icon: Mail, label: "Email" },
  { key: "billing", icon: CreditCard, label: "Billing" },
];

export default function AdminPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTabData = TABS.find((t) => t.key === activeTab)!;
  const ActiveIcon = activeTabData.icon;

  return (
    <div className="space-y-6">
      {/* Mobile: dropdown-style tab selector */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <ActiveIcon className="h-4 w-4 text-primary" />
            </span>
            <span className="font-medium text-foreground">{activeTabData.label}</span>
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            mobileNavOpen && "rotate-180"
          )} />
        </button>

        {mobileNavOpen && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setMobileNavOpen(false); }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground active:bg-muted"
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: horizontal pill tabs */}
      <div className="hidden md:flex items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "system" && <AdminSystem />}
      {activeTab === "email" && <AdminEmail />}
      {activeTab === "billing" && <AdminBilling />}
    </div>
  );
}

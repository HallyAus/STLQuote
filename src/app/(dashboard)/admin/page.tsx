"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
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
const AdminWaitlist = dynamic(() => import("@/components/admin/admin-waitlist").then(m => ({ default: m.AdminWaitlist })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminSystem = dynamic(() => import("@/components/admin/admin-system").then(m => ({ default: m.AdminSystem })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminEmail = dynamic(() => import("@/components/admin/admin-email").then(m => ({ default: m.AdminEmail })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });
const AdminBilling = dynamic(() => import("@/components/admin/admin-billing").then(m => ({ default: m.AdminBilling })), { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" /> });

type Tab = "overview" | "users" | "waitlist" | "system" | "email" | "billing";

const TABS: { key: Tab; icon: typeof LayoutDashboard; label: string }[] = [
  { key: "overview", icon: LayoutDashboard, label: "Overview" },
  { key: "users", icon: Users, label: "Users" },
  { key: "waitlist", icon: ClipboardList, label: "Waitlist" },
  { key: "system", icon: Settings, label: "System" },
  { key: "email", icon: Mail, label: "Email" },
  { key: "billing", icon: CreditCard, label: "Billing" },
];

export default function AdminPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [waitlistPendingCount, setWaitlistPendingCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Fetch waitlist count for badge
  const fetchWaitlistCount = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) {
        const data = await res.json();
        setWaitlistPendingCount(
          Array.isArray(data) ? data.filter((e: { status: string }) => e.status === "pending").length : 0
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchWaitlistCount();
  }, [fetchWaitlistCount]);

  // Refresh count when switching away from waitlist
  useEffect(() => {
    if (activeTab !== "waitlist") return;
    const handleVisibility = () => {
      if (!document.hidden) fetchWaitlistCount();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeTab, fetchWaitlistCount]);

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
              const showBadge = tab.key === "waitlist" && waitlistPendingCount > 0;
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
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {waitlistPendingCount}
                    </span>
                  )}
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
          const showBadge = tab.key === "waitlist" && waitlistPendingCount > 0;
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
              {showBadge && (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {waitlistPendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "waitlist" && <AdminWaitlist />}
      {activeTab === "system" && <AdminSystem />}
      {activeTab === "email" && <AdminEmail />}
      {activeTab === "billing" && <AdminBilling />}
    </div>
  );
}

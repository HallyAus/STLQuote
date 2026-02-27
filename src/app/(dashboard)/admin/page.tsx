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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminWaitlist } from "@/components/admin/admin-waitlist";
import { AdminSystem } from "@/components/admin/admin-system";
import { AdminEmail } from "@/components/admin/admin-email";
import { AdminBilling } from "@/components/admin/admin-billing";

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
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [waitlistPendingCount, setWaitlistPendingCount] = useState(0);

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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => {
          const showBadge = tab.key === "waitlist" && waitlistPendingCount > 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {showBadge && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
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

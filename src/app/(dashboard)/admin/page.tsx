"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Eye,
  Loader2,
  Rocket,
  UserPlus,
  X,
  KeyRound,
  Mail,
  Send,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  XCircle,
  SkipForward,
  Settings,
  ClipboardList,
  Check,
  Ban,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CreditCard,
  CircleCheck,
  CircleX,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { DeployLogs } from "@/components/admin/deploy-logs";

interface UserStats {
  totalUsers: number;
  adminCount: number;
  disabledCount: number;
  newThisWeek: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  disabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  _count: {
    quotes: number;
    jobs: number;
    printers: number;
    materials: number;
  };
}

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const myRole = session?.user?.role || "USER";
  const isSuperAdmin = myRole === "SUPER_ADMIN";
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "waitlist" | "deploys" | "email" | "newsletter" | "config" | "logs" | "billing">("users");

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    sendEmail: true,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit user modal
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "USER",
    password: "",
    grantPro: false,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Test email
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Email logs
  const [emailLogs, setEmailLogs] = useState<{
    id: string;
    to: string;
    subject: string;
    type: string;
    status: string;
    error: string | null;
    createdAt: string;
  }[]>([]);
  const [emailLogsPagination, setEmailLogsPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsFilter, setEmailLogsFilter] = useState("all");

  // System config
  const [sysConfig, setSysConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState<string | null>(null);

  // Waitlist
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistActionLoading, setWaitlistActionLoading] = useState<string | null>(null);

  // Newsletter
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlAudience, setNlAudience] = useState<"all" | "active" | "admins">("all");
  const [nlCounts, setNlCounts] = useState<{ all: number; active: number; admins: number } | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{ ok: boolean; message: string } | null>(null);

  // System logs
  const [systemLogs, setSystemLogs] = useState<{
    id: string;
    userId: string | null;
    type: string;
    level: string;
    message: string;
    detail: string | null;
    createdAt: string;
  }[]>([]);
  const [logsFilter, setLogsFilter] = useState({ type: "all", level: "all" });
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Billing
  const [billingData, setBillingData] = useState<{
    stats: { totalUsers: number; proUsers: number; trialUsers: number; freeUsers: number };
    stripeSubscribers: {
      id: string;
      name: string | null;
      email: string | null;
      subscriptionTier: string;
      subscriptionStatus: string;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      subscriptionEndsAt: string | null;
      createdAt: string;
    }[];
    events: {
      id: string;
      userId: string;
      action: string;
      detail: string | null;
      createdAt: string;
      user: { name: string | null; email: string | null };
    }[];
    config: {
      stripeSecretKey: boolean;
      stripeWebhookSecret: boolean;
      monthlyPriceId: string | null;
      annualPriceId: string | null;
      appUrl: string | null;
    };
  } | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingCheckoutLoading, setBillingCheckoutLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/admin/billing");
      if (res.ok) setBillingData(await res.json());
    } catch { /* ignore */ } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "billing") return;
    fetchBilling();
  }, [activeTab, fetchBilling]);

  async function handleAdminCheckout(interval: "month" | "year") {
    setBillingCheckoutLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setBillingCheckoutLoading(false);
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data.stats);
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch waitlist entries
  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) {
        const data = await res.json();
        setWaitlistEntries(data);
      }
    } catch {
      /* ignore */
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchWaitlist(); // Preload for badge count
  }, [fetchUsers, fetchWaitlist]);

  // Refresh waitlist when tab is switched to it
  useEffect(() => {
    if (activeTab === "waitlist") {
      fetchWaitlist();
    }
  }, [activeTab, fetchWaitlist]);

  async function handleWaitlistApprove(id: string) {
    setWaitlistActionLoading(id + "-approve");
    try {
      const res = await fetch(`/api/waitlist/${id}/approve`, { method: "POST" });
      if (res.ok) {
        fetchWaitlist();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setWaitlistActionLoading(null);
    }
  }

  async function handleWaitlistReject(id: string) {
    setWaitlistActionLoading(id + "-reject");
    try {
      const res = await fetch(`/api/waitlist/${id}/reject`, { method: "POST" });
      if (res.ok) {
        fetchWaitlist();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setWaitlistActionLoading(null);
    }
  }

  // --- Actions ---

  async function toggleRole(user: AdminUser) {
    setActionLoading(user.id + "-role");
    try {
      const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  // Helper: can the current admin modify this user?
  function canModifyUser(user: AdminUser): boolean {
    if (user.role === "SUPER_ADMIN") return false;
    if (user.role === "ADMIN" && !isSuperAdmin) return false;
    return true;
  }

  async function toggleDisabled(user: AdminUser) {
    setActionLoading(user.id + "-disabled");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !user.disabled }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, disabled: !u.disabled } : u
          )
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function resendWelcome(user: AdminUser) {
    setActionLoading(user.id + "-welcome");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/resend-welcome`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
      } else {
        alert(data.error || "Failed to send");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  }

  async function impersonate(user: AdminUser) {
    setActionLoading(user.id + "-impersonate");
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create user");
        return;
      }
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", password: "", role: "USER", sendEmail: true });
      fetchUsers();
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreateLoading(false);
    }
  }

  function openEditModal(user: AdminUser) {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role,
      password: "",
      grantPro: user.subscriptionTier === "pro" && user.subscriptionStatus === "active",
    });
    setEditError("");
    setEditSuccess("");
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setEditSuccess("");
    setEditLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        grantPro: editForm.grantPro,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update user");
        return;
      }
      setEditSuccess("User updated successfully");
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                subscriptionTier: editForm.grantPro ? "pro" : u.subscriptionTier === "pro" && !editForm.grantPro ? "free" : u.subscriptionTier,
                subscriptionStatus: editForm.grantPro ? "active" : u.subscriptionStatus,
              }
            : u
        )
      );
    } catch {
      setEditError("Something went wrong");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
        setDeleteUser(null);
        setDeleteConfirmText("");
        fetchUsers(); // Refresh stats
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailTo || undefined }),
      });
      const data = await res.json();
      setTestEmailResult({
        ok: res.ok,
        message: res.ok ? data.message : data.error || "Failed to send",
      });
    } catch {
      setTestEmailResult({ ok: false, message: "Something went wrong" });
    } finally {
      setTestEmailLoading(false);
    }
  }

  // Fetch newsletter recipient counts when tab is opened
  useEffect(() => {
    if (activeTab !== "newsletter" || nlCounts) return;
    async function fetchCounts() {
      try {
        const res = await fetch("/api/admin/newsletter");
        if (res.ok) setNlCounts(await res.json());
      } catch { /* ignore */ }
    }
    fetchCounts();
  }, [activeTab, nlCounts]);

  // Fetch email logs when tab is opened or filter/page changes
  const fetchEmailLogs = useCallback(async (page = 1, type = "all") => {
    setEmailLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/admin/email-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs);
        setEmailLogsPagination(data.pagination);
      }
    } catch { /* ignore */ } finally {
      setEmailLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "email") return;
    fetchEmailLogs(emailLogsPagination.page, emailLogsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Fetch system config when config tab is opened
  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) setSysConfig(await res.json());
    } catch { /* ignore */ } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "config") return;
    fetchConfig();
  }, [activeTab, fetchConfig]);

  // Fetch system logs when tab is opened or filter/page changes
  const fetchSystemLogs = useCallback(async (page = 1, type = "all", level = "all") => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (type !== "all") params.set("type", type);
      if (level !== "all") params.set("level", level);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSystemLogs(data.logs);
        setLogsPagination(data.pagination);
      }
    } catch { /* ignore */ } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "logs") return;
    fetchSystemLogs(logsPagination.page, logsFilter.type, logsFilter.level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function toggleConfig(key: string, currentValue: string) {
    const newValue = currentValue === "true" ? "false" : "true";
    setConfigSaving(key);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });
      if (res.ok) {
        setSysConfig((prev) => ({ ...prev, [key]: newValue }));
      }
    } catch { /* ignore */ } finally {
      setConfigSaving(null);
    }
  }

  async function handleSendNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setNlLoading(true);
    setNlResult(null);

    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: nlSubject, html: nlBody, audience: nlAudience }),
      });
      const data = await res.json();
      setNlResult({
        ok: res.ok,
        message: res.ok ? data.message : data.error || "Failed to send",
      });
      if (res.ok) {
        setNlSubject("");
        setNlBody("");
      }
    } catch {
      setNlResult({ ok: false, message: "Something went wrong" });
    } finally {
      setNlLoading(false);
    }
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: "users", icon: Users, label: "Users" },
          { key: "waitlist", icon: ClipboardList, label: "Waitlist" },
          { key: "deploys", icon: Rocket, label: "Deploys" },
          { key: "email", icon: Mail, label: "Email" },
          { key: "newsletter", icon: Megaphone, label: "Newsletter" },
          { key: "billing", icon: CreditCard, label: "Billing" },
          { key: "config", icon: Settings, label: "Config" },
          { key: "logs", icon: Terminal, label: "Logs" },
        ] as const).map((tab) => {
          const pendingCount = tab.key === "waitlist"
            ? waitlistEntries.filter((e) => e.status === "pending").length
            : 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "waitlist" && pendingCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Waitlist tab */}
      {activeTab === "waitlist" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Waitlist
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchWaitlist()}
                disabled={waitlistLoading}
              >
                {waitlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {waitlistLoading && waitlistEntries.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : waitlistEntries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No waitlist entries yet.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium">Date</th>
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4">
                            <span className="font-medium">{entry.name}</span>
                            {entry.businessName && (
                              <span className="block text-xs text-muted-foreground">{entry.businessName}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{entry.email}</td>
                          <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(entry.createdAt)}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                entry.status === "pending"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : entry.status === "approved"
                                    ? "bg-success/15 text-success-foreground"
                                    : "bg-destructive/10 text-destructive-foreground"
                              )}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {entry.status === "pending" ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleWaitlistApprove(entry.id)}
                                  disabled={waitlistActionLoading === entry.id + "-approve"}
                                  title="Approve"
                                  className="text-success-foreground hover:text-success-foreground"
                                >
                                  {waitlistActionLoading === entry.id + "-approve" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleWaitlistReject(entry.id)}
                                  disabled={waitlistActionLoading === entry.id + "-reject"}
                                  title="Reject"
                                  className="text-destructive-foreground hover:text-destructive-foreground"
                                >
                                  {waitlistActionLoading === entry.id + "-reject" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Ban className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground px-2">
                                {entry.status === "approved" ? "Approved" : "Rejected"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {waitlistEntries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{entry.name}</p>
                          {entry.businessName && (
                            <p className="text-xs text-muted-foreground">{entry.businessName}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">{entry.email}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                            entry.status === "pending"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : entry.status === "approved"
                                ? "bg-success/15 text-success-foreground"
                                : "bg-destructive/10 text-destructive-foreground"
                          )}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </div>
                      {entry.status === "pending" && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleWaitlistApprove(entry.id)}
                            disabled={waitlistActionLoading === entry.id + "-approve"}
                          >
                            {waitlistActionLoading === entry.id + "-approve" ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-3 w-3" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleWaitlistReject(entry.id)}
                            disabled={waitlistActionLoading === entry.id + "-reject"}
                            className="text-destructive-foreground"
                          >
                            {waitlistActionLoading === entry.id + "-reject" ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Ban className="mr-1 h-3 w-3" />
                            )}
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deploys tab */}
      {activeTab === "deploys" && <DeployLogs />}

      {/* Email tab */}
      {activeTab === "email" && (
        <div className="space-y-6">
          {/* Test email card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Send a test email to verify your Resend configuration is working.
                Leave the address blank to send to your admin email.
              </p>
              <form onSubmit={(e) => { handleTestEmail(e).then(() => fetchEmailLogs(1, emailLogsFilter)); }} className="space-y-4">
                {testEmailResult && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      testEmailResult.ok
                        ? "bg-success/10 text-success-foreground"
                        : "bg-destructive/10 text-destructive-foreground"
                    )}
                  >
                    {testEmailResult.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {testEmailResult.message}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                      placeholder="recipient@example.com (optional)"
                    />
                  </div>
                  <Button type="submit" disabled={testEmailLoading}>
                    {testEmailLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send Test
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Email logs card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Log
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    options={[
                      { value: "all", label: "All types" },
                      { value: "quote", label: "Quote" },
                      { value: "newsletter", label: "Newsletter" },
                      { value: "welcome", label: "Welcome" },
                      { value: "account_created", label: "Account created" },
                      { value: "password_reset", label: "Password reset" },
                      { value: "verification", label: "Verification" },
                      { value: "notification", label: "Notification" },
                      { value: "test", label: "Test" },
                    ]}
                    value={emailLogsFilter}
                    onChange={(e) => {
                      setEmailLogsFilter(e.target.value);
                      fetchEmailLogs(1, e.target.value);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchEmailLogs(emailLogsPagination.page, emailLogsFilter)}
                    disabled={emailLogsLoading}
                  >
                    {emailLogsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {emailLogsLoading && emailLogs.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No emails logged yet.
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-3 pr-4 font-medium">Time</th>
                          <th className="pb-3 pr-4 font-medium">To</th>
                          <th className="pb-3 pr-4 font-medium">Subject</th>
                          <th className="pb-3 pr-4 font-medium">Type</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.map((log) => (
                          <tr key={log.id} className="border-b border-border/50 last:border-0">
                            <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                              {formatRelativeTime(log.createdAt)}
                            </td>
                            <td className="py-3 pr-4 max-w-[200px] truncate" title={log.to}>
                              {log.to}
                            </td>
                            <td className="py-3 pr-4 max-w-[250px] truncate" title={log.subject}>
                              {log.subject}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {log.type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                  log.status === "sent"
                                    ? "bg-success/15 text-success-foreground"
                                    : log.status === "skipped"
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      : "bg-destructive/10 text-destructive-foreground"
                                )}
                                title={log.error || undefined}
                              >
                                {log.status === "sent" && <CheckCircle2 className="h-3 w-3" />}
                                {log.status === "failed" && <XCircle className="h-3 w-3" />}
                                {log.status === "skipped" && <SkipForward className="h-3 w-3" />}
                                {log.status}
                              </span>
                              {log.error && (
                                <p className="mt-0.5 text-xs text-destructive-foreground/70 truncate max-w-[200px]" title={log.error}>
                                  {log.error}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="space-y-3 md:hidden">
                    {emailLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{log.subject}</p>
                            <p className="text-xs text-muted-foreground truncate">{log.to}</p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0",
                              log.status === "sent"
                                ? "bg-success/15 text-success-foreground"
                                : log.status === "skipped"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-destructive/10 text-destructive-foreground"
                            )}
                          >
                            {log.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                            {log.type.replace(/_/g, " ")}
                          </span>
                          <span>{formatRelativeTime(log.createdAt)}</span>
                        </div>
                        {log.error && (
                          <p className="text-xs text-destructive-foreground/70">{log.error}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {emailLogsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                      <p className="text-sm text-muted-foreground">
                        {emailLogsPagination.total} email{emailLogsPagination.total !== 1 ? "s" : ""} total
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchEmailLogs(emailLogsPagination.page - 1, emailLogsFilter)}
                          disabled={emailLogsPagination.page <= 1 || emailLogsLoading}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">
                          {emailLogsPagination.page} / {emailLogsPagination.totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchEmailLogs(emailLogsPagination.page + 1, emailLogsFilter)}
                          disabled={emailLogsPagination.page >= emailLogsPagination.totalPages || emailLogsLoading}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Newsletter tab */}
      {activeTab === "newsletter" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Send Newsletter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNewsletter} className="space-y-4">
              {nlResult && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                    nlResult.ok
                      ? "bg-success/10 text-success-foreground"
                      : "bg-destructive/10 text-destructive-foreground"
                  )}
                >
                  {nlResult.ok && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {nlResult.message}
                </div>
              )}

              <Select
                label="Audience"
                options={[
                  { value: "all", label: `All users${nlCounts ? ` (${nlCounts.all})` : ""}` },
                  { value: "active", label: `Active users${nlCounts ? ` (${nlCounts.active})` : ""}` },
                  { value: "admins", label: `Admins only${nlCounts ? ` (${nlCounts.admins})` : ""}` },
                ]}
                value={nlAudience}
                onChange={(e) => setNlAudience(e.target.value as "all" | "active" | "admins")}
              />

              <Input
                label="Subject"
                type="text"
                value={nlSubject}
                onChange={(e) => setNlSubject(e.target.value)}
                placeholder="e.g. New features in Printforge"
                required
              />

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Body (HTML)
                </label>
                <textarea
                  value={nlBody}
                  onChange={(e) => setNlBody(e.target.value)}
                  placeholder="<h2>Hello!</h2><p>Here's what's new...</p>"
                  required
                  rows={10}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Write HTML directly. The email will be wrapped in a standard Printforge template.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={nlLoading || !nlSubject || !nlBody}>
                  {nlLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to {nlAudience === "all" ? "all users" : nlAudience === "active" ? "active users" : "admins"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Billing tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {billingLoading && !billingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : billingData ? (
            <>
              {/* Stripe setup status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Stripe Configuration
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchBilling} disabled={billingLoading}>
                      {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Secret Key", ok: billingData.config.stripeSecretKey, hint: "STRIPE_SECRET_KEY" },
                      { label: "Webhook Secret", ok: billingData.config.stripeWebhookSecret, hint: "STRIPE_WEBHOOK_SECRET" },
                      { label: "Monthly Price ID", ok: !!billingData.config.monthlyPriceId, hint: billingData.config.monthlyPriceId || "STRIPE_PRO_MONTHLY_PRICE_ID — not set" },
                      { label: "Annual Price ID", ok: !!billingData.config.annualPriceId, hint: billingData.config.annualPriceId || "STRIPE_PRO_ANNUAL_PRICE_ID — not set" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-2">
                          {item.ok ? (
                            <CircleCheck className="h-4 w-4 text-success-foreground" />
                          ) : (
                            <CircleX className="h-4 w-4 text-destructive-foreground" />
                          )}
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{item.hint}</span>
                      </div>
                    ))}

                    {billingData.config.appUrl && (
                      <div className="rounded-lg border border-border p-3 mt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Webhook URL (add in Stripe Dashboard)</p>
                        <code className="text-xs text-foreground break-all">{billingData.config.appUrl}/api/billing/webhook</code>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Subscriber stats */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{billingData.stats.proUsers}</div>
                    <div className="text-sm text-muted-foreground">Pro subscribers</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{billingData.stats.trialUsers}</div>
                    <div className="text-sm text-muted-foreground">On trial</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{billingData.stats.freeUsers}</div>
                    <div className="text-sm text-muted-foreground">Free users</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{billingData.stats.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Total users</div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick checkout (for admin to test) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Checkout</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a Stripe checkout session for your own account to test the subscription flow.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => handleAdminCheckout("month")}
                      disabled={billingCheckoutLoading || !billingData.config.monthlyPriceId}
                    >
                      {billingCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                      Monthly ($29/mo)
                    </Button>
                    <Button
                      onClick={() => handleAdminCheckout("year")}
                      disabled={billingCheckoutLoading || !billingData.config.annualPriceId}
                    >
                      {billingCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                      Annual ($290/yr)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stripe subscribers */}
              {billingData.stripeSubscribers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Stripe Subscribers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="pb-3 pr-4 font-medium">User</th>
                            <th className="pb-3 pr-4 font-medium">Status</th>
                            <th className="pb-3 pr-4 font-medium">Customer ID</th>
                            <th className="pb-3 font-medium">Ends At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billingData.stripeSubscribers.map((sub) => (
                            <tr key={sub.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 pr-4">
                                <div className="font-medium">{sub.name || "No name"}</div>
                                <div className="text-xs text-muted-foreground">{sub.email}</div>
                              </td>
                              <td className="py-3 pr-4">
                                <span className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                  sub.subscriptionStatus === "active" ? "bg-success/15 text-success-foreground"
                                    : sub.subscriptionStatus === "past_due" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {sub.subscriptionStatus}
                                </span>
                              </td>
                              <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                                {sub.stripeCustomerId?.slice(0, 18)}...
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {sub.subscriptionEndsAt
                                  ? new Date(sub.subscriptionEndsAt).toLocaleDateString("en-AU")
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subscription events */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subscription Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {billingData.events.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No subscription events yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {billingData.events.map((evt) => (
                        <div key={evt.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                evt.action.includes("upgrade") || evt.action.includes("grant") ? "bg-success/15 text-success-foreground"
                                  : evt.action.includes("cancel") || evt.action.includes("revoke") || evt.action.includes("failed") ? "bg-destructive/10 text-destructive-foreground"
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {evt.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {evt.user?.name || evt.user?.email || "Unknown user"}
                              </span>
                            </div>
                            {evt.detail && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{evt.detail}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(evt.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Config tab */}
      {activeTab === "config" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Public Registration</p>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to create accounts via the register page.
                      When disabled, only admins can create user accounts.
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConfig("registrationOpen", sysConfig.registrationOpen ?? "true")}
                    disabled={configSaving === "registrationOpen"}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      (sysConfig.registrationOpen ?? "true") === "true"
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        (sysConfig.registrationOpen ?? "true") === "true"
                          ? "translate-x-5"
                          : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium">Waitlist Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval for new signups. When off, new users get accounts immediately.
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConfig("waitlistMode", sysConfig.waitlistMode ?? "false")}
                    disabled={configSaving === "waitlistMode"}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                      (sysConfig.waitlistMode ?? "false") === "true"
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        (sysConfig.waitlistMode ?? "false") === "true"
                          ? "translate-x-5"
                          : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Logs tab */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                System Logs
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select
                  options={[
                    { value: "all", label: "All types" },
                    { value: "xero_sync", label: "Xero sync" },
                    { value: "email", label: "Email" },
                    { value: "billing", label: "Billing" },
                    { value: "auth", label: "Auth" },
                    { value: "system", label: "System" },
                  ]}
                  value={logsFilter.type}
                  onChange={(e) => {
                    const newFilter = { ...logsFilter, type: e.target.value };
                    setLogsFilter(newFilter);
                    fetchSystemLogs(1, newFilter.type, newFilter.level);
                  }}
                />
                <Select
                  options={[
                    { value: "all", label: "All levels" },
                    { value: "info", label: "Info" },
                    { value: "warn", label: "Warn" },
                    { value: "error", label: "Error" },
                  ]}
                  value={logsFilter.level}
                  onChange={(e) => {
                    const newFilter = { ...logsFilter, level: e.target.value };
                    setLogsFilter(newFilter);
                    fetchSystemLogs(1, newFilter.type, newFilter.level);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchSystemLogs(logsPagination.page, logsFilter.type, logsFilter.level)}
                  disabled={logsLoading}
                  title="Refresh"
                >
                  {logsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading && systemLogs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : systemLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No logs recorded yet.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Time</th>
                        <th className="pb-3 pr-4 font-medium">Level</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Message</th>
                        <th className="pb-3 font-medium w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemLogs.map((entry) => (
                        <Fragment key={entry.id}>
                          <tr
                            className={cn(
                              "border-b border-border/50 last:border-0",
                              entry.detail ? "cursor-pointer hover:bg-muted/50" : ""
                            )}
                            onClick={() => {
                              if (entry.detail) {
                                setExpandedLogId(expandedLogId === entry.id ? null : entry.id);
                              }
                            }}
                          >
                            <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground text-xs">
                              {new Date(entry.createdAt).toLocaleString("en-AU", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="py-2 pr-4">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                  entry.level === "info"
                                    ? "bg-success/15 text-success-foreground"
                                    : entry.level === "warn"
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      : "bg-destructive/10 text-destructive-foreground"
                                )}
                              >
                                {entry.level}
                              </span>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                {entry.type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-xs max-w-[400px] truncate" title={entry.message}>
                              {entry.message}
                            </td>
                            <td className="py-2">
                              {entry.detail && (
                                expandedLogId === entry.id
                                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </td>
                          </tr>
                          {expandedLogId === entry.id && entry.detail && (
                            <tr>
                              <td colSpan={5} className="pb-3 pt-0 px-4">
                                <pre className="whitespace-pre-wrap break-all rounded-md bg-muted/50 p-3 text-xs text-muted-foreground font-mono max-h-64 overflow-auto">
                                  {entry.detail}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {systemLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border p-3 space-y-2 font-mono"
                      onClick={() => {
                        if (entry.detail) {
                          setExpandedLogId(expandedLogId === entry.id ? null : entry.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              entry.level === "info"
                                ? "bg-success/15 text-success-foreground"
                                : entry.level === "warn"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-destructive/10 text-destructive-foreground"
                            )}
                          >
                            {entry.level}
                          </span>
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {entry.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground">{entry.message}</p>
                      {expandedLogId === entry.id && entry.detail && (
                        <pre className="whitespace-pre-wrap break-all rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground font-mono max-h-48 overflow-auto">
                          {entry.detail}
                        </pre>
                      )}
                      {entry.detail && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {expandedLogId === entry.id ? (
                            <><ChevronUp className="h-3 w-3" /> Hide detail</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" /> Show detail</>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {logsPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <p className="text-sm text-muted-foreground font-mono">
                      {logsPagination.total} log{logsPagination.total !== 1 ? "s" : ""} total
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPage = logsPagination.page - 1;
                          setLogsPagination((p) => ({ ...p, page: newPage }));
                          fetchSystemLogs(newPage, logsFilter.type, logsFilter.level);
                        }}
                        disabled={logsPagination.page <= 1 || logsLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground px-2 font-mono">
                        {logsPagination.page} / {logsPagination.totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPage = logsPagination.page + 1;
                          setLogsPagination((p) => ({ ...p, page: newPage }));
                          fetchSystemLogs(newPage, logsFilter.type, logsFilter.level);
                        }}
                        disabled={logsPagination.page >= logsPagination.totalPages || logsLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-sm text-muted-foreground">Total users</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{stats.adminCount}</div>
                  <div className="text-sm text-muted-foreground">Admins</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{stats.disabledCount}</div>
                  <div className="text-sm text-muted-foreground">Disabled</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{stats.newThisWeek}</div>
                  <div className="text-sm text-muted-foreground">New this week</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Create User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">User</th>
                      <th className="pb-3 pr-4 font-medium">Role</th>
                      <th className="pb-3 pr-4 font-medium">Plan</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Joined</th>
                      <th className="pb-3 pr-4 font-medium">Last Login</th>
                      <th className="pb-3 pr-4 font-medium">Activity</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium">{user.name || "No name"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              user.role === "SUPER_ADMIN"
                                ? "bg-amber-500/15 text-amber-500"
                                : user.role === "ADMIN"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && <Shield className="h-3 w-3" />}
                            {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-fit",
                                user.subscriptionTier === "pro" || user.subscriptionStatus === "trialing"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {user.subscriptionStatus === "trialing" ? "Trial" : user.subscriptionTier === "pro" ? "Pro" : "Free"}
                            </span>
                            {user.subscriptionStatus === "trialing" && user.trialEndsAt && (
                              <span className="text-[10px] text-muted-foreground">
                                ends {new Date(user.trialEndsAt).toLocaleDateString("en-AU")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              user.disabled
                                ? "bg-destructive/10 text-destructive-foreground"
                                : "bg-success/15 text-success-foreground"
                            )}
                          >
                            {user.disabled ? "Disabled" : "Active"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {user.lastLogin ? formatRelativeTime(user.lastLogin) : "Never"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          <span>{user._count.quotes} quotes</span>
                          <span className="mx-1">&middot;</span>
                          <span>{user._count.jobs} jobs</span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-0.5">
                            {canModifyUser(user) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(user)}
                                  title="Edit user"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {isSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRole(user)}
                                    disabled={actionLoading === user.id + "-role"}
                                    title={user.role === "ADMIN" ? "Demote to user" : "Promote to admin"}
                                  >
                                    {actionLoading === user.id + "-role" ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : user.role === "ADMIN" ? (
                                      <ShieldOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Shield className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleDisabled(user)}
                                  disabled={actionLoading === user.id + "-disabled"}
                                  title={user.disabled ? "Enable account" : "Disable account"}
                                >
                                  {actionLoading === user.id + "-disabled" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : user.disabled ? (
                                    <UserCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <UserX className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </>
                            )}
                            {user.role !== "SUPER_ADMIN" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => impersonate(user)}
                                disabled={actionLoading === user.id + "-impersonate"}
                                title="Impersonate user"
                              >
                                {actionLoading === user.id + "-impersonate" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            {canModifyUser(user) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resendWelcome(user)}
                                disabled={actionLoading === user.id + "-welcome"}
                                title="Resend welcome email"
                              >
                                {actionLoading === user.id + "-welcome" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Mail className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                            {canModifyUser(user) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteUser(user)}
                                title="Delete user"
                                className="text-destructive-foreground hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!canModifyUser(user) && user.role !== "SUPER_ADMIN" && (
                              <span className="text-xs text-muted-foreground px-2">No actions</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{user.name || "No name"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="flex gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            user.role === "SUPER_ADMIN"
                              ? "bg-amber-500/15 text-amber-500"
                              : user.role === "ADMIN"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "ADMIN" ? "Admin" : "User"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            user.disabled
                              ? "bg-destructive/10 text-destructive-foreground"
                              : "bg-success/15 text-success-foreground"
                          )}
                        >
                          {user.disabled ? "Disabled" : "Active"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        Joined {new Date(user.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                      <span>Login {user.lastLogin ? formatRelativeTime(user.lastLogin) : "never"}</span>
                      <span>{user._count.quotes} quotes</span>
                      <span>{user._count.jobs} jobs</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canModifyUser(user) && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(user)}>
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          {isSuperAdmin && (
                            <Button variant="secondary" size="sm" onClick={() => toggleRole(user)} disabled={actionLoading === user.id + "-role"}>
                              {user.role === "ADMIN" ? (
                                <><ShieldOff className="mr-1 h-3 w-3" />Demote</>
                              ) : (
                                <><Shield className="mr-1 h-3 w-3" />Promote</>
                              )}
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => toggleDisabled(user)} disabled={actionLoading === user.id + "-disabled"}>
                            {user.disabled ? (
                              <><UserCheck className="mr-1 h-3 w-3" />Enable</>
                            ) : (
                              <><UserX className="mr-1 h-3 w-3" />Disable</>
                            )}
                          </Button>
                        </>
                      )}
                      {user.role !== "SUPER_ADMIN" && (
                        <Button variant="secondary" size="sm" onClick={() => impersonate(user)} disabled={actionLoading === user.id + "-impersonate"}>
                          <Eye className="mr-1 h-3 w-3" />
                          Impersonate
                        </Button>
                      )}
                      {canModifyUser(user) && (
                        <Button variant="secondary" size="sm" onClick={() => resendWelcome(user)} disabled={actionLoading === user.id + "-welcome"}>
                          <Mail className="mr-1 h-3 w-3" />
                          Resend Welcome
                        </Button>
                      )}
                      {canModifyUser(user) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeleteUser(user)}
                          className="text-destructive-foreground"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No users found.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create User
                </CardTitle>
                <button onClick={() => { setShowCreateModal(false); setCreateError(""); }} className="rounded-md p-1.5 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                    {createError}
                  </div>
                )}
                <Input label="Name" type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" required autoFocus />
                <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required />
                <Input label="Password" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" required minLength={8} />
                <Select
                  label="Role"
                  options={
                    isSuperAdmin
                      ? [
                          { value: "USER", label: "User" },
                          { value: "ADMIN", label: "Admin" },
                        ]
                      : [{ value: "USER", label: "User" }]
                  }
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.sendEmail}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sendEmail: e.target.checked }))}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Send welcome email with password reset link</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowCreateModal(false); setCreateError(""); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createLoading}>
                    {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5" />
                  Edit User
                </CardTitle>
                <button onClick={() => setEditUser(null)} className="rounded-md p-1.5 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditUser} className="space-y-4">
                {editError && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                    {editError}
                  </div>
                )}
                {editSuccess && (
                  <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {editSuccess}
                  </div>
                )}
                <Input label="Name" type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" required autoFocus />
                <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@example.com" required />
                <Select
                  label="Role"
                  options={
                    isSuperAdmin
                      ? [
                          { value: "USER", label: "User" },
                          { value: "ADMIN", label: "Admin" },
                        ]
                      : [{ value: "USER", label: "User" }]
                  }
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={!isSuperAdmin}
                />
                <Input label="New Password (optional)" type="password" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" minLength={8} />
                <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editForm.grantPro}
                    onChange={(e) => setEditForm((f) => ({ ...f, grantPro: e.target.checked }))}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div>
                    <span className="text-sm font-medium">Grant Pro access</span>
                    <p className="text-xs text-muted-foreground">Give this user Pro features without requiring payment</p>
                  </div>
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditUser(null)}>
                    {editSuccess ? "Done" : "Cancel"}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={editLoading}>
                    {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Delete User</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Permanently delete <strong>{deleteUser.name || deleteUser.email}</strong>?
                  This will remove all their data including {deleteUser._count.quotes} quotes and {deleteUser._count.jobs} jobs.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Type <strong className="text-foreground">{deleteUser.email}</strong> to confirm:
                </p>
                <Input
                  className="mt-2 text-center"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteUser.email || ""}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setDeleteUser(null); setDeleteConfirmText(""); }} disabled={deleteLoading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading || deleteConfirmText !== deleteUser.email}
                >
                  {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

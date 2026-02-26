"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BANNER } from "@/lib/status-colours";
import { getEffectiveTier, trialDaysRemaining } from "@/lib/tier";
import {
  Loader2,
  Save,
  UserCircle,
  Mail,
  Shield,
  Calendar,
  Crown,
  Lock,
  Check,
  KeyRound,
} from "lucide-react";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  createdAt: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN": return "Super Admin";
    case "ADMIN": return "Admin";
    default: return "User";
  }
}

function roleBadgeVariant(role: string): "info" | "warning" | "default" {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "warning";
  return "default";
}

function tierLabel(tier: string, status: string): string {
  if (tier === "pro" && status === "active") return "Pro";
  if (status === "trialing") return "Pro Trial";
  return "Free";
}

function tierBadgeVariant(tier: string): "success" | "default" {
  return tier === "pro" ? "success" : "default";
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

const TIMEZONES = [
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST)" },
  { value: "Australia/Darwin", label: "Darwin (ACST)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Kolkata", label: "Mumbai (IST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Chicago", label: "Chicago (CST)" },
  { value: "America/Denver", label: "Denver (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "Pacific/Honolulu", label: "Honolulu (HST)" },
];

export function AccountPage() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    // Fetch timezone from settings
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.timezone) setTimezone(data.timezone);
      })
      .catch(() => {});
  }, [fetchProfile]);

  // Auto-clear messages
  useEffect(() => {
    if (!profileMsg || profileMsg.type !== "success") return;
    const t = setTimeout(() => setProfileMsg(null), 4000);
    return () => clearTimeout(t);
  }, [profileMsg]);

  useEffect(() => {
    if (!passwordMsg || passwordMsg.type !== "success") return;
    const t = setTimeout(() => setPasswordMsg(null), 4000);
    return () => clearTimeout(t);
  }, [passwordMsg]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);

    try {
      // Save profile
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      // Save timezone to settings
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      }).catch(() => {});

      const data = await res.json();
      if (!res.ok) {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      } else {
        setProfile((prev) => (prev ? { ...prev, ...data } : prev));
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
        updateSession();
      }
    } catch {
      setProfileMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: data.error || "Failed to change password" });
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMsg({ type: "success", text: "Password changed successfully" });
        // Sign out after password change to refresh JWT
        setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Something went wrong" });
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <UserCircle className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Failed to load account</p>
      </div>
    );
  }

  const effectiveTier = getEffectiveTier({
    subscriptionTier: profile.subscriptionTier,
    subscriptionStatus: profile.subscriptionStatus,
    trialEndsAt: profile.trialEndsAt,
    role: profile.role,
  });

  const trialDays = trialDaysRemaining(profile.trialEndsAt);
  const isTrialing = profile.subscriptionStatus === "trialing" && trialDays > 0;
  const isAdmin = profile.role === "ADMIN" || profile.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile and security settings
        </p>
      </div>

      {/* Profile hero card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xl font-bold text-primary">
                {getInitials(profile.name, profile.email)}
              </span>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {profile.name || "Unnamed"}
                </h3>
                <Badge variant={roleBadgeVariant(profile.role)}>
                  {roleLabel(profile.role)}
                </Badge>
                <Badge variant={tierBadgeVariant(effectiveTier)}>
                  {effectiveTier === "pro" ? (
                    <Crown className="mr-1 h-3 w-3" />
                  ) : null}
                  {tierLabel(effectiveTier, profile.subscriptionStatus)}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {formatDate(profile.createdAt)}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Admin access
                  </span>
                )}
              </div>

              {/* Trial banner */}
              {isTrialing && !isAdmin && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                  <Crown className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>{trialDays} day{trialDays !== 1 ? "s" : ""}</strong> remaining on your Pro trial
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout for forms */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileMsg && (
                <div className={profileMsg.type === "success" ? BANNER.success : BANNER.error}>
                  {profileMsg.type === "success" && <Check className="mr-1.5 inline h-4 w-4" />}
                  {profileMsg.text}
                </div>
              )}

              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={profileSaving}>
                  {profileSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              {passwordMsg && (
                <div className={passwordMsg.type === "success" ? BANNER.success : BANNER.error}>
                  {passwordMsg.type === "success" && <Lock className="mr-1.5 inline h-4 w-4" />}
                  {passwordMsg.text}
                </div>
              )}

              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                autoComplete="new-password"
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={passwordSaving}>
                  {passwordSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Change password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Subscription info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Subscription</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Plan
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {effectiveTier === "pro" ? "Pro" : "Free"}
              </p>
              {isAdmin && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Included with admin role
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {isTrialing ? "Trial" : profile.subscriptionStatus === "active" ? "Active" : "—"}
              </p>
              {isTrialing && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Expires {formatDate(profile.trialEndsAt!)}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Member since
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {new Date(profile.createdAt).toLocaleDateString("en-AU", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

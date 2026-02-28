"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { UserModules } from "@/components/admin/user-modules";
import {
  Users,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Eye,
  Loader2,
  UserPlus,
  X,
  Mail,
  CheckCircle2,
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
} from "lucide-react";
import type { AdminUser, UserStats } from "./admin-types";

export function AdminUsers() {
  const router = useRouter();
  const { data: session } = useSession();
  const myRole = session?.user?.role || "USER";
  const isSuperAdmin = myRole === "SUPER_ADMIN";

  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function canModifyUser(user: AdminUser): boolean {
    if (user.role === "SUPER_ADMIN") return false;
    if (user.role === "ADMIN" && !isSuperAdmin) return false;
    return true;
  }

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
        fetchUsers();
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  // Filter users by search query
  const filteredUsers = searchQuery
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
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
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
                />
              </div>
              <Button size="sm" onClick={() => setShowCreateModal(true)}>
                <UserPlus className="mr-1.5 h-4 w-4" />
                Create User
              </Button>
            </div>
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
                {filteredUsers.map((user) => (
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
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} title="Edit user">
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
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-lg border border-border p-4 space-y-3">
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
                  <span>Joined {new Date(user.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                  <span>Login {user.lastLogin ? formatRelativeTime(user.lastLogin) : "never"}</span>
                  <span>{user._count.quotes} quotes</span>
                  <span>{user._count.jobs} jobs</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canModifyUser(user) && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(user)}>
                        <Pencil className="mr-1 h-3 w-3" />Edit
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="secondary" size="sm" onClick={() => toggleRole(user)} disabled={actionLoading === user.id + "-role"}>
                          {user.role === "ADMIN" ? <><ShieldOff className="mr-1 h-3 w-3" />Demote</> : <><Shield className="mr-1 h-3 w-3" />Promote</>}
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => toggleDisabled(user)} disabled={actionLoading === user.id + "-disabled"}>
                        {user.disabled ? <><UserCheck className="mr-1 h-3 w-3" />Enable</> : <><UserX className="mr-1 h-3 w-3" />Disable</>}
                      </Button>
                    </>
                  )}
                  {user.role !== "SUPER_ADMIN" && (
                    <Button variant="secondary" size="sm" onClick={() => impersonate(user)} disabled={actionLoading === user.id + "-impersonate"}>
                      <Eye className="mr-1 h-3 w-3" />Impersonate
                    </Button>
                  )}
                  {canModifyUser(user) && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => resendWelcome(user)} disabled={actionLoading === user.id + "-welcome"}>
                        <Mail className="mr-1 h-3 w-3" />Resend Welcome
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setDeleteUser(user)} className="text-destructive-foreground">
                        <Trash2 className="mr-1 h-3 w-3" />Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery ? "No users match your search." : "No users found."}
            </div>
          )}
        </CardContent>
      </Card>

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
                      ? [{ value: "USER", label: "User" }, { value: "ADMIN", label: "Admin" }]
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                      ? [{ value: "USER", label: "User" }, { value: "ADMIN", label: "Admin" }]
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
              {editUser && <UserModules userId={editUser.id} />}
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
    </>
  );
}

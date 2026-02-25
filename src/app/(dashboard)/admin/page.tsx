"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
  _count: {
    quotes: number;
    jobs: number;
    printers: number;
    materials: number;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Joined</th>
                  <th className="pb-3 pr-4 font-medium">Quotes</th>
                  <th className="pb-3 pr-4 font-medium">Jobs</th>
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
                      <div className="font-medium">
                        {user.name || "No name"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.role === "ADMIN"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.role === "ADMIN" && (
                          <Shield className="h-3 w-3" />
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.disabled
                            ? "bg-destructive/10 text-destructive-foreground"
                            : "bg-green-500/10 text-green-500"
                        }`}
                      >
                        {user.disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {user._count.quotes}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {user._count.jobs}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRole(user)}
                          disabled={actionLoading === user.id + "-role"}
                          title={
                            user.role === "ADMIN"
                              ? "Demote to user"
                              : "Promote to admin"
                          }
                        >
                          {actionLoading === user.id + "-role" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.role === "ADMIN" ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDisabled(user)}
                          disabled={actionLoading === user.id + "-disabled"}
                          title={
                            user.disabled ? "Enable account" : "Disable account"
                          }
                        >
                          {actionLoading === user.id + "-disabled" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.disabled ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => impersonate(user)}
                          disabled={
                            actionLoading === user.id + "-impersonate"
                          }
                          title="Impersonate user"
                        >
                          {actionLoading === user.id + "-impersonate" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
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
                    <div className="font-medium">
                      {user.name || "No name"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.disabled
                          ? "bg-destructive/10 text-destructive-foreground"
                          : "bg-green-500/10 text-green-500"
                      }`}
                    >
                      {user.disabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                  <span>{user._count.quotes} quotes</span>
                  <span>{user._count.jobs} jobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleRole(user)}
                    disabled={actionLoading === user.id + "-role"}
                  >
                    {user.role === "ADMIN" ? (
                      <>
                        <ShieldOff className="mr-1 h-3 w-3" />
                        Demote
                      </>
                    ) : (
                      <>
                        <Shield className="mr-1 h-3 w-3" />
                        Promote
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleDisabled(user)}
                    disabled={actionLoading === user.id + "-disabled"}
                  >
                    {user.disabled ? (
                      <>
                        <UserCheck className="mr-1 h-3 w-3" />
                        Enable
                      </>
                    ) : (
                      <>
                        <UserX className="mr-1 h-3 w-3" />
                        Disable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => impersonate(user)}
                    disabled={actionLoading === user.id + "-impersonate"}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Impersonate
                  </Button>
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
    </div>
  );
}

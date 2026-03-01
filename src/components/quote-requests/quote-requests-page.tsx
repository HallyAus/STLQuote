"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SkeletonListPage } from "@/components/ui/skeleton";
import { BANNER, REQUEST_STATUS, type RequestStatus } from "@/lib/status-colours";
import {
  Inbox,
  Plus,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  FileText,
  Download,
  ToggleLeft,
  ToggleRight,
  User,
  Cloud,
  Loader2,
  ClipboardList,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

interface UploadLink {
  id: string;
  token: string;
  label: string;
  active: boolean;
  expiresAt: string | null;
  maxFileSize: number;
  allowedTypes: string;
  createdAt: string;
  _count: { quoteRequests: number };
}

interface QuoteRequest {
  id: string;
  clientName: string;
  clientEmail: string | null;
  description: string | null;
  status: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSizeBytes: number;
  createdAt: string;
  uploadLink: { label: string } | null;
}

// ---------- Component ----------

export function QuoteRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [uploadLinks, setUploadLinks] = useState<UploadLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingQuoteId, setCreatingQuoteId] = useState<string | null>(null);
  const [creatingJobId, setCreatingJobId] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload link modal
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  // Copied token state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cloud export
  const [cloudConnections, setCloudConnections] = useState<{ google_drive: boolean; onedrive: boolean }>({ google_drive: false, onedrive: false });
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [cloudMenuId, setCloudMenuId] = useState<string | null>(null);

  // --- Fetch data ---

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [reqRes, linkRes, cloudRes] = await Promise.all([
        fetch("/api/quote-requests"),
        fetch("/api/upload-links"),
        fetch("/api/cloud/status").catch(() => null),
      ]);

      if (!reqRes.ok) throw new Error("Failed to fetch quote requests");
      if (!linkRes.ok) throw new Error("Failed to fetch upload links");

      const [reqData, linkData] = await Promise.all([
        reqRes.json(),
        linkRes.json(),
      ]);

      setRequests(reqData);
      setUploadLinks(linkData);

      if (cloudRes?.ok) {
        const cloudData = await cloudRes.json();
        setCloudConnections({
          google_drive: !!cloudData.connections?.find((c: { provider: string }) => c.provider === "google_drive"),
          onedrive: !!cloudData.connections?.find((c: { provider: string }) => c.provider === "onedrive"),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtered requests ---

  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchable = [
        req.clientName,
        req.clientEmail,
        req.originalName,
        req.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  // --- Status counts ---

  const statusCounts = requests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // --- Handlers ---

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      setError(null);
      const res = await fetch(`/api/quote-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleDeleteRequest(id: string) {
    if (!confirm("Delete this quote request? This cannot be undone.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/quote-requests/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleCreateLink() {
    try {
      setSavingLink(true);
      setError(null);
      const res = await fetch("/api/upload-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLinkLabel.trim() || "Default" }),
      });
      if (!res.ok) throw new Error("Failed to create link");
      const link = await res.json();
      setUploadLinks((prev) => [link, ...prev]);
      setLinkModalOpen(false);
      setNewLinkLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSavingLink(false);
    }
  }

  async function handleToggleLink(link: UploadLink) {
    try {
      setError(null);
      const res = await fetch(`/api/upload-links/${link.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !link.active }),
      });
      if (!res.ok) throw new Error("Failed to toggle link");
      const updated = await res.json();
      setUploadLinks((prev) =>
        prev.map((l) => (l.id === link.id ? updated : l))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update link");
    }
  }

  async function handleRegenerateToken(link: UploadLink) {
    if (!confirm("Regenerate token? The old URL will stop working.")) return;
    try {
      setError(null);
      const res = await fetch(`/api/upload-links/${link.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateToken: true }),
      });
      if (!res.ok) throw new Error("Failed to regenerate token");
      const updated = await res.json();
      setUploadLinks((prev) =>
        prev.map((l) => (l.id === link.id ? updated : l))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
    }
  }

  async function handleDeleteLink(link: UploadLink) {
    if (
      !confirm(
        `Delete "${link.label}"? This will also delete all ${link._count.quoteRequests} associated requests.`
      )
    )
      return;
    try {
      setError(null);
      const res = await fetch(`/api/upload-links/${link.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete");
      setUploadLinks((prev) => prev.filter((l) => l.id !== link.id));
      await fetchData(); // Refresh requests too since they may have been cascade-deleted
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleCloudExport(requestId: string, provider: "google_drive" | "onedrive") {
    try {
      setExportingId(requestId);
      setCloudMenuId(null);
      setError(null);
      const res = await fetch("/api/cloud/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, fileType: "quote_request_file", fileId: requestId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Export failed");
      }
      // Brief success indication (reuse copiedId pattern)
      setCopiedId(`cloud-${requestId}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cloud export failed");
    } finally {
      setExportingId(null);
    }
  }

  async function handleCreateQuote(id: string) {
    try {
      setCreatingQuoteId(id);
      setError(null);
      const res = await fetch(`/api/quote-requests/${id}/create-quote`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create quote");
      }
      const data = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "QUOTED" } : r))
      );
      router.push(`/quotes/${data.quoteId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote");
    } finally {
      setCreatingQuoteId(null);
    }
  }

  async function handleCreateJob(id: string) {
    try {
      setCreatingJobId(id);
      setError(null);
      const res = await fetch(`/api/quote-requests/${id}/create-job`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create job");
      }
      const data = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REVIEWED" } : r))
      );
      router.push("/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setCreatingJobId(null);
    }
  }

  const hasCloudConnection = cloudConnections.google_drive || cloudConnections.onedrive;

  function copyLink(link: UploadLink) {
    const url = `${window.location.origin}/upload/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Quote Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Files uploaded by customers via your share links.
          </p>
        </div>
        <Button onClick={() => setLinkModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Upload Link
        </Button>
      </div>

      {/* Upload Links Section */}
      {uploadLinks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Share Links
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uploadLinks.map((link) => (
              <UploadLinkCard
                key={link.id}
                link={link}
                copiedId={copiedId}
                onCopy={() => copyLink(link)}
                onToggle={() => handleToggleLink(link)}
                onRegenerate={() => handleRegenerateToken(link)}
                onDelete={() => handleDeleteLink(link)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-40"
          options={[
            { value: "ALL", label: `All (${requests.length})` },
            ...(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
              value: s,
              label: `${REQUEST_STATUS[s].label} (${statusCounts[s] || 0})`,
            })),
          ]}
        />
      </div>

      {/* Error */}
      {error && <div className={BANNER.error}>{error}</div>}

      {/* Loading */}
      {loading && <SkeletonListPage />}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">
              No quote requests yet.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-4 text-center max-w-md">
              Create a share link and send it to customers so they can upload
              3D files for quoting.
            </p>
            {uploadLinks.length === 0 && (
              <Button onClick={() => setLinkModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Upload Link
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {!loading && requests.length > 0 && filteredRequests.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              No requests match your filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Requests table (desktop) */}
      {!loading && filteredRequests.length > 0 && (
        <>
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">
                        Customer
                      </th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">
                        File
                      </th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">
                        Source
                      </th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">
                        Received
                      </th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground">
                                {req.clientName}
                              </p>
                              {req.clientEmail && (
                                <p className="text-xs text-muted-foreground">
                                  {req.clientEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground truncate max-w-[200px]">
                                {req.originalName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(req.fileSizeBytes)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {req.uploadLink?.label ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant={
                              REQUEST_STATUS[req.status as RequestStatus]
                                ?.variant ?? "default"
                            }
                          >
                            {REQUEST_STATUS[req.status as RequestStatus]
                              ?.label ?? req.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {timeAgo(req.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Select
                              value={req.status}
                              onChange={(e) =>
                                handleStatusChange(req.id, e.target.value)
                              }
                              className="h-8 w-28 text-xs"
                              options={(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
                                value: s,
                                label: REQUEST_STATUS[s].label,
                              }))}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateQuote(req.id)}
                              disabled={creatingQuoteId === req.id}
                              title="Create quote"
                            >
                              {creatingQuoteId === req.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ClipboardList className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateJob(req.id)}
                              disabled={creatingJobId === req.id}
                              title="Create job"
                            >
                              {creatingJobId === req.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Briefcase className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `/api/files/${req.filePath}`,
                                  "_blank"
                                )
                              }
                              title="Download file"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {hasCloudConnection && (
                              <div className="relative">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCloudMenuId(cloudMenuId === req.id ? null : req.id)}
                                  title="Save to cloud"
                                  disabled={exportingId === req.id}
                                >
                                  {exportingId === req.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : copiedId === `cloud-${req.id}` ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Cloud className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                {cloudMenuId === req.id && (
                                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-popover shadow-md">
                                    {cloudConnections.google_drive && (
                                      <button
                                        onClick={() => handleCloudExport(req.id, "google_drive")}
                                        className="block w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                                      >
                                        Google Drive
                                      </button>
                                    )}
                                    {cloudConnections.onedrive && (
                                      <button
                                        onClick={() => handleCloudExport(req.id, "onedrive")}
                                        className="block w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                                      >
                                        OneDrive
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRequest(req.id)}
                              title="Delete request"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filteredRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {req.clientName}
                      </p>
                      {req.clientEmail && (
                        <p className="text-xs text-muted-foreground truncate">
                          {req.clientEmail}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        REQUEST_STATUS[req.status as RequestStatus]?.variant ??
                        "default"
                      }
                    >
                      {REQUEST_STATUS[req.status as RequestStatus]?.label ??
                        req.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{req.originalName}</span>
                    <span className="shrink-0">
                      ({formatFileSize(req.fileSizeBytes)})
                    </span>
                  </div>

                  {req.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {req.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(req.createdAt)}
                      {req.uploadLink && ` via ${req.uploadLink.label}`}
                    </span>
                    <div className="flex gap-1">
                      <Select
                        value={req.status}
                        onChange={(e) =>
                          handleStatusChange(req.id, e.target.value)
                        }
                        className="h-7 w-24 text-xs"
                        options={(Object.keys(REQUEST_STATUS) as RequestStatus[]).map((s) => ({
                          value: s,
                          label: REQUEST_STATUS[s].label,
                        }))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateQuote(req.id)}
                        disabled={creatingQuoteId === req.id}
                        title="Create quote"
                      >
                        {creatingQuoteId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ClipboardList className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateJob(req.id)}
                        disabled={creatingJobId === req.id}
                        title="Create job"
                      >
                        {creatingJobId === req.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Briefcase className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/api/files/${req.filePath}`,
                            "_blank"
                          )
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {hasCloudConnection && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCloudMenuId(cloudMenuId === req.id ? null : req.id)}
                            disabled={exportingId === req.id}
                          >
                            {exportingId === req.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : copiedId === `cloud-${req.id}` ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Cloud className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {cloudMenuId === req.id && (
                            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-popover shadow-md">
                              {cloudConnections.google_drive && (
                                <button
                                  onClick={() => handleCloudExport(req.id, "google_drive")}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                                >
                                  Google Drive
                                </button>
                              )}
                              {cloudConnections.onedrive && (
                                <button
                                  onClick={() => handleCloudExport(req.id, "onedrive")}
                                  className="block w-full px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                                >
                                  OneDrive
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRequest(req.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Upload Link Modal */}
      {linkModalOpen && (
        <Dialog open={true} onClose={() => setLinkModalOpen(false)}>
          <DialogHeader onClose={() => setLinkModalOpen(false)}>
            <DialogTitle>New Upload Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a shareable link that customers can use to upload 3D files
              for quoting. You can share this via email, your website, or social
              media.
            </p>
            <Input
              label="Label"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="e.g. Website, Social Media, Business Card"
            />
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setLinkModalOpen(false)}
                disabled={savingLink}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateLink} disabled={savingLink}>
                {savingLink ? "Creating..." : "Create Link"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ---------- Upload Link Card ----------

function UploadLinkCard({
  link,
  copiedId,
  onCopy,
  onToggle,
  onRegenerate,
  onDelete,
}: {
  link: UploadLink;
  copiedId: string | null;
  onCopy: () => void;
  onToggle: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  const isCopied = copiedId === link.id;

  return (
    <Card
      className={cn(
        "transition-colors",
        !link.active && "opacity-60"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-primary" />
              <p className="font-medium text-foreground truncate">
                {link.label}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {link._count.quoteRequests} request
              {link._count.quoteRequests !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant={link.active ? "success" : "default"} size="sm">
            {link.active ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* URL preview */}
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
          <span className="truncate">
            /upload/{link.token.slice(0, 12)}...
          </span>
          <button
            onClick={onCopy}
            className="ml-auto shrink-0 text-primary hover:text-primary/80 transition-colors"
            title="Copy link"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-t border-border pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            title={link.active ? "Deactivate" : "Activate"}
          >
            {link.active ? (
              <ToggleRight className="h-3.5 w-3.5 text-success-foreground" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            title="Copy URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            title="Regenerate token"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title="Delete link"
            className="ml-auto text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

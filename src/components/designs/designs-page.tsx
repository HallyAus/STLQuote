"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DESIGN_STATUS, type DesignStatus } from "@/lib/status-colours";
import { formatRelativeTime } from "@/lib/format";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2,
  Lightbulb,
  MessageSquare,
  Paperclip,
  GitBranch,
} from "lucide-react";

interface Design {
  id: string;
  designNumber: string;
  name: string;
  description: string | null;
  status: DesignStatus;
  category: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  client: { name: string } | null;
  updatedAt: string;
  _count: { messages: number; files: number; revisions: number };
}

export function DesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/designs?${params}`);
      if (res.ok) {
        setDesigns(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchDesigns, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchDesigns, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Design Studio</h1>
          <p className="text-sm text-muted-foreground">Plan and brainstorm 3D printed product designs</p>
        </div>
        <Button onClick={() => router.push("/designs/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Design
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search designs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="ALL">All statuses</option>
          <option value="IDEA">Idea</option>
          <option value="RESEARCH">Research</option>
          <option value="DRAFTING">Drafting</option>
          <option value="PROTOTYPING">Prototyping</option>
          <option value="PRODUCTION_READY">Production Ready</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <div className="flex rounded-md border border-input">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No designs yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Start planning your first 3D printed product</p>
          <Button onClick={() => router.push("/designs/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Design
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {designs.map((d) => (
            <div
              key={d.id}
              onClick={() => router.push(`/designs/${d.id}`)}
              className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="mb-3 aspect-video overflow-hidden rounded-md bg-muted flex items-center justify-center">
                {d.thumbnailUrl ? (
                  <img src={d.thumbnailUrl} alt={d.name} className="h-full w-full object-cover" />
                ) : (
                  <Lightbulb className="h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
              {/* Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{d.designNumber}</p>
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">{d.name}</h3>
                  </div>
                  <Badge variant={DESIGN_STATUS[d.status]?.variant ?? "default"} size="sm">
                    {DESIGN_STATUS[d.status]?.label ?? d.status}
                  </Badge>
                </div>
                {d.category && (
                  <p className="text-xs text-muted-foreground">{d.category}</p>
                )}
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                    ))}
                    {d.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{d.tags.length - 3}</span>}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{d._count.messages}</span>
                  <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{d._count.files}</span>
                  <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{d._count.revisions}</span>
                  <span className="ml-auto">{formatRelativeTime(d.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {designs.map((d) => (
            <div
              key={d.id}
              onClick={() => router.push(`/designs/${d.id}`)}
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 shrink-0 rounded bg-muted flex items-center justify-center">
                {d.thumbnailUrl ? (
                  <img src={d.thumbnailUrl} alt="" className="h-full w-full rounded object-cover" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{d.designNumber}</span>
                  <span className="font-medium truncate">{d.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {d.category && <span>{d.category}</span>}
                  {d.client && <span>{d.client.name}</span>}
                  <span>{formatRelativeTime(d.updatedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{d._count.messages}</span>
                <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{d._count.files}</span>
              </div>
              <Badge variant={DESIGN_STATUS[d.status]?.variant ?? "default"} size="sm">
                {DESIGN_STATUS[d.status]?.label ?? d.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

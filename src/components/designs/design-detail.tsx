"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DESIGN_STATUS, DESIGN_STATUS_ORDER, type DesignStatus } from "@/lib/status-colours";
import { DesignChat } from "./design-chat";
import { DesignFiles } from "./design-files";
import { DesignRevisions } from "./design-revisions";
import { DesignBrief } from "./design-brief";
import { DesignFeasibility } from "./design-feasibility";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  FolderOpen,
  GitBranch,
  StickyNote,
  Sparkles,
  Save,
  ExternalLink,
} from "lucide-react";

interface Design {
  id: string;
  designNumber: string;
  name: string;
  description: string | null;
  status: DesignStatus;
  category: string | null;
  tags: string[];
  targetLengthMm: number | null;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
  targetWeightG: number | null;
  suggestedMaterial: string | null;
  suggestedColour: string | null;
  suggestedInfill: number | null;
  printNotes: string | null;
  feasibilityScore: number | null;
  feasibilityNotes: string | null;
  estimatedCost: number | null;
  estimatedTimeMin: number | null;
  clientId: string | null;
  quoteId: string | null;
  jobId: string | null;
  thumbnailUrl: string | null;
  client: { id: string; name: string } | null;
  quote: { id: string; quoteNumber: string } | null;
  job: { id: string; status: string } | null;
  messages: Array<{ id: string; role: string; content: string; imageData: string | null; metadata: string | null; createdAt: string }>;
  files: Array<{ id: string; fileType: string; filename: string; originalName: string; mimeType: string; sizeBytes: number; isPrimary: boolean; notes: string | null; createdAt: string }>;
  revisions: Array<{ id: string; version: number; title: string; description: string | null; changes: string | null; createdAt: string; files: unknown[] }>;
  _count: { messages: number; files: number; revisions: number };
  updatedAt: string;
}

const TABS = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "chat", label: "AI Brainstorm", icon: MessageSquare },
  { key: "images", label: "Reference Images", icon: ImageIcon },
  { key: "files", label: "Files", icon: FolderOpen },
  { key: "revisions", label: "Revisions", icon: GitBranch },
  { key: "notes", label: "Notes", icon: StickyNote },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const CATEGORIES = [
  "Functional Parts",
  "Enclosures",
  "Mounts & Brackets",
  "Organisers",
  "Prototypes",
  "Art & Decor",
  "Custom",
];

export function DesignDetail({ designId }: { designId: string }) {
  const router = useRouter();
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefData, setBriefData] = useState<Record<string, unknown> | null>(null);

  // Editable overview fields
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDims, setEditDims] = useState({ l: "", w: "", h: "", weight: "" });
  const [editMaterial, setEditMaterial] = useState({ material: "", colour: "", infill: "" });
  const [editPrintNotes, setEditPrintNotes] = useState("");

  const fetchDesign = useCallback(async () => {
    try {
      const res = await fetch(`/api/designs/${designId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDesign(data);
      setEditName(data.name);
      setEditDesc(data.description || "");
      setEditCategory(data.category || "");
      setEditTags(data.tags?.join(", ") || "");
      setEditNotes(data.printNotes || "");
      setEditDims({
        l: data.targetLengthMm?.toString() || "",
        w: data.targetWidthMm?.toString() || "",
        h: data.targetHeightMm?.toString() || "",
        weight: data.targetWeightG?.toString() || "",
      });
      setEditMaterial({
        material: data.suggestedMaterial || "",
        colour: data.suggestedColour || "",
        infill: data.suggestedInfill?.toString() || "",
      });
      setEditPrintNotes(data.printNotes || "");
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, [designId]);

  useEffect(() => { fetchDesign(); }, [fetchDesign]);

  async function saveOverview() {
    setSaving(true);
    try {
      const res = await fetch(`/api/designs/${designId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDesc || null,
          category: editCategory || null,
          tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
          targetLengthMm: editDims.l ? parseFloat(editDims.l) : null,
          targetWidthMm: editDims.w ? parseFloat(editDims.w) : null,
          targetHeightMm: editDims.h ? parseFloat(editDims.h) : null,
          targetWeightG: editDims.weight ? parseFloat(editDims.weight) : null,
          suggestedMaterial: editMaterial.material || null,
          suggestedColour: editMaterial.colour || null,
          suggestedInfill: editMaterial.infill ? parseFloat(editMaterial.infill) : null,
          printNotes: editPrintNotes || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDesign((prev) => prev ? { ...prev, ...updated } : prev);
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: string) {
    const res = await fetch(`/api/designs/${designId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setDesign((prev) => prev ? { ...prev, status: status as DesignStatus } : prev);
  }

  async function handleDelete() {
    if (!confirm("Delete this design and all its files?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/designs/${designId}`, { method: "DELETE" });
      if (res.ok) router.push("/designs");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCreateQuote() {
    setCreatingQuote(true);
    try {
      const res = await fetch(`/api/designs/${designId}/create-quote`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        router.push(`/quotes/${data.quoteId}`);
      }
    } finally {
      setCreatingQuote(false);
    }
  }

  async function handleGenerateBrief() {
    setGeneratingBrief(true);
    try {
      const res = await fetch(`/api/designs/${designId}/ai/brief`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBriefData(data);
        await fetchDesign();
      }
    } finally {
      setGeneratingBrief(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    try {
      await fetch(`/api/designs/${designId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printNotes: editPrintNotes || null }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!design) {
    return <div className="py-16 text-center text-muted-foreground">Design not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/designs")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{design.designNumber}</p>
            <h1 className="text-xl font-bold">{design.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={design.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {DESIGN_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{DESIGN_STATUS[s].label}</option>
            ))}
          </select>
          {design.quoteId ? (
            <Button variant="secondary" size="sm" onClick={() => router.push(`/quotes/${design.quoteId}`)}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Quote
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreateQuote} disabled={creatingQuote}>
              {creatingQuote ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
              Create Quote
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive-foreground">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "chat" && design._count.messages > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{design._count.messages}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">None</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <Input label="Tags (comma-separated)" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="e.g. outdoor, weatherproof" />
                </div>
                {design.client && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Client: </span>
                    <span className="font-medium">{design.client.name}</span>
                  </div>
                )}
                <Button onClick={saveOverview} disabled={saving} size="sm">
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Target Dimensions & Material</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Input label="Length (mm)" type="number" value={editDims.l} onChange={(e) => setEditDims((d) => ({ ...d, l: e.target.value }))} />
                  <Input label="Width (mm)" type="number" value={editDims.w} onChange={(e) => setEditDims((d) => ({ ...d, w: e.target.value }))} />
                  <Input label="Height (mm)" type="number" value={editDims.h} onChange={(e) => setEditDims((d) => ({ ...d, h: e.target.value }))} />
                  <Input label="Weight (g)" type="number" value={editDims.weight} onChange={(e) => setEditDims((d) => ({ ...d, weight: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Material" value={editMaterial.material} onChange={(e) => setEditMaterial((m) => ({ ...m, material: e.target.value }))} placeholder="e.g. PETG" />
                  <Input label="Colour" value={editMaterial.colour} onChange={(e) => setEditMaterial((m) => ({ ...m, colour: e.target.value }))} placeholder="e.g. Black" />
                  <Input label="Infill %" type="number" value={editMaterial.infill} onChange={(e) => setEditMaterial((m) => ({ ...m, infill: e.target.value }))} />
                </div>
                <Button onClick={saveOverview} disabled={saving} size="sm">
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Brief / Feasibility */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">AI Brief</CardTitle>
                  <Button size="sm" variant="secondary" onClick={handleGenerateBrief} disabled={generatingBrief}>
                    {generatingBrief ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                    Generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {briefData ? (
                  <DesignBrief data={briefData} />
                ) : design.feasibilityScore ? (
                  <DesignFeasibility
                    score={design.feasibilityScore}
                    notes={design.feasibilityNotes}
                    cost={design.estimatedCost}
                    timeMin={design.estimatedTimeMin}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Click Generate to create an AI brief with feasibility analysis, cost estimates, and material recommendations.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {design.estimatedCost && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Cost</span>
                    <span className="font-medium">${design.estimatedCost.toFixed(2)}</span>
                  </div>
                )}
                {design.estimatedTimeMin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Est. Print Time</span>
                    <span className="font-medium">{design.estimatedTimeMin >= 60 ? `${(design.estimatedTimeMin / 60).toFixed(1)}h` : `${Math.round(design.estimatedTimeMin)}min`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span>{design._count.messages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Files</span>
                  <span>{design._count.files}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revisions</span>
                  <span>{design._count.revisions}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "chat" && <DesignChat designId={designId} initialMessages={design.messages} />}

      {tab === "images" && (
        <DesignFiles designId={designId} userId={design.files[0]?.filename ? "x" : "x"} filter="reference_image" onUpdate={fetchDesign} />
      )}

      {tab === "files" && (
        <DesignFiles designId={designId} userId="x" filter="cad" onUpdate={fetchDesign} />
      )}

      {tab === "revisions" && <DesignRevisions designId={designId} revisions={design.revisions} onUpdate={fetchDesign} />}

      {tab === "notes" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Print Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea
              value={editPrintNotes}
              onChange={(e) => setEditPrintNotes(e.target.value)}
              rows={12}
              placeholder="Add notes about print orientation, supports, post-processing..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button onClick={saveNotes} disabled={saving} size="sm" className="mt-3">
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save Notes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

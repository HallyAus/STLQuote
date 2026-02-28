"use client";

import {
  Check,
  Clock,
  Rocket,
  Sparkles,
  Construction,
  CalendarDays,
  ShoppingBag,
  Receipt,
  BarChart3,
  Upload,
  Calculator,
  FileText,
  Users,
  Briefcase,
  Palette,
  Printer,
  Package,
  Wrench,
  Plug,
  Bot,
  Crown,
  Globe,
  MessageSquare,
  CreditCard,
  Zap,
  Shield,
  Map,
  BookTemplate,
  Cloud,
  PenTool,
  Mail,
  HardDrive,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type Status = "shipped" | "in-progress" | "planned" | "exploring";

interface RoadmapItem {
  title: string;
  description: string;
  icon: LucideIcon;
  status: Status;
  version?: string;
  pro?: boolean;
}

interface RoadmapPhase {
  label: string;
  tagline: string;
  items: RoadmapItem[];
}

const STATUS_CONFIG: Record<Status, { label: string; variant: "success" | "warning" | "info" | "default"; dotClass: string }> = {
  shipped: { label: "Shipped", variant: "success", dotClass: "bg-success-foreground" },
  "in-progress": { label: "In Progress", variant: "warning", dotClass: "bg-warning-foreground" },
  planned: { label: "Planned", variant: "info", dotClass: "bg-info-foreground" },
  exploring: { label: "Exploring", variant: "default", dotClass: "bg-muted-foreground" },
};

const PHASES: RoadmapPhase[] = [
  {
    label: "Foundation",
    tagline: "Core platform — live now",
    items: [
      { title: "Cost Calculator", description: "Instant cost breakdowns with material, machine, labour, and overhead costs. G-code and STL upload with auto-fill.", icon: Calculator, status: "shipped", version: "1.0" },
      { title: "Quote Management", description: "Professional quotes with auto-numbering (PF-YYYY-NNN), line items, markup, notes, and terms. Duplicate, send, and track status.", icon: FileText, status: "shipped", version: "1.0" },
      { title: "Quote Templates", description: "Save and reuse quote configurations. Apply templates when creating new quotes to save time.", icon: BookTemplate, status: "shipped", version: "4.1" },
      { title: "Client Management", description: "Client database with contact info, colour-coded tags, interaction timeline (notes, calls, emails, meetings).", icon: Users, status: "shipped", version: "1.0" },
      { title: "Job Tracking", description: "Kanban board with 7 status columns. Drag-and-drop, filter by status, auto-timestamps on state changes.", icon: Briefcase, status: "shipped", version: "1.0" },
      { title: "Print Farm Calendar", description: "Weekly Gantt view with printer rows. Drag-to-reschedule, unscheduled jobs sidebar, timezone-aware now marker.", icon: CalendarDays, status: "shipped", version: "4.1" },
      { title: "Printers & Materials", description: "Full CRUD for your printer fleet and material library. Hourly rate calculation, stock tracking, low-stock alerts.", icon: Printer, status: "shipped", version: "1.0" },
      { title: "PDF Export", description: "Professional A4 PDF quotes and invoices with your logo, ABN, bank details, and GST breakdown.", icon: FileText, status: "shipped", version: "1.0" },
      { title: "Dashboard Analytics", description: "Revenue stats, printer utilisation bars, top materials, average markup, and quick action buttons.", icon: BarChart3, status: "shipped", version: "2.0" },
    ],
  },
  {
    label: "Business Tools",
    tagline: "Professional features for growing shops",
    items: [
      { title: "Invoicing", description: "Full invoice lifecycle: DRAFT → SENT → PAID/OVERDUE/VOID. Create from quotes or jobs, email with PDF attachment.", icon: Receipt, status: "shipped", version: "3.0", pro: true },
      { title: "Suppliers & Consumables", description: "Supplier database with contact info and supplied items. Consumable tracking with stock alerts and printer assignment.", icon: Package, status: "shipped", version: "3.0", pro: true },
      { title: "Bulk Actions", description: "Select multiple quotes or invoices, change status, export CSV, or delete in bulk. Floating action bar.", icon: Zap, status: "shipped", version: "4.1", pro: true },
      { title: "AI Quote Assistant", description: "Describe a job in plain English — AI generates structured line items with material and printer selection.", icon: Bot, status: "shipped", version: "4.2", pro: true },
      { title: "STL & G-code Upload", description: "Upload STL files for dimension analysis, or G-code files for auto-extracted print settings from Bambu/Prusa/Cura.", icon: Upload, status: "shipped", version: "1.0" },
      { title: "Job Photo Gallery", description: "Upload progress and completion photos to jobs. Lightbox viewer, auth-checked serving.", icon: Briefcase, status: "shipped", version: "3.0" },
      { title: "Onboarding Guide", description: "Guided checklist for new users — 5 data-driven steps that auto-complete. Shown in sidebar for 14 days.", icon: Rocket, status: "shipped", version: "4.5" },
      { title: "Design Studio", description: "Manage design projects with AI chat, reference image analysis, file versioning, revision timelines, and design briefs. Convert designs to quotes.", icon: PenTool, status: "shipped", version: "5.0", pro: true },
      { title: "Onboarding Emails", description: "8-email drip sequence introducing new users to key features over their first week. Unsubscribe support and admin toggle.", icon: Mail, status: "shipped", version: "5.3" },
    ],
  },
  {
    label: "Integrations",
    tagline: "Connect your workflow",
    items: [
      { title: "Shopify Sync", description: "Import unfulfilled orders as jobs, auto-create clients from Shopify customers. Webhook support for real-time order sync.", icon: ShoppingBag, status: "shipped", version: "4.4", pro: true },
      { title: "Xero Accounting", description: "OAuth2 connection to push invoices and contacts to your Xero account. Automatic sync.", icon: Globe, status: "shipped", version: "4.0", pro: true },
      { title: "Webhooks", description: "Send real-time notifications to any URL when jobs or quotes change status. Custom payloads.", icon: Plug, status: "shipped", version: "4.0", pro: true },
      { title: "Cloud Storage", description: "Export design files, quotes, and invoices to Google Drive or OneDrive. Auto-creates organised folder structure. Per-user OAuth.", icon: Cloud, status: "shipped", version: "5.2", pro: true },
      { title: "Stripe Payments", description: "Accept card payments directly from client-facing invoices and quote portal. \"Pay now\" button.", icon: CreditCard, status: "planned", pro: true },
      { title: "Etsy Integration", description: "Import orders from your Etsy shop, auto-create jobs and clients. Similar workflow to Shopify sync.", icon: ShoppingBag, status: "exploring", pro: true },
      { title: "Slack / Discord", description: "Get notified in your team channels when jobs are completed, quotes are accepted, or stock runs low.", icon: MessageSquare, status: "exploring", pro: true },
    ],
  },
  {
    label: "Inventory & Operations",
    tagline: "Coming next — smarter stock management",
    items: [
      { title: "Stock Transaction History", description: "Full audit trail of every stock change — received, used, adjusted — with timestamps, user, and reason.", icon: Clock, status: "in-progress" },
      { title: "Purchase Orders", description: "Create POs linked to suppliers, track expected delivery dates, mark as received to auto-increase stock.", icon: Receipt, status: "in-progress" },
      { title: "Consumable Stock Adjustments", description: "Quick +/- stock buttons for consumables, matching the existing material stock adjustment workflow.", icon: Wrench, status: "in-progress" },
      { title: "Supplier Invoice Upload", description: "Upload PDF or photo receipts, link to materials received, track purchase cost history per material.", icon: Upload, status: "planned", pro: true },
      { title: "Reorder Suggestions", description: "Dashboard widget that flags materials below safety stock and suggests order quantities based on usage rate.", icon: Sparkles, status: "planned", pro: true },
      { title: "Material Usage Analytics", description: "Track cost-of-goods per job, consumption trends ($/kg), material profit margins, and waste percentages.", icon: BarChart3, status: "planned", pro: true },
    ],
  },
  {
    label: "Future",
    tagline: "On the horizon",
    items: [
      { title: "Multi-user & Teams", description: "Invite team members with role-based permissions. Assign jobs to operators, track per-user performance.", icon: Users, status: "exploring" },
      { title: "Batch & Lot Tracking", description: "Track material batches with expiry dates and supplier lot numbers. Critical for resin shelf life management.", icon: Package, status: "exploring" },
      { title: "Supplier Performance", description: "Track lead times, on-time delivery rates, price history, and quality ratings across your suppliers.", icon: Shield, status: "exploring" },
      { title: "Demand Forecasting", description: "Predict material needs from active and upcoming jobs. Suggest safety stock levels automatically.", icon: BarChart3, status: "exploring" },
      { title: "Mobile App", description: "Native mobile experience for checking job status, scanning deliveries, and updating stock from the workshop floor.", icon: Rocket, status: "exploring" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", config.dotClass)} />
  );
}

function RoadmapItemCard({ item }: { item: RoadmapItem }) {
  const config = STATUS_CONFIG[item.status];
  return (
    <div className={cn(
      "group relative flex gap-4 rounded-xl border p-4 transition-all",
      item.status === "shipped"
        ? "border-border/50 bg-card"
        : item.status === "in-progress"
          ? "border-warning/30 bg-warning/5"
          : "border-border/30 bg-card/50"
    )}>
      {/* Icon */}
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
        item.status === "shipped"
          ? "bg-success/10 text-success-foreground"
          : item.status === "in-progress"
            ? "bg-warning/10 text-warning-foreground"
            : "bg-muted text-muted-foreground"
      )}>
        <item.icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {item.title}
          </h3>
          <Badge variant={config.variant} className="text-[10px]">
            {item.status === "shipped" && <Check className="mr-0.5 h-2.5 w-2.5" />}
            {config.label}
          </Badge>
          {item.version && (
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              v{item.version}
            </span>
          )}
          {item.pro && (
            <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
              <Crown className="h-2.5 w-2.5" />
              Pro
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RoadmapPage() {
  // Count stats
  const shipped = PHASES.flatMap((p) => p.items).filter((i) => i.status === "shipped").length;
  const inProgress = PHASES.flatMap((p) => p.items).filter((i) => i.status === "in-progress").length;
  const planned = PHASES.flatMap((p) => p.items).filter((i) => i.status === "planned").length;
  const exploring = PHASES.flatMap((p) => p.items).filter((i) => i.status === "exploring").length;
  const total = shipped + inProgress + planned + exploring;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 pb-4 bg-background">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Map className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Roadmap</h2>
            <p className="text-sm text-muted-foreground">
              What we&apos;ve built, what&apos;s next, and where we&apos;re headed
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <StatusDot status="shipped" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{shipped}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Shipped</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <StatusDot status="in-progress" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{inProgress}</p>
              <p className="text-[11px] font-medium text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <StatusDot status="planned" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{planned}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Planned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <StatusDot status="exploring" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{exploring}</p>
              <p className="text-[11px] font-medium text-muted-foreground">Exploring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Overall progress</span>
          <span className="tabular-nums text-muted-foreground">
            {shipped} of {total} features shipped
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success-foreground to-primary transition-all duration-700"
            style={{ width: `${(shipped / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      {PHASES.map((phase, idx) => (
        <div key={phase.label}>
          {/* Phase header */}
          <div className="mb-4 flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
              idx === 0 ? "bg-success/15 text-success-foreground"
                : idx === PHASES.length - 1 ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary"
            )}>
              {idx + 1}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{phase.label}</h3>
              <p className="text-xs text-muted-foreground">{phase.tagline}</p>
            </div>
            <div className="ml-auto text-xs tabular-nums text-muted-foreground/60">
              {phase.items.filter((i) => i.status === "shipped").length}/{phase.items.length} shipped
            </div>
          </div>

          {/* Items grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {phase.items.map((item) => (
              <RoadmapItemCard key={item.title} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-6 text-center">
        <Construction className="mx-auto h-6 w-6 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Got a feature idea?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          We&apos;re always listening. Reach out at{" "}
          <a href="mailto:hello@printforge.com.au" className="text-primary hover:underline">
            hello@printforge.com.au
          </a>
        </p>
      </div>
    </div>
  );
}

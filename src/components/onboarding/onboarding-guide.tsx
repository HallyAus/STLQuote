"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Rocket,
  Printer,
  Palette,
  FileText,
  Users,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingStatus {
  printerCount: number;
  materialCount: number;
  quoteCount: number;
  clientCount: number;
  jobCount: number;
}

interface OnboardingStep {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  isComplete: (status: OnboardingStatus) => boolean;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS: OnboardingStep[] = [
  {
    key: "printer",
    label: "Add your first printer",
    href: "/printers",
    icon: Printer,
    isComplete: (s) => s.printerCount > 0,
  },
  {
    key: "material",
    label: "Add a material",
    href: "/materials",
    icon: Palette,
    isComplete: (s) => s.materialCount > 0,
  },
  {
    key: "quote",
    label: "Create your first quote",
    href: "/quotes/new",
    icon: FileText,
    isComplete: (s) => s.quoteCount > 0,
  },
  {
    key: "client",
    label: "Add a client",
    href: "/clients",
    icon: Users,
    isComplete: (s) => s.clientCount > 0,
  },
  {
    key: "job",
    label: "Create a job",
    href: "/jobs",
    icon: Briefcase,
    isComplete: (s) => s.jobCount > 0,
  },
];

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OnboardingGuideProps {
  onClose: () => void;
}

export function OnboardingGuide({ onClose }: OnboardingGuideProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const createdAt = session?.user?.createdAt ?? null;

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null); // null = not yet checked
  const [collapsed, setCollapsed] = useState(false);

  // Check if account is older than 14 days
  const isExpired = useMemo(() => {
    if (!createdAt) return true;
    return Date.now() - new Date(createdAt).getTime() > FOURTEEN_DAYS_MS;
  }, [createdAt]);

  // Read localStorage on mount
  useEffect(() => {
    if (!userId) return;
    setDismissed(localStorage.getItem(`onboarding-dismissed-${userId}`) === "true");
    setCollapsed(localStorage.getItem(`onboarding-collapsed-${userId}`) === "true");
  }, [userId]);

  // Fetch onboarding status
  const fetchStatus = useCallback(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/onboarding/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (dismissed || isExpired) return;
    return fetchStatus();
  }, [dismissed, isExpired, fetchStatus]);

  // Completion stats
  const completedCount = status
    ? STEPS.filter((step) => step.isComplete(status)).length
    : 0;
  const allComplete = status !== null && completedCount === STEPS.length;

  // Don't render if: no session, expired, dismissed, all complete, or still checking localStorage
  if (!userId || isExpired || dismissed === null || dismissed || allComplete) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(`onboarding-dismissed-${userId}`, "true");
    setDismissed(true);
  }

  function toggleCollapse() {
    const next = !collapsed;
    localStorage.setItem(`onboarding-collapsed-${userId}`, String(next));
    setCollapsed(next);
    // Refetch when expanding to catch new completions
    if (!next) fetchStatus();
  }

  return (
    <div className="border-b border-sidebar-border px-2 py-3">
      {/* Header */}
      <div className="flex items-center gap-1 px-3">
        <button
          onClick={toggleCollapse}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <Rocket className="h-4 w-4 shrink-0 text-sidebar-primary" />
          <span className="text-xs font-semibold text-sidebar-foreground">
            Getting Started
          </span>
          <span className="ml-auto text-[10px] tabular-nums text-sidebar-foreground/50">
            {status ? `${completedCount}/${STEPS.length}` : ""}
          </span>
          {collapsed ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
          ) : (
            <ChevronUp className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
          )}
        </button>
        <button
          onClick={handleDismiss}
          className="rounded p-0.5 text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title="Dismiss guide"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-3 mt-2 h-1 rounded-full bg-sidebar-accent">
        <div
          className="h-1 rounded-full bg-sidebar-primary transition-all duration-500"
          style={{
            width: status
              ? `${(completedCount / STEPS.length) * 100}%`
              : "0%",
          }}
        />
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="mt-2 space-y-0.5">
          {STEPS.map((step) => {
            const done = status ? step.isComplete(status) : false;
            return (
              <Link
                key={step.key}
                href={step.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                  done
                    ? "text-sidebar-foreground/40"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/30"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-foreground" />
                ) : (
                  <step.icon className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" />
                )}
                <span className={cn(done && "line-through")}>{step.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

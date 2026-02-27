"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

function Dialog({ open, onClose, children, maxWidth = "max-w-lg" }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = "hidden";

      // Focus trap: focus first focusable element
      const timer = setTimeout(() => {
        const el = contentRef.current;
        if (!el) return;
        const focusable = el.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Basic focus trap
      if (e.key === "Tab" && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Fallback: if animation doesn't fire, hide after timeout
  React.useEffect(() => {
    if (!open && visible) {
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open, visible]);

  function handleAnimationEnd() {
    if (!open) {
      setVisible(false);
    }
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/50",
          open ? "animate-fade-in" : "animate-fade-out"
        )}
        onClick={onClose}
        onAnimationEnd={handleAnimationEnd}
      />
      <div
        ref={contentRef}
        className={cn(
          "relative z-10 mx-4 max-h-[85vh] w-full overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg",
          open ? "animate-scale-in" : "animate-scale-out",
          maxWidth
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function DialogHeader({
  children,
  onClose,
  className,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h2>
  );
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-6 flex sticky bottom-0 justify-end gap-3 bg-card pt-4 -mb-6 pb-6 -mx-6 px-6 border-t border-border", className)}>
      {children}
    </div>
  );
}

export { Dialog, DialogHeader, DialogTitle, DialogFooter };

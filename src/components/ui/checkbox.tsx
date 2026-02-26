"use client";

import { forwardRef, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    // Support both forwarded ref and internal ref
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

    useEffect(() => {
      if (resolvedRef && "current" in resolvedRef && resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate ?? false;
      }
    }, [indeterminate, resolvedRef]);

    return (
      <input
        type="checkbox"
        ref={resolvedRef}
        className={cn(
          "h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible component that triggers drip email check on first dashboard load.
 * Fire-and-forget — never shows UI, never blocks rendering.
 */
export function DripEmailTrigger() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Fire-and-forget POST — ignore result
    fetch("/api/drip-emails", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}

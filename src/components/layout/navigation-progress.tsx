"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setVisible(true);
      setProgress(0);

      // Animate to 90% quickly
      const t1 = setTimeout(() => setProgress(90), 50);
      // Complete and fade out
      const t2 = setTimeout(() => setProgress(100), 300);
      const t3 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[100] h-0.5 bg-primary transition-all duration-200 ease-out"
      style={{ width: `${progress}%` }}
    />
  );
}

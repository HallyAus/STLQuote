"use client";

import { useState, useCallback, useMemo } from "react";

export function useBulkSelection(allIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === allIds.length && allIds.length > 0) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = allIds.length > 0 && selectedIds.size === allIds.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < allIds.length;

  return useMemo(
    () => ({
      selectedIds,
      toggleOne,
      toggleAll,
      clearSelection,
      isAllSelected,
      isIndeterminate,
      count: selectedIds.size,
    }),
    [selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isIndeterminate]
  );
}

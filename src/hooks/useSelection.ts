import { useCallback, useEffect, useState } from "react";

type SelectionOptions = {
  isMetaKey?: boolean;
  isShiftKey?: boolean;
};

export const useSelection = <T extends { id: string }>(items: T[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(items.length - 1, index)),
    [items.length]
  );

  useEffect(() => {
    if (activeIndex === null || items.length === 0) {
      return;
    }
    setActiveIndex((current) => (current === null ? null : clampIndex(current)));
  }, [activeIndex, clampIndex, items.length]);

  const handleRowSelect = useCallback(
    (index: number, id: string, options: SelectionOptions = {}) => {
      const isMetaKey = options.isMetaKey ?? false;
      const isShiftKey = options.isShiftKey ?? false;

      setSelectedIds((current) => {
        const next = new Set(current);

        if (isShiftKey && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i += 1) {
            const track = items[i];
            if (track) {
              next.add(track.id);
            }
          }
          setLastSelectedIndex(index);
          setActiveIndex(index);
        } else if (isMetaKey) {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          setLastSelectedIndex(index);
          setActiveIndex(index);
        } else {
          next.clear();
          next.add(id);
          setLastSelectedIndex(index);
          setActiveIndex(index);
        }

        return next;
      });
    },
    [items, lastSelectedIndex]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
    setLastSelectedIndex(items.length - 1);
    setActiveIndex(items.length - 1);
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
    setActiveIndex(null);
  }, []);

  return {
    activeIndex,
    clearSelection,
    handleRowSelect,
    selectAll,
    selectedIds,
  };
};

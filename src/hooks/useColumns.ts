import { useCallback } from "react";
import { baseColumns } from "../data/library";
import { t } from "../i18n";
import type { ColumnConfig, Track } from "../types/library";
import { useStickyState } from "./useStickyState";
import { parseColumns } from "../utils/storage";

type UseColumnsArgs = {
  tracks: Track[];
};

export const useColumns = ({ tracks }: UseColumnsArgs) => {
  const [columns, setColumns] = useStickyState("muro-columns", baseColumns, {
    parse: parseColumns,
    serialize: (value) => JSON.stringify(value),
  });

  const toggleColumn = useCallback(
    (key: ColumnConfig["key"]) => {
      setColumns((current) =>
        current.map((column) =>
          column.key === key
            ? { ...column, visible: !column.visible }
            : column
        )
      );
    },
    [setColumns]
  );

  const autoFitColumn = useCallback(
    (key: ColumnConfig["key"]) => {
      const column = columns.find((item) => item.key === key);
      if (!column) {
        return;
      }

      const maxLength = Math.max(
        t(column.labelKey as typeof column.labelKey).length,
        ...tracks.map((track) => {
          const value = track[key as keyof Track];
          return value === undefined || value === null ? 0 : String(value).length;
        })
      );
      const nextWidth = Math.min(360, Math.max(120, maxLength * 8 + 48));

      setColumns((current) =>
        current.map((item) =>
          item.key === key ? { ...item, width: nextWidth } : item
        )
      );
    },
    [columns, setColumns, tracks]
  );

  const handleColumnResize = useCallback(
    (key: ColumnConfig["key"], width: number) => {
      setColumns((current) =>
        current.map((column) =>
          column.key === key ? { ...column, width } : column
        )
      );
    },
    [setColumns]
  );

  const reorderColumns = useCallback(
    (dragKey: ColumnConfig["key"], targetIndex: number) => {
      setColumns((current) => {
        const fromIndex = current.findIndex((column) => column.key === dragKey);
        if (fromIndex === -1) {
          return current;
        }
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        const clampedIndex = Math.max(0, Math.min(next.length, targetIndex));
        next.splice(clampedIndex, 0, moved);
        return next;
      });
    },
    [setColumns]
  );

  return { autoFitColumn, columns, handleColumnResize, reorderColumns, toggleColumn };
};

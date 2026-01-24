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
        ...tracks.map((track) => String(track[key as keyof Track]).length)
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

  return { autoFitColumn, columns, handleColumnResize, toggleColumn };
};

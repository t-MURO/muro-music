import { createPortal } from "react-dom";
import { t } from "../../i18n";
import type { ColumnConfig } from "../../types/library";

type ColumnsMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number };
  columns: ColumnConfig[];
  onToggleColumn: (key: ColumnConfig["key"]) => void;
};

export const ColumnsMenu = ({
  isOpen,
  position,
  columns,
  onToggleColumn,
}: ColumnsMenuProps) => {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-50 w-60 rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-4 text-sm shadow-[var(--shadow-lg)] backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      style={{ left: position.x, top: position.y }}
    >
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {t("columns.visible")}
      </div>
      <div className="space-y-1">
        {columns.map((column) => (
          <label
            key={column.key}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-[var(--panel-muted)]"
          >
            <input
              checked={column.visible}
              className="h-4 w-4 cursor-pointer rounded accent-[var(--accent)]"
              onChange={() => onToggleColumn(column.key)}
              type="checkbox"
            />
            <span className="font-medium">{t(column.labelKey)}</span>
          </label>
        ))}
      </div>
    </div>,
    document.body
  );
};

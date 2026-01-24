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
      className="fixed z-50 w-52 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm shadow-[var(--shadow-md)]"
      onClick={(event) => event.stopPropagation()}
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {t("columns.visible")}
      </div>
      <div className="mt-3 space-y-2">
        {columns.map((column) => (
          <label
            key={column.key}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              checked={column.visible}
              className="h-4 w-4 accent-[var(--accent)]"
              onChange={() => onToggleColumn(column.key)}
              type="checkbox"
            />
            <span>{t(column.labelKey)}</span>
          </label>
        ))}
      </div>
    </div>,
    document.body
  );
};

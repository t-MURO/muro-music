import { t } from "../../i18n";
import { useResizable } from "../../hooks/useResizable";
import type { ColumnConfig } from "../../types/library";

type TableHeaderProps = {
  columns: ColumnConfig[];
  tableWidth: number;
  gridTemplateColumns: string;
  onColumnResize: (key: ColumnConfig["key"], width: number) => void;
  onColumnAutoFit: (key: ColumnConfig["key"]) => void;
};

export const TableHeader = ({
  columns,
  tableWidth,
  gridTemplateColumns,
  onColumnResize,
  onColumnAutoFit,
}: TableHeaderProps) => {
  const { startResize } = useResizable();

  return (
    <div
      className="sticky top-0 z-30 bg-[var(--panel-muted)]"
      style={{ width: "100%", minWidth: tableWidth }}
      role="rowgroup"
    >
      <div className="relative" style={{ width: "100%", minWidth: tableWidth }}>
        <div
          className="grid text-left text-xs uppercase tracking-wider text-[var(--text-muted)]"
          style={{ gridTemplateColumns }}
          role="row"
        >
          {columns.map((column) => (
            <div
              key={column.key}
              className="relative bg-[var(--panel-muted)] px-4 py-3 pr-8"
              role="columnheader"
            >
              <span className="block truncate">{t(column.labelKey)}</span>
              <span className="absolute right-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--panel-border)] opacity-70" />
              <span
                className="absolute right-0 top-0 h-full w-4 cursor-col-resize"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onColumnAutoFit(column.key);
                }}
                onMouseDown={(event) => {
                  startResize(
                    event,
                    column.width,
                    (nextWidth) => onColumnResize(column.key, nextWidth),
                    { minSize: 80, maxSize: 360, stopPropagation: true }
                  );
                }}
                role="presentation"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

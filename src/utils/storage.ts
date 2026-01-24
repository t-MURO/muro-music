import { baseColumns } from "../data/library";
import type { ColumnConfig } from "../types/library";

export const parseColumns = (raw: string): ColumnConfig[] => {
  try {
    const parsed = JSON.parse(raw) as ColumnConfig[];
    return baseColumns.map((column) => {
      const saved = parsed.find((item) => item.key === column.key);
      return saved ? { ...column, ...saved, labelKey: column.labelKey } : column;
    });
  } catch {
    return baseColumns;
  }
};

export const parseNumber = (fallback: number) => (raw: string) => {
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const parseDetailWidth = (raw: string) => {
  const parsed = Number(raw);
  const saved = Number.isNaN(parsed) ? 320 : parsed;
  return saved <= 56 ? 320 : saved;
};

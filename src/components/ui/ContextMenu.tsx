import {
  ListChecks,
  ListPlus,
  Pencil,
  Play,
  SkipForward,
  Trash2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { t } from "../../i18n";

type ContextMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number };
  selectionCount: number;
};

export const ContextMenu = ({
  isOpen,
  position,
  selectionCount,
}: ContextMenuProps) => {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-50 w-52 rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 py-2 text-left text-sm shadow-[var(--shadow-lg)] backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      style={{ left: position.x, top: position.y }}
    >
      {selectionCount > 1 && (
        <div className="mx-3 mb-2 rounded-md bg-[var(--accent-soft)] px-2 py-1.5 text-xs font-semibold text-[var(--accent)]">
          {selectionCount} selected
        </div>
      )}
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]">
        <Play className="h-4 w-4" />
        {t("menu.play")}
      </button>
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]">
        <SkipForward className="h-4 w-4" />
        {t("menu.playNext")}
      </button>
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]">
        <ListChecks className="h-4 w-4" />
        {t("menu.addQueue")}
      </button>
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]">
        <ListPlus className="h-4 w-4" />
        {t("menu.addPlaylist")}
      </button>
      <div className="my-1 h-px bg-[var(--panel-border)]" />
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]">
        <Pencil className="h-4 w-4" />
        {t("menu.edit")}
      </button>
      <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30">
        <Trash2 className="h-4 w-4" />
        {t("menu.delete")}
      </button>
    </div>,
    document.body
  );
};

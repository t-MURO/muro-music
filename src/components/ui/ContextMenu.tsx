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
      className="fixed z-50 w-44 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2 text-left text-sm shadow-[var(--shadow-md)]"
      onClick={(event) => event.stopPropagation()}
      style={{ left: position.x, top: position.y }}
    >
      {selectionCount > 1 && (
        <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {selectionCount} selected
        </div>
      )}
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
        <Play className="h-4 w-4" />
        {t("menu.play")}
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
        <SkipForward className="h-4 w-4" />
        {t("menu.playNext")}
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
        <ListChecks className="h-4 w-4" />
        {t("menu.addQueue")}
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
        <ListPlus className="h-4 w-4" />
        {t("menu.addPlaylist")}
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
        <Pencil className="h-4 w-4" />
        {t("menu.edit")}
      </button>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-[var(--panel-muted)]">
        <Trash2 className="h-4 w-4" />
        {t("menu.delete")}
      </button>
    </div>,
    document.body
  );
};

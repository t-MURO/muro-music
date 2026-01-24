import { Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { t } from "../../i18n";

type PlaylistContextMenuProps = {
  isOpen: boolean;
  position: { x: number; y: number };
  playlistName?: string;
  onEdit: () => void;
  onDelete: () => void;
};

export const PlaylistContextMenu = ({
  isOpen,
  position,
  playlistName,
  onEdit,
  onDelete,
}: PlaylistContextMenuProps) => {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-50 w-52 rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 py-2 text-left text-sm shadow-[var(--shadow-lg)] backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      style={{ left: position.x, top: position.y }}
    >
      {playlistName && (
        <div className="mx-3 mb-2 truncate rounded-md bg-[var(--panel-muted)] px-2 py-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
          {playlistName}
        </div>
      )}
      <button
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium transition-colors hover:bg-[var(--panel-muted)]"
        onClick={onEdit}
        type="button"
      >
        <Pencil className="h-4 w-4" />
        {t("menu.edit")}
      </button>
      <button
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={onDelete}
        type="button"
      >
        <Trash2 className="h-4 w-4" />
        {t("menu.delete")}
      </button>
    </div>,
    document.body
  );
};

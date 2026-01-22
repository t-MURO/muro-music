import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Columns2,
  ListChecks,
  Folder,
  Inbox,
  ListMusic,
  ListPlus,
  Pencil,
  Play,
  Pause,
  Search,
  Settings,
  Shuffle,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  Speaker,
  Trash2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createPortal } from "react-dom";
import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Locale,
  type MessageKey,
  isLocale,
  localeOptions,
  setLocale as setI18nLocale,
  t,
} from "./i18n";

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "graphite", label: "Graphite" },
  { id: "sage", label: "Sage" },
  { id: "ember", label: "Ember" },
  { id: "midnight", label: "Midnight" },
  { id: "ocean", label: "Ocean" },
  { id: "terminal", label: "Terminal" },
];

type ColumnConfig = {
  key: "title" | "artist" | "album" | "duration" | "bitrate" | "rating";
  labelKey: MessageKey;
  visible: boolean;
  width: number;
};

const baseColumns: ColumnConfig[] = [
  { key: "title", labelKey: "columns.title", visible: true, width: 240 },
  { key: "artist", labelKey: "columns.artist", visible: true, width: 180 },
  { key: "album", labelKey: "columns.album", visible: true, width: 200 },
  { key: "duration", labelKey: "columns.duration", visible: true, width: 120 },
  { key: "bitrate", labelKey: "columns.bitrate", visible: true, width: 120 },
  { key: "rating", labelKey: "columns.rating", visible: true, width: 110 },
];

const tracks = [
  {
    id: "t1",
    title: "Midnight Avenue",
    artist: "Kara Lines",
    album: "City Circuit",
    duration: "4:12",
    bitrate: "320 kbps",
    rating: "5",
  },
  {
    id: "t2",
    title: "Glass Elevator",
    artist: "Nova Drift",
    album: "Signal Bloom",
    duration: "3:41",
    bitrate: "FLAC",
    rating: "4",
  },
  {
    id: "t3",
    title: "Safe Harbor",
    artist: "Southbound",
    album: "Low Tide",
    duration: "5:06",
    bitrate: "256 kbps",
    rating: "3",
  },
  {
    id: "t4",
    title: "Parallel Lines",
    artist: "Civic Night",
    album: "North End",
    duration: "2:58",
    bitrate: "FLAC",
    rating: "4",
  },
  {
    id: "t5",
    title: "Signal Coast",
    artist: "Wired Atlas",
    album: "Harborlight",
    duration: "3:22",
    bitrate: "320 kbps",
    rating: "4",
  },
  {
    id: "t6",
    title: "Afterglow Arcade",
    artist: "Juno Slate",
    album: "Neon Hours",
    duration: "4:05",
    bitrate: "FLAC",
    rating: "5",
  },
  {
    id: "t7",
    title: "Riverstone",
    artist: "Pine & West",
    album: "Granite Lines",
    duration: "3:57",
    bitrate: "256 kbps",
    rating: "3",
  },
  {
    id: "t8",
    title: "Lumen Drive",
    artist: "Arc Spring",
    album: "City Circuit",
    duration: "2:47",
    bitrate: "320 kbps",
    rating: "4",
  },
  {
    id: "t9",
    title: "Crimson Radio",
    artist: "Violet Transit",
    album: "Signal Bloom",
    duration: "3:18",
    bitrate: "FLAC",
    rating: "5",
  },
  {
    id: "t10",
    title: "Open Air",
    artist: "Southbound",
    album: "Low Tide",
    duration: "4:44",
    bitrate: "256 kbps",
    rating: "4",
  },
  {
    id: "t11",
    title: "Atlas Room",
    artist: "Kara Lines",
    album: "City Circuit",
    duration: "3:33",
    bitrate: "320 kbps",
    rating: "5",
  },
  {
    id: "t12",
    title: "Signal Drift",
    artist: "Nova Drift",
    album: "Signal Bloom",
    duration: "3:09",
    bitrate: "FLAC",
    rating: "4",
  },
  {
    id: "t13",
    title: "Quiet Harbor",
    artist: "Southbound",
    album: "Low Tide",
    duration: "5:12",
    bitrate: "256 kbps",
    rating: "3",
  },
  {
    id: "t14",
    title: "Civic Light",
    artist: "Civic Night",
    album: "North End",
    duration: "2:53",
    bitrate: "320 kbps",
    rating: "4",
  },
  {
    id: "t15",
    title: "Beacon Loop",
    artist: "Wired Atlas",
    album: "Harborlight",
    duration: "3:51",
    bitrate: "FLAC",
    rating: "5",
  },
  {
    id: "t16",
    title: "Silverline",
    artist: "Juno Slate",
    album: "Neon Hours",
    duration: "4:20",
    bitrate: "320 kbps",
    rating: "4",
  },
  {
    id: "t17",
    title: "Westbound",
    artist: "Pine & West",
    album: "Granite Lines",
    duration: "3:36",
    bitrate: "256 kbps",
    rating: "3",
  },
  {
    id: "t18",
    title: "Night Signal",
    artist: "Arc Spring",
    album: "City Circuit",
    duration: "2:59",
    bitrate: "320 kbps",
    rating: "4",
  },
  {
    id: "t19",
    title: "Terminal Echo",
    artist: "Violet Transit",
    album: "Signal Bloom",
    duration: "3:27",
    bitrate: "FLAC",
    rating: "5",
  },
  {
    id: "t20",
    title: "Tidepool",
    artist: "Southbound",
    album: "Low Tide",
    duration: "4:02",
    bitrate: "256 kbps",
    rating: "4",
  },
  {
    id: "t21",
    title: "Highline",
    artist: "Kara Lines",
    album: "City Circuit",
    duration: "3:48",
    bitrate: "320 kbps",
    rating: "5",
  },
  {
    id: "t22",
    title: "Bloomfield",
    artist: "Nova Drift",
    album: "Signal Bloom",
    duration: "3:12",
    bitrate: "FLAC",
    rating: "4",
  },
  {
    id: "t23",
    title: "Low Lantern",
    artist: "Southbound",
    album: "Low Tide",
    duration: "5:21",
    bitrate: "256 kbps",
    rating: "3",
  },
  {
    id: "t24",
    title: "Northbound",
    artist: "Civic Night",
    album: "North End",
    duration: "2:46",
    bitrate: "320 kbps",
    rating: "4",
  },
];

const formatRating = (value: string) => {
  const rating = Math.max(0, Math.min(5, Number(value)));
  return "★".repeat(rating) + "☆".repeat(5 - rating);
};

function App() {
  const [view, setView] = useState<"library" | "inbox" | "settings">(
    "library"
  );
  const isLibrary = view === "library";
  const isInbox = view === "inbox";
  const isSettings = view === "settings";
  const title = isLibrary
    ? t("header.library")
    : isInbox
    ? t("header.inbox")
    : t("header.settings");
  const [isDragging, setIsDragging] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dragCounter = useRef(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return window.localStorage.getItem("muro-theme") ?? "light";
  });
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = window.localStorage.getItem("muro-locale");
    return stored && isLocale(stored) ? stored : "en";
  });
  const [columns, setColumns] = useState(() => {
    if (typeof window === "undefined") {
      return baseColumns;
    }

    const stored = window.localStorage.getItem("muro-columns");
    if (!stored) {
      return baseColumns;
    }

    try {
      const parsed = JSON.parse(stored) as typeof baseColumns;
      return baseColumns.map((column) => {
        const saved = parsed.find((item) => item.key === column.key);
        return saved ? { ...column, ...saved, labelKey: column.labelKey } : column;
      });
    } catch {
      return baseColumns;
    }
  });
  const [showColumns, setShowColumns] = useState(false);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState({ x: 0, y: 0 });
  const columnsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [debugNotice, setDebugNotice] = useState("Drag diagnostics ready.");
  const [menuSelection, setMenuSelection] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 220;
    }

    const stored = window.localStorage.getItem("muro-sidebar-width");
    return stored ? Number(stored) || 220 : 220;
  });
  const [detailWidth, setDetailWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 320;
    }

    const stored = window.localStorage.getItem("muro-detail-width");
    const parsed = stored ? Number(stored) : NaN;
    const saved = Number.isNaN(parsed) ? 320 : parsed;
    return saved <= 56 ? 320 : saved;
  });
  const [detailCollapsed, setDetailCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("muro-detail-collapsed") === "true";
  });
  const detailWidthRef = useRef(detailWidth);
  const [isPlaying, setIsPlaying] = useState(true);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [seekPosition, setSeekPosition] = useState(34);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns]
  );
  const contextMenu = useMemo(() => {
    if (typeof document === "undefined" || !openMenuId) {
      return null;
    }

    return createPortal(
      <div
        className="fixed z-50 w-44 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2 text-left text-sm shadow-[var(--shadow-md)]"
        onClick={(event) => event.stopPropagation()}
        style={{ left: menuPosition.x, top: menuPosition.y }}
      >
        {menuSelection.length > 1 && (
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {menuSelection.length} selected
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
  }, [menuPosition.x, menuPosition.y, menuSelection.length, openMenuId]);
  const columnsMenu = useMemo(() => {
    if (typeof document === "undefined" || !showColumns) {
      return null;
    }

    // @ts-ignore
    return createPortal(
      <div
        className="fixed z-50 w-52 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm shadow-[var(--shadow-md)]"
        onClick={(event) => event.stopPropagation()}
        style={{ left: columnsMenuPosition.x, top: columnsMenuPosition.y }}
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
                onChange={() => toggleColumn(column.key)}
                type="checkbox"
              />
              <span>{t(column.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>,
      document.body
    );
  }, [columns, columnsMenuPosition.x, columnsMenuPosition.y, showColumns]);
  const tableWidth = useMemo(() => {
    const actionColumnWidth = 64;
    return (
      visibleColumns.reduce((total, column) => total + column.width, 0) +
      actionColumnWidth
    );
  }, [visibleColumns]);
  const resizeState = useRef<
    | {
        key: string;
        startX: number;
        startWidth: number;
      }
    | null
  >(null);
  const panelResizeState = useRef<
    | {
        side: "left" | "right";
        startX: number;
        startWidth: number;
      }
    | null
  >(null);

  const toggleColumn = (key: string) => {
    setColumns((current) =>
      current.map((column) =>
        column.key === key
          ? { ...column, visible: !column.visible }
          : column
      )
    );
  };

  const autoFitColumn = (key: string) => {
    const column = columns.find((item) => item.key === key);
    if (!column) {
      return;
    }

    const maxLength = Math.max(
      t(column.labelKey as typeof column.labelKey).length,
      ...tracks.map((track) => String(track[key as keyof typeof track]).length)
    );
    const nextWidth = Math.min(360, Math.max(120, maxLength * 8 + 48));

    setColumns((current) =>
      current.map((item) =>
        item.key === key ? { ...item, width: nextWidth } : item
      )
    );
  };

  const handleImportPaths = async (paths: string[]) => {
    if (paths.length === 0) {
      return;
    }

    try {
      const count = await invoke<number>("import_files", { paths });
      setDebugNotice(`Drop paths (tauri): ${count}`);
      console.info("Import stub accepted files:", count);
    } catch (error) {
      setDebugNotice("Import stub failed or not in Tauri. Check console.");
      console.error("Import stub failed:", error);
    }
  };

  const handleDropImport = async (event: ReactDragEvent<HTMLDivElement>) => {
    const droppedFiles = Array.from(event.dataTransfer.files);
    const paths = droppedFiles
      .map((file) => (file as unknown as { path?: string }).path ?? file.name)
      .filter(Boolean);

    await handleImportPaths(paths);
  };

  const extractPaths = (payload: unknown): string[] => {
    setDebugNotice(`Drop payload: ${JSON.stringify(payload)}`);
    if (Array.isArray(payload)) {
      return payload.map((item) => String(item));
    }

    if (payload && typeof payload === "object") {
      const candidate =
        (payload as { paths?: unknown; files?: unknown }).paths ??
        (payload as { files?: unknown }).files;
      if (Array.isArray(candidate)) {
        return candidate.map((item) => String(item));
      }
    }

    return [];
  };

  const handleRowSelect = (
    index: number,
    id: string,
    options: { isMetaKey?: boolean; isShiftKey?: boolean } = {}
  ) => {
    const isMetaKey = options.isMetaKey ?? false;
    const isShiftKey = options.isShiftKey ?? false;

    setSelectedIds((current) => {
      const next = new Set(current);

      if (isShiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i += 1) {
          next.add(tracks[i].id);
        }
        setLastSelectedIndex(index);
      } else if (isMetaKey) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        setLastSelectedIndex(index);
      } else {
        next.clear();
        next.add(id);
        setLastSelectedIndex(index);
      }

      return next;
    });
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeState.current) {
        return;
      }

      const { key, startX, startWidth } = resizeState.current;
      const delta = event.clientX - startX;
      const nextWidth = Math.max(80, startWidth + delta);

      setColumns((current) =>
        current.map((column) =>
          column.key === key ? { ...column, width: nextWidth } : column
        )
      );
    };

    const handlePanelResize = (event: MouseEvent) => {
      if (!panelResizeState.current) {
        return;
      }

      const { side, startX, startWidth } = panelResizeState.current;
      const delta = event.clientX - startX;
      const nextWidth = Math.max(
        200,
        side === "right" ? startWidth - delta : startWidth + delta
      );

      if (side === "left") {
        setSidebarWidth(Math.min(360, nextWidth));
      } else {
        setDetailWidth(Math.min(420, nextWidth));
      }
    };

    const handleMouseUp = () => {
      resizeState.current = null;
      panelResizeState.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousemove", handlePanelResize);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", handlePanelResize);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleDragEnter = () => {
      setDebugNotice("Window event: dragenter");
      setIsDragging(true);
    };
    const handleDragLeave = () => {
      setDebugNotice("Window event: dragleave");
      setIsDragging(false);
    };
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(true);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("muro-columns", JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("muro-theme", theme);
  }, [theme]);

  useEffect(() => {
    setI18nLocale(locale);

    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("muro-locale", locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("muro-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("muro-detail-width", String(detailWidth));
  }, [detailWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      "muro-detail-collapsed",
      String(detailCollapsed)
    );
  }, [detailCollapsed]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (detailCollapsed) {
      return;
    }

    detailWidthRef.current = detailWidth;
  }, [detailCollapsed, detailWidth]);

  useEffect(() => {
    let unlistenDrop: UnlistenFn | null = null;
    let unlistenHover: UnlistenFn | null = null;
    let unlistenCancel: UnlistenFn | null = null;
    let unlistenDragDrop: (() => void) | null = null;
    let unlistenDebug: UnlistenFn | null = null;

    const setup = async () => {
      let currentWindow;
      try {
        currentWindow = getCurrentWindow();
      } catch (error) {
        setDebugNotice("Drag diagnostics: no Tauri window.");
        console.info("Drag diagnostics: no Tauri window", error);
        return;
      }
      const dragDropHandler = (event: {
        type?: string;
        payload?: unknown;
        paths?: unknown;
        files?: unknown;
      }) => {
        const rawType = event.type ?? "";
        const inferredPayload = event.payload ?? event.paths ?? event.files;
        const inferredPaths = extractPaths(inferredPayload);
        const inferredType = rawType || (inferredPaths.length ? "drop" : "hover");

        setDebugNotice(`Window drag event: ${inferredType}`);

        if (["hover", "enter", "over", "dragover"].includes(inferredType)) {
          setIsDragging(true);
          return;
        }
        if (["cancel", "leave", "dragleave"].includes(inferredType)) {
          setIsDragging(false);
          return;
        }
        if (inferredType === "drop") {
          setIsDragging(false);
          if (inferredPaths.length) {
            void handleImportPaths(inferredPaths);
          }
        }
      };

      const windowWithDrag = currentWindow as unknown as {
        onDragDropEvent?: (handler: (event: { type: string; payload?: unknown }) => void) => Promise<() => void>;
      };

      try {
        if (windowWithDrag.onDragDropEvent) {
          unlistenDragDrop = await windowWithDrag.onDragDropEvent(dragDropHandler);
          setDebugNotice("Drag diagnostics: window event hooked.");
        }

        unlistenDebug = await listen<string>("muro://drag-drop-debug", (event) => {
          setDebugNotice(`Rust drag event: ${event.payload}`);
        });

        unlistenDrop = await listen<unknown>("tauri://file-drop", (event) => {
          setIsDragging(false);
          setDebugNotice(`Event: file-drop ${JSON.stringify(event.payload)}`);
          const paths = extractPaths(event.payload);
          if (paths.length) {
            void handleImportPaths(paths);
          }
        });
        unlistenHover = await listen("tauri://file-drop-hover", () => {
          setIsDragging(true);
          setDebugNotice("Event: file-drop-hover");
        });
        unlistenCancel = await listen("tauri://file-drop-cancelled", () => {
          setIsDragging(false);
          setDebugNotice("Event: file-drop-cancelled");
        });
        setDebugNotice("Drag diagnostics: global events hooked.");
      } catch (error) {
        setDebugNotice("Drag diagnostics: listener failed.");
        console.error("Drag diagnostics: listener failed", error);
      }
    };

    void setup();

    return () => {
      unlistenDragDrop?.();
      unlistenDebug?.();
      unlistenDrop?.();
      unlistenHover?.();
      unlistenCancel?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(new Set(tracks.map((track) => track.id)));
        setLastSelectedIndex(tracks.length - 1);
      }

      if (event.key === "Escape") {
        setSelectedIds(new Set());
        setLastSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]"
      onClick={() => {
        setOpenMenuId(null);
        setMenuSelection([]);
        setShowColumns(false);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        dragCounter.current += 1;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);
        if (dragCounter.current === 0) {
          setIsDragging(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={async (event) => {
        event.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
        await handleDropImport(event);
      }}
    >
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-[rgba(15,23,42,0.35)]">
          <div className="rounded-[var(--radius-lg)] border border-[var(--accent)] bg-[var(--panel-bg)] px-6 py-4 text-sm font-semibold text-[var(--accent)] shadow-[var(--shadow-lg)]">
            Drop folders or audio files to import.
          </div>
        </div>
      )}
      <div className="flex h-screen flex-col pb-28">
        <div
          className="relative grid flex-1 gap-0 overflow-hidden"
          style={{
            gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr) ${detailWidth}px`,
          }}
        >
        <div
          className="absolute left-0 top-0 z-20 h-full w-2 cursor-col-resize bg-transparent transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-border)]"
          style={{ left: sidebarWidth - 1 }}
          onMouseDown={(event) => {
            event.preventDefault();
            panelResizeState.current = {
              side: "left",
              startX: event.clientX,
              startWidth: sidebarWidth,
            };
          }}
          role="presentation"
        />
        <div
          className="absolute top-0 z-20 h-full w-2 cursor-col-resize bg-transparent transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-border)]"
          style={{ right: detailWidth - 1 }}
          onMouseDown={(event) => {
            event.preventDefault();
            panelResizeState.current = {
              side: "right",
              startX: event.clientX,
              startWidth: detailWidth,
            };
          }}
          role="presentation"
        />
        <aside className="flex h-full flex-col overflow-y-auto border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 pb-32">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {t("app.name")}
          </div>
          {debugNotice && (
            <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
              {debugNotice}
            </div>
          )}
          <div className="mt-6 space-y-2 text-sm">
            <button
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
                isLibrary
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("library")}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {t("nav.library")}
              </span>
              <span
                className={`text-xs ${
                  isLibrary ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"
                }`}
              >
                124
              </span>
            </button>
            <button
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
                isInbox
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("inbox")}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                {t("nav.inbox")}
              </span>
              <span
                className={`text-xs ${
                  isInbox
                    ? "font-semibold text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                12
              </span>
            </button>
            <button
              className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
              type="button"
            >
              <span className="flex items-center gap-2">
                <ListMusic className="h-4 w-4" />
                {t("nav.playlists")}
              </span>
              <span className="text-xs text-[var(--text-muted)]">8</span>
            </button>
            <button
              className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-left font-medium transition-colors duration-[var(--motion-fast)] ${
                isSettings
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("settings")}
              type="button"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t("nav.settings")}
              </span>
            </button>
          </div>
          <div
            className={`mt-auto rounded-[var(--radius-md)] border border-dashed px-3 py-4 text-xs shadow-[var(--shadow-sm)] transition duration-[var(--motion-fast)] ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-muted)]"
            }`}
          >
            {isDragging ? t("drop.active") : t("drop.prompt")}
          </div>
        </aside>

        <main className="flex h-full min-w-0 flex-col overflow-y-auto pb-32">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-[var(--text-muted)]">
                {isLibrary
                  ? t("header.library.subtitle")
                  : isInbox
                  ? t("header.inbox.subtitle")
                  : t("header.settings.subtitle")}
              </p>
            </div>
            {!isSettings && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm shadow-[var(--shadow-sm)]">
                  <Search className="h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    className="w-40 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    placeholder={t("search.placeholder")}
                  />
                </div>
                <div className="relative">
                  <button
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setColumnsMenuPosition({ x: rect.left, y: rect.bottom + 8 });
                      setShowColumns((current) => !current);
                    }}
                    ref={columnsButtonRef}
                    type="button"
                  >
                    <Columns2 className="h-4 w-4" />
                    {t("columns.label")}
                  </button>
                </div>
              </div>
            )}
          </header>
          {contextMenu}
          {columnsMenu}

          <section className="flex-1 bg-[var(--panel-bg)] px-6 pb-6 pt-4">
            {isSettings ? (
              <div className="h-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-[var(--shadow-sm)]">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {t("settings.appearance")}
                </div>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm font-medium">{t("settings.theme")}</label>
                  <div className="relative w-64">
                    <select
                      className="w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                      onChange={(event) => setTheme(event.target.value)}
                      value={theme}
                    >
                      {themes.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t("settings.theme.help")}
                  </p>
                  <label className="mt-4 text-sm font-medium">
                    {t("settings.language")}
                  </label>
                  <div className="relative w-64">
                    <select
                      className="w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                      onChange={(event) =>
                        setLocale(event.target.value as Locale)
                      }
                      value={locale}
                    >
                      {localeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t("settings.language.help")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isInbox && (
                  <div className="mb-4 space-y-3">
                    <div className="rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
                      <span className="font-medium">{t("header.inbox")}</span>
                      <span className="ml-2 text-[var(--text-muted)]">
                        Tag, edit metadata, and move tracks into the main library when ready.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        {t("inbox.review")}
                      </div>
                      <button className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)]">
                        {t("inbox.accept")}
                      </button>
                      <button className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]">
                        {t("inbox.reject")}
                      </button>
                      <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{t("inbox.selected")}</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedIds.size}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="min-w-0 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--panel-border)] shadow-[var(--shadow-sm)]">
                  <table
                    className="table-fixed text-left text-sm"
                    style={{ width: "100%", minWidth: tableWidth }}
                  >
                    <colgroup>
                      {visibleColumns.map((column) => (
                        <col key={column.key} style={{ width: column.width }} />
                      ))}
                      <col />
                    </colgroup>
                    <thead className="sticky top-0 bg-[var(--panel-muted)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      <tr>
                        {visibleColumns.map((column) => (
                          <th
                            key={column.key}
                            className="relative px-4 py-3 pr-8"
                          >
                            <span className="block truncate">
                              {t(column.labelKey)}
                            </span>
                            <span className="absolute right-2 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded bg-[var(--panel-border)] opacity-70" />
                            <span
                              className="absolute right-0 top-0 h-full w-4 cursor-col-resize"
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                autoFitColumn(column.key);
                              }}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                resizeState.current = {
                                  key: column.key,
                                  startX: event.clientX,
                                  startWidth: column.width,
                                };
                              }}
                              role="presentation"
                            />
                          </th>
                        ))}
                        <th className="sticky right-0 z-10 min-w-12 bg-[var(--panel-muted)] px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.map((track, index) => (
                        <tr
                          key={track.id}
                          className={`group border-t border-[var(--panel-border)] hover:bg-[var(--panel-muted)] ${
                            selectedIds.has(track.id)
                              ? "bg-[var(--accent-soft)]"
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRowSelect(index, track.id, {
                              isMetaKey: event.metaKey || event.ctrlKey,
                              isShiftKey: event.shiftKey,
                            });
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!selectedIds.has(track.id)) {
                              handleRowSelect(index, track.id);
                              setMenuSelection([track.id]);
                            } else {
                              setMenuSelection(Array.from(selectedIds));
                            }
                            setMenuPosition({ x: event.clientX, y: event.clientY });
                            setOpenMenuId(track.id);
                          }}
                        >
                          {visibleColumns.map((column) => {
                            const value = track[column.key as keyof typeof track];
                            if (column.key === "rating") {
                              return (
                                <td
                                  key={`${track.id}-${column.key}`}
                                  className="px-4 py-3 text-sm text-[var(--text-muted)]"
                                  title={`${value} / 5`}
                                >
                                  <span className="tracking-[0.2em]">
                                    {formatRating(String(value))}
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={`${track.id}-${column.key}`}
                                className={`px-4 py-3 ${
                                  column.key === "title"
                                    ? "font-medium"
                                    : "text-[var(--text-muted)]"
                                }`}
                              >
                                <span className="block truncate">{value}</span>
                              </td>
                            );
                          })}
                          <td
                            className={`sticky right-0 z-10 px-4 py-3 text-right ${
                              selectedIds.has(track.id)
                                ? "bg-[var(--accent-soft)] group-hover:bg-[var(--panel-muted)]"
                                : "bg-[var(--panel-bg)] group-hover:bg-[var(--panel-muted)]"
                            }`}
                          >
                            <button
                              className="rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                const buttonRect =
                                  event.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  x: buttonRect.left,
                                  y: buttonRect.bottom + 6,
                                });
                                handleRowSelect(index, track.id);
                                setMenuSelection([track.id]);
                                setOpenMenuId((current) =>
                                  current === track.id ? null : track.id
                                );
                              }}
                              type="button"
                            >
                              •••
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </main>

        <aside className="flex h-full flex-col overflow-y-auto border-l border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 pb-32">
          <div
            className={`flex items-center ${
              detailCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!detailCollapsed && (
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                <Play className="h-3.5 w-3.5" />
                {t("panel.nowPlaying")}
              </div>
            )}
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--panel-border)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--panel-muted)]"
              onClick={() => {
                if (!detailCollapsed) {
                  detailWidthRef.current = detailWidth;
                  setDetailWidth(56);
                  setDetailCollapsed(true);
                } else {
                  setDetailWidth(detailWidthRef.current || 320);
                  setDetailCollapsed(false);
                }
              }}
              title={detailCollapsed ? "Expand panel" : "Collapse panel"}
              type="button"
            >
              {detailCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          {!detailCollapsed && (
            <>
              <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[var(--shadow-sm)]">
                <div className="text-sm font-semibold">Glass Elevator</div>
                <div className="text-xs text-[var(--text-muted)]">Nova Drift</div>
                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Signal Bloom • FLAC
                </div>
              </div>
              <div className="mt-6 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t("panel.queue")}
                </div>
                <div className="mt-3 space-y-3 text-sm">
                  {tracks.map((track) => (
                    <div
                      key={`${track.id}-queue`}
                      className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 shadow-[var(--shadow-sm)]"
                    >
                      <div className="font-medium">{track.title}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {track.artist}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-3 text-xs shadow-[var(--shadow-sm)]">
                <span className="flex items-center gap-2 text-[var(--text-muted)]">
                  <Speaker className="h-3.5 w-3.5" />
                  {t("panel.output")}
                </span>
                <span className="font-medium">{t("panel.output.device")}</span>
              </div>
            </>
          )}
        </aside>
        </div>
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="flex min-w-0 items-center gap-3 self-center">
              <div className="h-11 w-11 shrink-0 rounded-[var(--radius-sm)] bg-[var(--panel-muted)]" />
              <div className="min-w-0 text-sm">
                <div className="truncate font-semibold">Glass Elevator</div>
                <div className="truncate text-xs text-[var(--text-muted)]">
                  Nova Drift • Signal Bloom
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--motion-fast)] ${
                  shuffleEnabled
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-muted)]"
                }`}
                onClick={() => setShuffleEnabled((current) => !current)}
                title="Shuffle"
                type="button"
              >
                <Shuffle className="h-5 w-5" />
              </button>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
                title="Previous"
                type="button"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--panel-muted)] text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-border)]"
                onClick={() => setIsPlaying((current) => !current)}
                title={isPlaying ? "Pause" : "Play"}
                type="button"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </button>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
                title="Next"
                type="button"
              >
                <SkipForward className="h-5 w-5" />
              </button>
              <button
                className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[var(--motion-fast)] ${
                  repeatMode !== "off"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--panel-muted)]"
                }`}
                onClick={() =>
                  setRepeatMode((current) =>
                    current === "off" ? "all" : current === "all" ? "one" : "off"
                  )
                }
                title={
                  repeatMode === "off"
                    ? "Repeat"
                    : repeatMode === "all"
                    ? "Repeat all"
                    : "Repeat one"
                }
                type="button"
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-end gap-3 text-xs text-[var(--text-muted)] self-center">
              <Speaker className="h-4 w-4" />
              <input
                aria-label="Volume"
                className="h-1.5 w-28 cursor-pointer accent-[var(--accent)]"
                max={100}
                min={0}
                type="range"
                defaultValue={80}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
            <span>2:14</span>
            <input
              aria-label="Seek"
              className="h-1.5 w-full max-w-xl cursor-pointer accent-[var(--accent)]"
              max={100}
              min={0}
              onChange={(event) => setSeekPosition(Number(event.target.value))}
              type="range"
              value={seekPosition}
            />
            <span>4:01</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

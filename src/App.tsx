import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "graphite", label: "Graphite" },
  { id: "sage", label: "Sage" },
  { id: "ember", label: "Ember" },
  { id: "midnight", label: "Midnight" },
  { id: "ocean", label: "Ocean" },
];

const tracks = [
  {
    id: "t1",
    title: "Midnight Avenue",
    artist: "Kara Lines",
    album: "City Circuit",
    duration: "4:12",
    bitrate: "320 kbps",
  },
  {
    id: "t2",
    title: "Glass Elevator",
    artist: "Nova Drift",
    album: "Signal Bloom",
    duration: "3:41",
    bitrate: "FLAC",
  },
  {
    id: "t3",
    title: "Safe Harbor",
    artist: "Southbound",
    album: "Low Tide",
    duration: "5:06",
    bitrate: "256 kbps",
  },
  {
    id: "t4",
    title: "Parallel Lines",
    artist: "Civic Night",
    album: "North End",
    duration: "2:58",
    bitrate: "FLAC",
  },
];

function App() {
  const [view, setView] = useState<"library" | "inbox" | "settings">(
    "library"
  );
  const isLibrary = view === "library";
  const isInbox = view === "inbox";
  const isSettings = view === "settings";
  const title = isLibrary
    ? "Library"
    : isInbox
    ? "Inbox"
    : "Settings";
  const [isDragging, setIsDragging] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dragCounter = useRef(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [theme, setTheme] = useState("light");
  const [columns, setColumns] = useState([
    { key: "title", label: "Title", visible: true },
    { key: "artist", label: "Artist", visible: true },
    { key: "album", label: "Album", visible: true },
    { key: "duration", label: "Duration", visible: true },
    { key: "bitrate", label: "Bitrate", visible: true },
  ]);
  const [showColumns, setShowColumns] = useState(false);
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns]
  );

  const toggleColumn = (key: string) => {
    setColumns((current) =>
      current.map((column) =>
        column.key === key
          ? { ...column, visible: !column.visible }
          : column
      )
    );
  };

  const handleRowSelect = (
    event: MouseEvent<HTMLTableRowElement>,
    index: number,
    id: string
  ) => {
    const isMetaKey = event.metaKey || event.ctrlKey;
    const isShiftKey = event.shiftKey;

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
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]"
      data-theme={theme}
      onClick={() => setOpenMenuId(null)}
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
      onDrop={(event) => {
        event.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);
      }}
    >
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-[rgba(15,23,42,0.35)]">
          <div className="rounded-2xl border border-[var(--accent)] bg-[var(--panel-bg)] px-6 py-4 text-sm font-semibold text-[var(--accent)] shadow-xl">
            Drop folders or audio files to import.
          </div>
        </div>
      )}
      <div className="grid min-h-screen grid-cols-[220px_1fr_320px] gap-0">
        <aside className="flex h-full flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Muro Music
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <button
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium ${
                isLibrary
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("library")}
              type="button"
            >
              Library
              <span
                className={`text-xs ${
                  isLibrary ? "font-semibold text-[var(--accent)]" : "text-[var(--text-muted)]"
                }`}
              >
                124
              </span>
            </button>
            <button
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium ${
                isInbox
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("inbox")}
              type="button"
            >
              Inbox
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
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              type="button"
            >
              Playlists
              <span className="text-xs text-[var(--text-muted)]">8</span>
            </button>
            <button
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium ${
                isSettings
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
              }`}
              onClick={() => setView("settings")}
              type="button"
            >
              Settings
            </button>
          </div>
          <div
            className={`mt-auto rounded-xl border border-dashed px-3 py-4 text-xs transition ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-muted)]"
            }`}
          >
            {isDragging
              ? "Drop folders or audio files to import."
              : "Drag folders or tracks here to import."}
          </div>
        </aside>

        <main className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-[var(--text-muted)]">
                {isLibrary
                  ? "All tracks in one long list. Use columns to tune the view."
                  : isInbox
                  ? "Review and categorize new imports before accepting them into the library."
                  : "Personalize the app layout, themes, and preferences."}
              </p>
            </div>
            {!isSettings && (
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm">
                  <span className="mr-2 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Search
                  </span>
                  <input
                    className="w-56 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    placeholder="Title, artist, album"
                  />
                </div>
                <div className="relative">
                  <button
                    className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
                    onClick={() => setShowColumns((current) => !current)}
                    type="button"
                  >
                    Columns
                  </button>
                  {showColumns && (
                    <div className="absolute right-0 z-10 mt-2 w-52 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-sm shadow-lg">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Visible Columns
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
                            <span>{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>

          <section className="flex-1 overflow-hidden bg-[var(--panel-bg)] px-6 pb-6 pt-4">
            {isSettings ? (
              <div className="h-full overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Appearance
                </div>
                <div className="mt-4 grid gap-3">
                  <label className="text-sm font-medium">Theme</label>
                  <select
                    className="w-64 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    onChange={(event) => setTheme(event.target.value)}
                    value={theme}
                  >
                    {themes.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-muted)]">
                    Theme colors are driven by CSS variables and update instantly.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isInbox && (
                  <div className="mb-4 space-y-3">
                    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
                      <span className="font-medium">Inbox</span>
                      <span className="ml-2 text-[var(--text-muted)]">
                        Tag, edit metadata, and move tracks into the main library when ready.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        Review
                      </div>
                      <button className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white">
                        Accept to Library
                      </button>
                      <button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
                        Reject
                      </button>
                      <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>Selected</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {selectedIds.size}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="h-full overflow-auto rounded-xl border border-[var(--panel-border)]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[var(--panel-muted)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      <tr>
                        {visibleColumns.map((column) => (
                          <th key={column.key} className="px-4 py-3">
                            {column.label}
                          </th>
                        ))}
                        <th className="w-12 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tracks.map((track, index) => (
                        <tr
                          key={track.id}
                          className={`border-t border-[var(--panel-border)] hover:bg-[var(--panel-muted)] ${
                            selectedIds.has(track.id)
                              ? "bg-[var(--accent-soft)]"
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRowSelect(event, index, track.id);
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRowSelect(event, index, track.id);
                            setMenuPosition({ x: event.clientX, y: event.clientY });
                            setOpenMenuId(track.id);
                          }}
                        >
                          {visibleColumns.map((column) => {
                            const value = track[column.key as keyof typeof track];
                            return (
                              <td
                                key={`${track.id}-${column.key}`}
                                className={`px-4 py-3 ${
                                  column.key === "title"
                                    ? "font-medium"
                                    : "text-[var(--text-muted)]"
                                }`}
                              >
                                {value}
                              </td>
                            );
                          })}
                          <td className="relative px-4 py-3 text-right">
                            <button
                              className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] hover:bg-[var(--panel-muted)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                const buttonRect =
                                  event.currentTarget.getBoundingClientRect();
                                setMenuPosition({
                                  x: buttonRect.left,
                                  y: buttonRect.bottom + 6,
                                });
                                setOpenMenuId((current) =>
                                  current === track.id ? null : track.id
                                );
                              }}
                              type="button"
                            >
                              •••
                            </button>
                            {openMenuId === track.id && (
                              <div
                                className="fixed z-30 w-44 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2 text-left text-sm shadow-lg"
                                onClick={(event) => event.stopPropagation()}
                                style={{ left: menuPosition.x, top: menuPosition.y }}
                              >
                                <button className="w-full px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
                                  Play
                                </button>
                                <button className="w-full px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
                                  Play next
                                </button>
                                <button className="w-full px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
                                  Add to queue
                                </button>
                                <button className="w-full px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
                                  Add to playlist
                                </button>
                                <button className="w-full px-3 py-2 text-left hover:bg-[var(--panel-muted)]">
                                  Edit
                                </button>
                                <button className="w-full px-3 py-2 text-left text-red-600 hover:bg-[var(--panel-muted)]">
                                  Delete
                                </button>
                              </div>
                            )}
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

        <aside className="flex h-full flex-col border-l border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Now Playing
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
              <div className="text-sm font-semibold">Glass Elevator</div>
              <div className="text-xs text-[var(--text-muted)]">Nova Drift</div>
              <div className="mt-2 text-xs text-[var(--text-muted)]">
                Signal Bloom • FLAC
              </div>
            </div>
          </div>

          <div className="mt-6 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Queue
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {tracks.map((track) => (
                <div
                  key={`${track.id}-queue`}
                  className="rounded-lg border border-[var(--panel-border)] px-3 py-2"
                >
                  <div className="font-medium">{track.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {track.artist}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-3 text-xs">
            <span className="text-[var(--text-muted)]">Output</span>
            <span className="font-medium">Built-in Speakers</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;

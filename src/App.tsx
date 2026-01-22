import { useMemo, useRef, useState } from "react";

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
  const [view, setView] = useState<"library" | "arrivals">("library");
  const isLibrary = view === "library";
  const title = isLibrary ? "Library" : "New Arrivals";
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
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

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]"
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
          <div className="rounded-2xl border border-[var(--accent)] bg-white/95 px-6 py-4 text-sm font-semibold text-[var(--accent)] shadow-xl">
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
                isLibrary
                  ? "text-[var(--text-primary)] hover:bg-[var(--panel-muted)]"
                  : "bg-[var(--accent-soft)] text-[var(--accent)]"
              }`}
              onClick={() => setView("arrivals")}
            >
              New Arrivals
              <span
                className={`text-xs ${
                  isLibrary ? "text-[var(--text-muted)]" : "font-semibold text-[var(--accent)]"
                }`}
              >
                12
              </span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
              Playlists
              <span className="text-xs text-[var(--text-muted)]">8</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
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
                  : "Review and categorize new imports before accepting them into the library."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-[var(--panel-border)] bg-white px-3 py-2 text-sm">
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
          </header>

          <section className="flex-1 overflow-hidden bg-[var(--panel-bg)] px-6 pb-6 pt-4">
            {!isLibrary && (
              <div className="mb-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm">
                <span className="font-medium">New Arrivals</span>
                <span className="ml-2 text-[var(--text-muted)]">
                  Tag, edit metadata, and move tracks into the main library when ready.
                </span>
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
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track) => (
                    <tr
                      key={track.id}
                      className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-muted)]"
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

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
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="grid min-h-screen grid-cols-[220px_1fr_320px] gap-0">
        <aside className="flex h-full flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Muro Music
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <button className="flex w-full items-center justify-between rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-left font-medium text-[var(--accent)]">
              Library
              <span className="text-xs font-semibold text-[var(--accent)]">124</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
              New Arrivals
              <span className="text-xs text-[var(--text-muted)]">12</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
              Playlists
              <span className="text-xs text-[var(--text-muted)]">8</span>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
              Settings
            </button>
          </div>
          <div className="mt-auto rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-4 text-xs text-[var(--text-muted)]">
            Drag folders or tracks here to import.
          </div>
        </aside>

        <main className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">Library</h1>
              <p className="text-xs text-[var(--text-muted)]">
                All tracks in one long list. Use columns to tune the view.
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
              <button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--panel-muted)]">
                Columns
              </button>
            </div>
          </header>

          <section className="flex-1 overflow-hidden bg-[var(--panel-bg)] px-6 pb-6 pt-4">
            <div className="h-full overflow-auto rounded-xl border border-[var(--panel-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--panel-muted)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Artist</th>
                    <th className="px-4 py-3">Album</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Bitrate</th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track) => (
                    <tr
                      key={track.id}
                      className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-muted)]"
                    >
                      <td className="px-4 py-3 font-medium">{track.title}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {track.artist}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {track.album}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {track.duration}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {track.bitrate}
                      </td>
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

import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { DetailPanel } from "./components/layout/DetailPanel";
import { LibraryHeader } from "./components/layout/LibraryHeader";
import { PlayerBar } from "./components/layout/PlayerBar";
import { SettingsPanel } from "./components/layout/SettingsPanel";
import { Sidebar } from "./components/layout/Sidebar";
import { ColumnsMenu } from "./components/library/ColumnsMenu";
import { InboxBanner } from "./components/library/InboxBanner";
import { TrackTable } from "./components/library/TrackTable";
import { ContextMenu } from "./components/ui/ContextMenu";
import { DragOverlay } from "./components/ui/DragOverlay";
import { useLibraryCommands } from "./hooks/useLibraryCommands";
import { useLibraryView, type LibraryView } from "./hooks/useLibraryView";
import { initialInboxTracks, initialTracks, themes } from "./data/library";
import { useAppPreferences } from "./hooks/useAppPreferences";
import { useColumns } from "./hooks/useColumns";
import { useColumnsMenu } from "./hooks/useColumnsMenu";
import { useContextMenu } from "./hooks/useContextMenu";
import { useDetailPanel } from "./hooks/useDetailPanel";
import { useNativeDrag } from "./hooks/useNativeDrag";
import { usePlaylistDrag } from "./hooks/usePlaylistDrag";
import { usePlayerState } from "./hooks/usePlayerState";
import { useSelection } from "./hooks/useSelection";
import { useSidebarPanel } from "./hooks/useSidebarPanel";
import { useSidebarData } from "./hooks/useSidebarData";
import { useTrackRatings } from "./hooks/useTrackRatings";
import { localeOptions } from "./i18n";
import { backfillSearchText } from "./utils/tauriDb";
import type { Playlist } from "./types/library";

function App() {
  const [view, setView] = useState<LibraryView>("library");
  const [tracks, setTracks] = useState(() => initialTracks);
  const [inboxTracks, setInboxTracks] = useState(() => initialInboxTracks);
  const { isInbox, isSettings, subtitle, title } = useLibraryView(view);

  const { locale, setLocale, setTheme, theme } = useAppPreferences();
  const displayedTracks = isInbox ? inboxTracks : tracks;
  const { selectedIds, activeIndex, handleRowSelect, selectAll, clearSelection } =
    useSelection(displayedTracks);
  const { autoFitColumn, columns, handleColumnResize, toggleColumn } = useColumns({
    tracks,
  });
  const { closeMenu, menuPosition, menuSelection, openForRow, openMenuId } =
    useContextMenu({
      selectedIds,
      onSelectRow: handleRowSelect,
    });
  const {
    closeMenu: closeColumnsMenu,
    isOpen: showColumns,
    position: columnsMenuPosition,
    toggleAt: toggleColumnsMenu,
  } = useColumnsMenu();
  const [playlists, setPlaylists] = useState<Playlist[]>(() => [
    { id: "p-01", name: "Late Night Routes", trackIds: ["t1", "t4"] },
    { id: "p-02", name: "Studio Favorites", trackIds: ["t2"] },
    { id: "p-03", name: "Inbox Review", trackIds: [] },
    { id: "p-04", name: "Foggy Morning", trackIds: ["t3", "t6"] },
  ]);
  const { sidebarWidth, startSidebarResize } = useSidebarPanel();
  const [dbPath, setDbPath] = useState("");
  const [backfillPending, setBackfillPending] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const {
    detailCollapsed,
    detailWidth,
    startDetailResize,
    toggleDetailCollapsed,
  } = useDetailPanel();
  const {
    isPlaying,
    repeatMode,
    seekPosition,
    setSeekPosition,
    shuffleEnabled,
    togglePlay,
    toggleRepeat,
    toggleShuffle,
  } = usePlayerState();

  const { handleRatingChange } = useTrackRatings({ setTracks });

  const { handleImportPaths, handlePlaylistDrop } = useLibraryCommands({
    setPlaylists,
    setInboxTracks,
  });

  const {
    dragIndicator,
    draggingPlaylistId,
    isImportDragAllowed,
    isInternalDrag,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
    onPlaylistDropEvent,
    onRowMouseDown,
  } = usePlaylistDrag({ selectedIds, onDropToPlaylist: handlePlaylistDrop });

  const sidebarProps = useSidebarData({
    view,
    tracksCount: tracks.length,
    inboxCount: inboxTracks.length,
    playlists,
    draggingPlaylistId,
    onViewChange: setView,
    onPlaylistDrop: onPlaylistDropEvent,
    onPlaylistDragEnter,
    onPlaylistDragLeave,
    onPlaylistDragOver,
  });

  const { isDragging, nativeDropStatus } = useNativeDrag(
    handleImportPaths,
    isImportDragAllowed
  );

  const handleRowContextMenu = useCallback(
    (
      event: React.MouseEvent,
      trackId: string,
      index: number,
      isSelected: boolean
    ) => {
      openForRow(event, trackId, index, isSelected);
    },
    [openForRow]
  );

  useEffect(() => {
    if (!isInternalDrag) {
      document.body.style.userSelect = "";
      return;
    }

    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = "";
    };
  }, [isInternalDrag]);

  const handleBackfillSearchText = useCallback(async () => {
    if (!dbPath.trim()) {
      setBackfillStatus("Enter a database path to run the backfill.");
      return;
    }

    try {
      setBackfillPending(true);
      setBackfillStatus("Running backfill...");
      const updated = await backfillSearchText(dbPath.trim());
      setBackfillStatus(`Updated ${updated} tracks.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Backfill failed.";
      setBackfillStatus(message);
    } finally {
      setBackfillPending(false);
    }
  }, [dbPath]);

  return (
    <div
      className="h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]"
      onClick={() => {
        closeMenu();
        closeColumnsMenu();
      }}
    >
      <DragOverlay
        isDragging={isDragging}
        nativeDropStatus={nativeDropStatus}
        dragIndicator={dragIndicator}
        isInternalDrag={isInternalDrag}
      />
      <div className="flex h-screen flex-col pb-28">
        <AppLayout
          sidebarWidth={sidebarWidth}
          detailWidth={detailWidth}
          onSidebarResizeStart={startSidebarResize}
          onDetailResizeStart={startDetailResize}
          sidebar={
            <Sidebar
              {...sidebarProps}
            />
          }
          main={
            <main className="flex h-full min-w-0 flex-col overflow-hidden pb-0">
              <LibraryHeader
                title={title}
                subtitle={subtitle}
                isSettings={isSettings}
                onColumnsButtonClick={toggleColumnsMenu}
              />
              <ContextMenu
                isOpen={Boolean(openMenuId)}
                position={menuPosition}
                selectionCount={menuSelection.length}
              />
              <ColumnsMenu
                isOpen={showColumns}
                position={columnsMenuPosition}
                columns={columns}
                onToggleColumn={toggleColumn}
              />
              <section className="flex min-h-0 flex-1 flex-col bg-[var(--panel-bg)] px-6 pb-4 pt-4">
                {isSettings ? (
                  <SettingsPanel
                    theme={theme}
                    locale={locale}
                    themes={themes}
                    localeOptions={localeOptions}
                    dbPath={dbPath}
                    backfillPending={backfillPending}
                    backfillStatus={backfillStatus}
                    onThemeChange={setTheme}
                    onLocaleChange={setLocale}
                    onDbPathChange={setDbPath}
                    onBackfillSearchText={handleBackfillSearchText}
                  />
                ) : (
                  <>
                    {isInbox && (
                      <InboxBanner selectedCount={selectedIds.size} />
                    )}
                    <TrackTable
                      tracks={displayedTracks}
                      columns={columns}
                      selectedIds={selectedIds}
                      activeIndex={activeIndex}
                      onRowSelect={handleRowSelect}
                      onRowMouseDown={onRowMouseDown}
                      onRowContextMenu={handleRowContextMenu}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      onColumnResize={handleColumnResize}
                      onColumnAutoFit={autoFitColumn}
                      onRatingChange={handleRatingChange}
                    />
                  </>
                )}
              </section>
            </main>
          }
          detail={
            <DetailPanel
              detailCollapsed={detailCollapsed}
              onToggleCollapsed={() => {
                toggleDetailCollapsed();
              }}
              queueTracks={tracks}
            />
          }
        />
        <PlayerBar
          isPlaying={isPlaying}
          shuffleEnabled={shuffleEnabled}
          repeatMode={repeatMode}
          seekPosition={seekPosition}
          onTogglePlay={togglePlay}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeekChange={setSeekPosition}
        />
      </div>
    </div>
  );
}

export default App;

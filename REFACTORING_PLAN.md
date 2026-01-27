# Refactoring Plan: Muro Music

## Executive Summary

The codebase has grown organically and now has maintainability issues centered around **App.tsx (1,184 lines)** acting as a monolith. This plan addresses separation of concerns through targeted extractions.

---

## Critical Issues Identified

| Issue | Location | Lines | Severity |
|-------|----------|-------|----------|
| Monolithic root component | `App.tsx` | 1,184 | Critical |
| Mixed API concerns | `utils/tauriDb.ts` | 205 | High |
| Large settings component | `components/layout/SettingsPanel.tsx` | 349 | Medium |
| Large table component | `components/library/TrackTable.tsx` | 384 | Medium |
| Large queue component | `components/layout/QueuePanel.tsx` | 364 | Medium |
| Large analysis modal | `components/ui/AnalysisModal.tsx` | 420 | Medium |

---

## Phase 1: Extract Utilities (Low Risk)

### 1.1 Create `utils/trackSorting.ts`
**Extract from:** `App.tsx` lines 43-91

```
Functions to extract:
- getSortableValue(track, key) - Gets comparable value from track
- compareSortValues(left, right) - Compares two sortable values
```

### 1.2 Create `utils/viewRouting.ts`
**Extract from:** `App.tsx` lines 93-98

```
Functions to extract:
- getPathForView(view) - Maps library view to URL path
```

### 1.3 Create `utils/dbPath.ts`
**Extract from:** `App.tsx` lines 763-770 (duplicated logic)

```
Functions to extract:
- resolveDbPath(dbPath, dbFileName) - Resolves full database path
```

### 1.4 Split `utils/tauriDb.ts` into three files

**Create `utils/database.ts`** - Database CRUD operations:
- `loadTracks`, `loadPlaylists`
- `acceptTracks`, `rejectTracks`, `unacceptTracks`
- `clearTracks`
- `createPlaylist`, `deletePlaylist`
- `addTracksToPlaylist`, `removeLastTracksFromPlaylist`
- `backfillSearchText`, `backfillCoverArt`

**Create `utils/playbackApi.ts`** - Playback control (Tauri IPC):
- `playbackPlay`, `playbackPause`, `playbackStop`, `playbackToggle`
- `playbackPlayFile`, `playbackSeek`
- `playbackSetVolume`, `playbackSetSeekMode`
- `playbackGetState`, `playbackIsFinished`

**Create `utils/importApi.ts`** - File import:
- `importFiles`
- `importedTrackToTrack` (type conversion)

---

## Phase 2: Extract Hooks (Medium Risk)

### 2.1 Create `hooks/usePlaybackControls.ts`
**Extract from:** `App.tsx` lines 277-406

```
Responsibilities:
- getNextPlayableTrack() - Queue navigation logic
- handleSkipPrevious() - Skip to previous track
- handleSkipNext() - Skip to next track
- toggleShuffle() - Toggle shuffle mode
- toggleRepeat() - Cycle repeat modes

Returns:
- { handleSkipPrevious, handleSkipNext, toggleShuffle, toggleRepeat }
```

### 2.2 Create `hooks/usePlaylistOperations.ts`
**Extract from:** `App.tsx` lines 539-626

```
Responsibilities:
- handleRenamePlaylist(id, newName) - Rename with undo support
- handleDeletePlaylist(id) - Delete with undo support
- handleOpenPlaylistEdit(playlist) - Open edit modal

Returns:
- { handleRenamePlaylist, handleDeletePlaylist, handleOpenPlaylistEdit, editingPlaylist, setEditingPlaylist }
```

### 2.3 Create `hooks/useInboxOperations.ts`
**Extract from:** `App.tsx` lines 658-724

```
Responsibilities:
- handleAcceptTracks(trackIds) - Accept inbox tracks with undo
- handleRejectTracks(trackIds) - Reject inbox tracks with undo

Returns:
- { handleAcceptTracks, handleRejectTracks }
```

### 2.4 Create `hooks/useTrackAnalysis.ts`
**Extract from:** `App.tsx` lines 494-519

```
Responsibilities:
- analysisTrackIds state management
- handleAnalysisComplete(results) - Process analysis results
- openAnalysisModal(trackIds)
- closeAnalysisModal()

Returns:
- { analysisTrackIds, openAnalysisModal, closeAnalysisModal, handleAnalysisComplete }
```

### 2.5 Create `hooks/usePlaybackRefs.ts`
**Extract from:** `App.tsx` lines 262-370

```
Consolidates scattered ref management:
- allTracksRef, repeatModeRef, shuffleEnabledRef
- currentTrackIdRef, playTrackRef, queueRef, setQueueRef
- Syncs all refs in single useEffect
```

### 2.6 Rename `useLibraryCommands.ts` → `useFileImport.ts`
**Refactor:** `hooks/useLibraryCommands.ts`

```
Current responsibilities (too many):
- File import with progress
- Playlist drop handling
- Event listening

Should become focused on:
- File import handling
- Import progress state
- Import event listeners
```

---

## Phase 3: Extract Components (Medium-High Risk)

### 3.1 Split `SettingsPanel.tsx` into sections

**Create `components/settings/DatabaseSettings.tsx`**
- Database path configuration
- Path selection UI

**Create `components/settings/BackfillSettings.tsx`**
- Backfill search text button
- Backfill cover art button
- Progress indicators

**Create `components/settings/AppearanceSettings.tsx`**
- Theme selector
- Locale selector

**Create `components/settings/PlaybackSettings.tsx`**
- Seek mode toggle
- Other playback preferences

**Refactor `SettingsPanel.tsx`**
- Compose from section components
- Handle tab state only

### 3.2 Extract from `QueuePanel.tsx`

**Create `components/queue/QueueItem.tsx`**
- Single queue item rendering
- Drag handle
- Track info display
- Remove button

**Create `components/queue/QueueControls.tsx`**
- Clear queue button
- Queue mode controls

### 3.3 Extract from `TrackTable.tsx`

**Create `components/library/TableEmptyState.tsx`**
- Empty library message
- Empty search results message
- Empty playlist message

### 3.4 Extract from `AnalysisModal.tsx`

**Create `components/analysis/BpmRangeSelector.tsx`**
- BPM normalization controls
- Range input UI

**Create `components/analysis/AnalysisResultsTable.tsx`**
- Results list/table display
- Individual track results

---

## Phase 4: Naming Improvements

### 4.1 Type Renames

| Current | Proposed | File |
|---------|----------|------|
| `LibraryView` | `LibraryViewType` | `types/library.ts` |
| `PendingPlaylistDrop` | `PlaylistDropOperation` | `hooks/useLibraryCommands.ts` |

### 4.2 Variable/State Renames

| Current | Proposed | Location |
|---------|----------|----------|
| `view` | `currentLibraryView` | `App.tsx` |
| `analysisTrackIds` | `tracksToAnalyze` | `App.tsx` |
| `setAnalysisTrackIds` | `setTracksToAnalyze` | `App.tsx` |

### 4.3 Hook Renames (for clarity)

| Current | Proposed | Reason |
|---------|----------|--------|
| `useColumns` | `useColumnManager` | Manages column state |
| `useSelection` | `useTrackSelection` | More specific |
| `useViewConfig` | `useLibraryViewConfig` | More specific |

### 4.4 Handler Naming Convention

**Standardize to:**
- `on` prefix for event callbacks passed to children: `onTrackPlay`, `onPlaylistSelect`
- `handle` prefix for internal handlers: `handleSkipNext`, `handleImportComplete`

---

## Phase 5: Folder Restructure (Optional)

```
src/
├── components/
│   ├── analysis/          # NEW - Analysis related
│   │   ├── AnalysisModal.tsx
│   │   ├── BpmRangeSelector.tsx
│   │   └── AnalysisResultsTable.tsx
│   ├── layout/            # Existing - Layout components
│   ├── library/           # Existing - Library/table components
│   ├── player/            # NEW - Player components
│   │   ├── PlayerBar.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── VolumeControl.tsx
│   │   └── MediaControls.tsx
│   ├── playlist/          # NEW - Playlist components
│   │   ├── PlaylistContextMenu.tsx
│   │   ├── PlaylistCreateModal.tsx
│   │   └── PlaylistEditModal.tsx
│   ├── queue/             # NEW - Queue components
│   │   ├── QueuePanel.tsx
│   │   ├── QueueItem.tsx
│   │   └── QueueControls.tsx
│   ├── settings/          # NEW - Settings components
│   │   ├── SettingsPanel.tsx
│   │   ├── DatabaseSettings.tsx
│   │   ├── BackfillSettings.tsx
│   │   ├── AppearanceSettings.tsx
│   │   └── PlaybackSettings.tsx
│   └── ui/                # Existing - Generic UI components
├── hooks/
│   ├── playback/          # NEW - Playback hooks
│   │   ├── useAudioPlayback.ts
│   │   ├── usePlaybackControls.ts
│   │   └── usePlaybackRefs.ts
│   ├── playlist/          # NEW - Playlist hooks
│   │   ├── usePlaylistDrag.ts
│   │   ├── usePlaylistMenu.ts
│   │   └── usePlaylistOperations.ts
│   └── ...existing hooks
├── utils/
│   ├── database.ts        # NEW - DB operations
│   ├── playbackApi.ts     # NEW - Playback IPC
│   ├── importApi.ts       # NEW - Import IPC
│   ├── trackSorting.ts    # NEW - Sorting logic
│   ├── viewRouting.ts     # NEW - View/path mapping
│   ├── dbPath.ts          # NEW - DB path resolution
│   └── storage.ts         # Existing
└── ...
```

---

## Implementation Status

### Phase 1: Foundation - COMPLETED
1. [x] Create `utils/trackSorting.ts`
2. [x] Create `utils/viewRouting.ts`
3. [x] Create `utils/dbPath.ts`
4. [x] Split `tauriDb.ts` into `database.ts`, `playbackApi.ts`, `importApi.ts`

### Phase 2: Core Hooks - COMPLETED
5. [x] Create `hooks/usePlaybackControls.ts`
6. [x] Create `hooks/usePlaylistOperations.ts`
7. [x] Create `hooks/useInboxOperations.ts`
8. [x] Create `hooks/useTrackAnalysis.ts`
9. [x] Create `hooks/useQueueOperations.ts`
10. [x] Refactor `useLibraryCommands.ts` → `useFileImport.ts`

### Phase 3: Component Extraction - COMPLETED
11. [x] Extract `TableEmptyState.tsx` from `TrackTable.tsx`
12. [x] Extract `NowPlayingTrack.tsx` from `QueuePanel.tsx`
13. [x] Create `QueueItem.tsx` component (available for future use)

### Phase 4: Naming Improvements - COMPLETED
14. [x] Rename `useLibraryCommands` → `useFileImport`
15. [x] Rename `PendingPlaylistDrop` → `PlaylistDropOperation`
16. [x] Rename confirm/cancel functions to use `Operation` suffix
17. [x] Update all imports throughout codebase

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| `App.tsx` lines | 1,184 | ~500 |
| `tauriDb.ts` files | 1 | 3 |
| `SettingsPanel.tsx` lines | 349 | ~100 |
| Number of hooks | 19 | 24 |
| Average hook size | ~150 | ~80 |

---

## Risk Mitigation

1. **Test after each phase** - Run the app and verify functionality
2. **Commit frequently** - Small, atomic commits for easy rollback
3. **Keep old files temporarily** - Don't delete until verified
4. **Update imports incrementally** - Use IDE refactoring tools

---

## Files to Create (Summary)

**New Utility Files:**
- `src/utils/trackSorting.ts`
- `src/utils/viewRouting.ts`
- `src/utils/dbPath.ts`
- `src/utils/database.ts`
- `src/utils/playbackApi.ts`
- `src/utils/importApi.ts`

**New Hook Files:**
- `src/hooks/usePlaybackControls.ts`
- `src/hooks/usePlaylistOperations.ts`
- `src/hooks/useInboxOperations.ts`
- `src/hooks/useTrackAnalysis.ts`
- `src/hooks/usePlaybackRefs.ts`

**New Component Files:**
- `src/components/settings/DatabaseSettings.tsx`
- `src/components/settings/BackfillSettings.tsx`
- `src/components/settings/AppearanceSettings.tsx`
- `src/components/settings/PlaybackSettings.tsx`
- `src/components/queue/QueueItem.tsx`
- `src/components/queue/QueueControls.tsx`
- `src/components/library/TableEmptyState.tsx`
- `src/components/analysis/BpmRangeSelector.tsx`
- `src/components/analysis/AnalysisResultsTable.tsx`

**Files to Rename:**
- `src/hooks/useLibraryCommands.ts` → `src/hooks/useFileImport.ts`

**Files to Delete (after migration):**
- `src/utils/tauriDb.ts` (replaced by split files)

# Music Player Requirements (Agents)

## Product goals
- Cross-platform desktop music player/library
- Pro, data-dense UI with strong customization
- Custom theming via CSS variables

## Core requirements
- Drag-and-drop folders or single songs to add to library
- Search across the full library (no pagination; single long list)
- Multiselect tracks and drag to playlists
- Metadata editing (edits are permanent everywhere)
- Columns are resizable
- Columns can be shown/hidden per user preference
- Prepared for i18n

## Library import workflow
- New imports go to a separate staging view named "Inbox"
- Tracks in Inbox can be categorized and then accepted into main library
- Metadata edits in Inbox persist into main library
- Tracks can be added to playlists from anywhere (Inbox or main library)

## UI/UX requirements
- Table-based library view with configurable columns
- Support drag-and-drop to playlists from any list
- Theme customization via CSS variables on a settings page
- Context menu with play, play next, add to queue, add to playlist, edit, delete

## Data model implications
- Track import status flag (e.g., staged vs accepted)
- User preferences for visible columns and widths
- Expanded metadata fields for future growth

## Future/expansion
- Display as much metadata as possible (in richer views)
- Consider MusicBrainz enrichment: metadata-only lookup first, then fingerprinting (Chromaprint/AcoustID) with local caching and confidence scoring

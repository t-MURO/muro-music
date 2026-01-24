import type { ColumnConfig, Track, Playlist } from "../types/library";

export const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "compact-light", label: "Compact Light" },
  { id: "compact-dark", label: "Compact Dark" },
  { id: "terminal", label: "Terminal" },
  { id: "compact-terminal", label: "Compact Terminal" },
];

export const initialPlaylists: Playlist[] = [
  { id: "playlist-1", name: "Favorites", trackIds: [] },
  { id: "playlist-2", name: "Synthwave Vibes", trackIds: [] },
  { id: "playlist-3", name: "Coding Sessions", trackIds: [] },
  { id: "playlist-4", name: "Chill Mix", trackIds: [] },
  { id: "playlist-5", name: "High Energy", trackIds: [] },
];

export const baseColumns: ColumnConfig[] = [
  { key: "title", labelKey: "columns.title", visible: true, width: 240 },
  { key: "artist", labelKey: "columns.artist", visible: true, width: 180 },
  { key: "album", labelKey: "columns.album", visible: true, width: 200 },
  { key: "duration", labelKey: "columns.duration", visible: true, width: 120 },
  { key: "bitrate", labelKey: "columns.bitrate", visible: true, width: 120 },
  { key: "rating", labelKey: "columns.rating", visible: true, width: 110 },
];

export const initialTracks: Track[] = [
  { id: "1", title: "Neon Dreams", artist: "Synth Collective", album: "Electric Nights", duration: "4:05", bitrate: "320 kbps", rating: 5 },
  { id: "2", title: "Midnight Aurora", artist: "Luna Wave", album: "Celestial Echoes", duration: "5:12", bitrate: "320 kbps", rating: 4 },
  { id: "3", title: "Retrograde", artist: "Cosmic Drift", album: "Time Cascade", duration: "3:18", bitrate: "256 kbps", rating: 5 },
  { id: "4", title: "Glass Elevator", artist: "Nova Drift", album: "Signal Bloom", duration: "4:01", bitrate: "320 kbps", rating: 5 },
  { id: "5", title: "Digital Rain", artist: "Code Breaker", album: "Matrix Dreams", duration: "4:27", bitrate: "320 kbps", rating: 3 },
  { id: "6", title: "Vapor Trail", artist: "Aether", album: "Skyline Sessions", duration: "3:09", bitrate: "192 kbps", rating: 4 },
  { id: "7", title: "Crystal Caves", artist: "Echo Chamber", album: "Underground", duration: "5:34", bitrate: "320 kbps", rating: 5 },
  { id: "8", title: "Neon Sunset", artist: "Synth Collective", album: "Electric Nights", duration: "3:43", bitrate: "320 kbps", rating: 4 },
  { id: "9", title: "Stellar Wind", artist: "Luna Wave", album: "Celestial Echoes", duration: "4:58", bitrate: "320 kbps", rating: 5 },
  { id: "10", title: "Flux Capacitor", artist: "Cosmic Drift", album: "Time Cascade", duration: "4:36", bitrate: "256 kbps", rating: 4 },
  { id: "11", title: "Binary Sunset", artist: "Code Breaker", album: "Matrix Dreams", duration: "4:05", bitrate: "320 kbps", rating: 3 },
  { id: "12", title: "Cloud Atlas", artist: "Aether", album: "Skyline Sessions", duration: "5:12", bitrate: "192 kbps", rating: 5 },
  { id: "13", title: "Deep Echo", artist: "Echo Chamber", album: "Underground", duration: "6:41", bitrate: "320 kbps", rating: 4 },
  { id: "14", title: "Voltage", artist: "Synth Collective", album: "Electric Nights", duration: "3:18", bitrate: "320 kbps", rating: 5 },
  { id: "15", title: "Moonlight Sonata 2077", artist: "Luna Wave", album: "Celestial Echoes", duration: "5:56", bitrate: "320 kbps", rating: 5 },
  { id: "16", title: "Time Warp", artist: "Cosmic Drift", album: "Time Cascade", duration: "4:49", bitrate: "256 kbps", rating: 4 },
  { id: "17", title: "Silicon Dreams", artist: "Code Breaker", album: "Matrix Dreams", duration: "3:54", bitrate: "320 kbps", rating: 4 },
  { id: "18", title: "Horizon Line", artist: "Aether", album: "Skyline Sessions", duration: "4:27", bitrate: "192 kbps", rating: 3 },
  { id: "19", title: "Subterranean", artist: "Echo Chamber", album: "Underground", duration: "6:18", bitrate: "320 kbps", rating: 5 },
  { id: "20", title: "Plasma Wave", artist: "Synth Collective", album: "Electric Nights", duration: "3:32", bitrate: "320 kbps", rating: 4 },
  { id: "21", title: "Cosmic Dust", artist: "Luna Wave", album: "Celestial Echoes", duration: "4:58", bitrate: "320 kbps", rating: 5 },
  { id: "22", title: "Parallel Universe", artist: "Cosmic Drift", album: "Time Cascade", duration: "5:45", bitrate: "256 kbps", rating: 5 },
  { id: "23", title: "Cyber City", artist: "Code Breaker", album: "Matrix Dreams", duration: "4:16", bitrate: "320 kbps", rating: 4 },
  { id: "24", title: "Sky Fortress", artist: "Aether", album: "Skyline Sessions", duration: "4:47", bitrate: "192 kbps", rating: 4 },
  { id: "25", title: "Resonance Chamber", artist: "Echo Chamber", album: "Underground", duration: "6:52", bitrate: "320 kbps", rating: 5 },
  { id: "26", title: "Circuit Breaker", artist: "Synth Collective", album: "Electric Nights", duration: "3:54", bitrate: "320 kbps", rating: 3 },
  { id: "27", title: "Nebula", artist: "Luna Wave", album: "Celestial Echoes", duration: "4:49", bitrate: "320 kbps", rating: 4 },
  { id: "28", title: "Temporal Shift", artist: "Cosmic Drift", album: "Time Cascade", duration: "5:01", bitrate: "256 kbps", rating: 5 },
  { id: "29", title: "Mainframe", artist: "Code Breaker", album: "Matrix Dreams", duration: "4:38", bitrate: "320 kbps", rating: 4 },
  { id: "30", title: "Above the Clouds", artist: "Aether", album: "Skyline Sessions", duration: "4:05", bitrate: "192 kbps", rating: 5 },
  { id: "31", title: "Cave Paintings", artist: "Echo Chamber", album: "Underground", duration: "5:56", bitrate: "320 kbps", rating: 4 },
  { id: "32", title: "Electron Flow", artist: "Synth Collective", album: "Electric Nights", duration: "4:27", bitrate: "320 kbps", rating: 5 },
  { id: "33", title: "Stargazer", artist: "Luna Wave", album: "Celestial Echoes", duration: "5:34", bitrate: "320 kbps", rating: 5 },
];

export const initialInboxTracks: Track[] = [
  { id: "inbox-1", title: "Aurora Borealis", artist: "Northern Lights", album: "Polar Dreams", duration: "3:45", bitrate: "320 kbps", rating: 0 },
  { id: "inbox-2", title: "Desert Storm", artist: "Sandstorm", album: "Mirage", duration: "4:22", bitrate: "256 kbps", rating: 0 },
  { id: "inbox-3", title: "Ocean Depths", artist: "Deep Blue", album: "Aquatic Symphony", duration: "5:18", bitrate: "320 kbps", rating: 0 },
  { id: "inbox-4", title: "Mountain Peak", artist: "Alpine Echo", album: "Summit", duration: "4:01", bitrate: "192 kbps", rating: 0 },
  { id: "inbox-5", title: "Forest Whispers", artist: "Nature's Voice", album: "Woodland Tales", duration: "3:56", bitrate: "320 kbps", rating: 0 },
];

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
} from "lucide-react";

type PlayerBarProps = {
  isPlaying: boolean;
  shuffleEnabled: boolean;
  repeatMode: "off" | "all" | "one";
  seekPosition: number;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSeekChange: (value: number) => void;
};

export const PlayerBar = ({
  isPlaying,
  shuffleEnabled,
  repeatMode,
  seekPosition,
  onTogglePlay,
  onToggleShuffle,
  onToggleRepeat,
  onSeekChange,
}: PlayerBarProps) => {
  return (
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
            onClick={onToggleShuffle}
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
            onClick={onTogglePlay}
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
            onClick={onToggleRepeat}
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
          onChange={(event) => onSeekChange(Number(event.target.value))}
          type="range"
          value={seekPosition}
        />
        <span>4:01</span>
      </div>
    </footer>
  );
};

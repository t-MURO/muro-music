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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = seekPosition;
  const duration = 241; // 4:01
  const volume = 80;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="col-span-3 col-start-1 row-start-3 grid h-[var(--media-controls-height)] grid-cols-[1fr_2fr_1fr] items-center gap-[var(--spacing-lg)] border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] px-[var(--spacing-lg)] pb-[var(--spacing-xl)] pt-[var(--spacing-md)]">
      {/* Left section - Track info */}
      <div className="flex min-w-0 items-center gap-[var(--spacing-md)]">
        <div className="h-[var(--avatar-size)] w-[var(--avatar-size)] shrink-0 rounded-[var(--radius-md)] bg-[var(--color-accent)]" />
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-[var(--font-size-sm)] font-semibold text-[var(--color-text-primary)]">
            Glass Elevator
          </p>
          <p className="truncate text-[var(--font-size-xs)] text-[var(--color-text-secondary)]">
            Nova Drift &bull; Signal Bloom
          </p>
        </div>
      </div>

      {/* Center section - Controls */}
      <div className="flex flex-col items-center gap-[var(--spacing-sm)] pb-[var(--spacing-sm)]">
        <div className="flex items-center gap-[var(--spacing-md)]">
          <button
            className={`flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--transition-fast)] ${
              shuffleEnabled
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={onToggleShuffle}
            title="Shuffle"
            type="button"
          >
            <Shuffle className="h-[18px] w-[18px]" />
          </button>
          <button
            className="flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            title="Previous"
            type="button"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-white transition-all duration-[var(--transition-fast)] hover:scale-105 hover:bg-[var(--color-accent-hover)]"
            onClick={onTogglePlay}
            title={isPlaying ? "Pause" : "Play"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" fill="currentColor" />
            ) : (
              <Play className="h-6 w-6" fill="currentColor" />
            )}
          </button>
          <button
            className="flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            title="Next"
            type="button"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            className={`flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--transition-fast)] ${
              repeatMode !== "off"
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
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
              <Repeat1 className="h-[18px] w-[18px]" />
            ) : (
              <Repeat className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        <div className="flex w-full max-w-[600px] items-center gap-[var(--spacing-md)]">
          <span className="min-w-[40px] text-right text-[var(--font-size-xs)] tabular-nums text-[var(--color-text-muted)]">
            {formatTime(currentTime)}
          </span>
          <div className="relative h-1 flex-1 cursor-pointer rounded-[var(--radius-full)] bg-[var(--color-bg-tertiary)]">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(event) => onSeekChange(Number(event.target.value))}
              className="absolute left-0 top-0 z-[2] h-full w-full cursor-pointer opacity-0"
              aria-label="Seek"
            />
            <div 
              className="pointer-events-none absolute left-0 top-0 h-full rounded-[var(--radius-full)] bg-[var(--color-accent)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="min-w-[40px] text-[var(--font-size-xs)] tabular-nums text-[var(--color-text-muted)]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right section - Volume */}
      <div className="flex items-center justify-end gap-[var(--spacing-sm)]">
        <Speaker className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" />
        <div className="relative h-1 w-[100px] cursor-pointer rounded-[var(--radius-full)] bg-[var(--color-bg-tertiary)]">
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={volume}
            className="absolute left-0 top-0 z-[2] h-full w-full cursor-pointer opacity-0"
            aria-label="Volume"
          />
          <div 
            className="pointer-events-none absolute left-0 top-0 h-full rounded-[var(--radius-full)] bg-[var(--color-accent)]"
            style={{ width: `${volume}%` }}
          />
        </div>
      </div>
    </footer>
  );
};

import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
  Music2,
} from "lucide-react";
import { t } from "../../i18n";

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
  const duration = 0;
  const volume = 80;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="player-bar col-span-3 col-start-1 row-start-3 grid h-[var(--media-controls-height)] grid-cols-[1fr_2fr_1fr] items-center gap-[var(--spacing-lg)] border-t border-[var(--color-border)] bg-[var(--color-bg-primary)] px-[var(--spacing-lg)] pb-[var(--spacing-xl)] pt-[var(--spacing-md)]">
      {/* Left section - Track info */}
      <div className="flex min-w-0 items-center gap-[var(--spacing-md)]">
        <div className="flex h-[var(--avatar-size)] w-[var(--avatar-size)] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]">
          <Music2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 overflow-hidden">
          <p className="truncate text-[var(--font-size-sm)] font-semibold text-[var(--color-text-primary)]">
            {t("player.empty.title")}
          </p>
          <p className="truncate text-[var(--font-size-xs)] text-[var(--color-text-secondary)]">
            {t("player.empty.subtitle")}
          </p>
        </div>
      </div>

      {/* Center section - Controls */}
      <div className="flex flex-col items-center gap-[var(--spacing-sm)] pb-[var(--spacing-sm)]">
        <div className="flex items-center gap-[var(--spacing-md)]">
          <button
            className={`player-bar-button flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--transition-fast)] ${
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
            className="player-bar-button flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            title="Previous"
            type="button"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            className="player-bar-play-button flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-accent)] text-white transition-all duration-[var(--transition-fast)] hover:scale-105 hover:bg-[var(--color-accent-hover)]"
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
            className="player-bar-button flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] text-[var(--color-text-secondary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            title="Next"
            type="button"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            className={`player-bar-button flex h-[var(--button-height)] w-[var(--button-height)] items-center justify-center rounded-[var(--radius-full)] transition-all duration-[var(--transition-fast)] ${
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
          <div className="player-progress-bar relative h-1 flex-1 rounded-[var(--radius-full)]">
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
              className="player-progress-fill"
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
        <div className="player-volume-control relative h-1 w-[100px]">
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={volume}
            className="absolute left-0 top-0 z-[2] h-full w-full cursor-pointer opacity-0"
            aria-label="Volume"
          />
          <div 
            className="player-volume-fill"
            style={{ width: `${volume}%` }}
          />
        </div>
      </div>
    </footer>
  );
};

import { ChevronDown } from "lucide-react";
import type { Locale } from "../../i18n";
import { t } from "../../i18n";

type SettingsPanelProps = {
  theme: string;
  locale: Locale;
  themes: ReadonlyArray<{ id: string; label: string }>;
  localeOptions: ReadonlyArray<{ id: string; label: string }>;
  dbPath: string;
  dbFileName: string;
  backfillPending: boolean;
  backfillStatus: string | null;
  onThemeChange: (theme: string) => void;
  onLocaleChange: (locale: Locale) => void;
  onDbPathChange: (value: string) => void;
  onDbFileNameChange: (value: string) => void;
  onBackfillSearchText: () => void;
  onUseDefaultLocation: () => void;
};

export const SettingsPanel = ({
  theme,
  locale,
  themes,
  localeOptions,
  dbPath,
  dbFileName,
  backfillPending,
  backfillStatus,
  onThemeChange,
  onLocaleChange,
  onDbPathChange,
  onDbFileNameChange,
  onBackfillSearchText,
  onUseDefaultLocation,
}: SettingsPanelProps) => {
  return (
    <div className="h-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-[var(--shadow-sm)]">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {t("settings.appearance")}
      </div>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium">{t("settings.theme")}</label>
        <div className="relative w-64">
          <select
            className="w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
            onChange={(event) => onThemeChange(event.target.value)}
            value={theme}
          >
            {themes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>
        <p className="text-xs text-[var(--text-muted)]">{t("settings.theme.help")}</p>
        <label className="mt-4 text-sm font-medium">{t("settings.language")}</label>
        <div className="relative w-64">
          <select
            className="w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
            onChange={(event) => onLocaleChange(event.target.value as Locale)}
            value={locale}
          >
            {localeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          {t("settings.language.help")}
        </p>
      </div>
      <div className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Maintenance
      </div>
      <div className="mt-4 grid gap-3">
        <label className="text-sm font-medium">Database File Name</label>
        <input
          className="w-full max-w-md rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
          placeholder="muro.db"
          value={dbFileName}
          onChange={(event) => onDbFileNameChange(event.target.value)}
        />
        <p className="text-xs text-[var(--text-muted)]">
          Stored inside the app data directory unless you override the full path.
        </p>
        <label className="text-sm font-medium">Database Path</label>
        <input
          className="w-full max-w-xl rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
          placeholder="/path/to/muro.db"
          value={dbPath}
          onChange={(event) => onDbPathChange(event.target.value)}
        />
        <div>
          <button
            className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition hover:border-[var(--panel-border-strong)] hover:text-[var(--text-primary)]"
            type="button"
            onClick={onUseDefaultLocation}
          >
            Use default location
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--panel-border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onBackfillSearchText}
            disabled={backfillPending}
            type="button"
          >
            {backfillPending ? "Backfilling..." : "Backfill search index"}
          </button>
          {backfillStatus && (
            <span className="text-xs text-[var(--text-muted)]">{backfillStatus}</span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Runs a one-time search index update for existing tracks.
        </p>
      </div>
    </div>
  );
};

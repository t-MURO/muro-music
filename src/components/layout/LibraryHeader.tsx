import { Columns2, Search } from "lucide-react";
import { t } from "../../i18n";

type LibraryHeaderProps = {
  title: string;
  subtitle: string;
  isSettings: boolean;
  onColumnsButtonClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const LibraryHeader = ({
  title,
  subtitle,
  isSettings,
  onColumnsButtonClick,
}: LibraryHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>
      {!isSettings && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm shadow-[var(--shadow-sm)]">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              className="w-40 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              placeholder={t("search.placeholder")}
            />
          </div>
          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]"
              onClick={onColumnsButtonClick}
              type="button"
            >
              <Columns2 className="h-4 w-4" />
              {t("columns.label")}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

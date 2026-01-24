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
    <header className="flex items-start justify-between border-b border-[var(--color-border-light)] bg-[var(--color-bg-primary)] p-[var(--spacing-lg)]">
      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <h2 className="text-[var(--font-size-xl)] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[var(--font-size-sm)] text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {!isSettings && (
        <div className="flex items-center gap-[var(--spacing-md)]">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-[var(--spacing-md)] h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              className="h-[var(--input-height)] w-60 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] pl-[calc(var(--spacing-md)+24px)] pr-[var(--spacing-md)] text-[var(--font-size-sm)] text-[var(--color-text-primary)] transition-all duration-[var(--transition-fast)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-light)]"
              placeholder={t("search.placeholder")}
              type="text"
            />
          </div>
          <button
            className="flex h-[var(--button-height)] items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-[var(--spacing-md)] text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)]"
            onClick={onColumnsButtonClick}
            type="button"
          >
            <Columns2 className="h-[var(--icon-size)] w-[var(--icon-size)]" />
            <span>{t("columns.label")}</span>
          </button>
        </div>
      )}
    </header>
  );
};

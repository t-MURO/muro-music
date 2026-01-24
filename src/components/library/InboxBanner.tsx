import { t } from "../../i18n";

type InboxBannerProps = {
  selectedCount: number;
};

export const InboxBanner = ({ selectedCount }: InboxBannerProps) => {
  return (
    <div className="mb-6 space-y-3 px-[var(--spacing-lg)] pt-[var(--spacing-md)]">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-accent-light)] to-[var(--color-bg-tertiary)] px-5 py-4 text-[var(--font-size-sm)]">
        <span className="font-semibold text-[var(--color-text-primary)]">{t("header.inbox")}</span>
        <span className="ml-2 text-[var(--color-text-secondary)]">
          Tag, edit metadata, and move tracks into the main library when ready.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-5 py-4 text-[var(--font-size-sm)]">
        <div className="text-[var(--font-size-xs)] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {t("inbox.review")}
        </div>
        <button className="flex h-[var(--button-height)] items-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-[var(--spacing-md)] text-[var(--font-size-sm)] font-semibold text-white transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-accent-hover)]">
          {t("inbox.accept")}
        </button>
        <button className="flex h-[var(--button-height)] items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-[var(--spacing-md)] text-[var(--font-size-sm)] font-medium text-[var(--color-text-primary)] transition-all duration-[var(--transition-fast)] hover:bg-[var(--color-bg-hover)]">
          {t("inbox.reject")}
        </button>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-[var(--color-bg-tertiary)] px-3 py-1.5 text-[var(--font-size-xs)]">
          <span className="text-[var(--color-text-secondary)]">{t("inbox.selected")}</span>
          <span className="font-bold text-[var(--color-accent)]">
            {selectedCount}
          </span>
        </div>
      </div>
    </div>
  );
};

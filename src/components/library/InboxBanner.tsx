import { t } from "../../i18n";

type InboxBannerProps = {
  selectedCount: number;
};

export const InboxBanner = ({ selectedCount }: InboxBannerProps) => {
  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
        <span className="font-medium">{t("header.inbox")}</span>
        <span className="ml-2 text-[var(--text-muted)]">
          Tag, edit metadata, and move tracks into the main library when ready.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm shadow-[var(--shadow-sm)]">
        <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {t("inbox.review")}
        </div>
        <button className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-[var(--shadow-sm)]">
          {t("inbox.accept")}
        </button>
        <button className="rounded-[var(--radius-sm)] border border-[var(--panel-border)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-muted)]">
          {t("inbox.reject")}
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{t("inbox.selected")}</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {selectedCount}
          </span>
        </div>
      </div>
    </div>
  );
};

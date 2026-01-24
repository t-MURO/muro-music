import { useMemo } from "react";
import { t } from "../i18n";

export type LibraryView = "library" | "inbox" | "settings";

export const useLibraryView = (view: LibraryView) => {
  return useMemo(() => {
    const isLibrary = view === "library";
    const isInbox = view === "inbox";
    const isSettings = view === "settings";
    const title = isLibrary
      ? t("header.library")
      : isInbox
      ? t("header.inbox")
      : t("header.settings");
    const subtitle = isLibrary
      ? t("header.library.subtitle")
      : isInbox
      ? t("header.inbox.subtitle")
      : t("header.settings.subtitle");

    return { isInbox, isLibrary, isSettings, subtitle, title };
  }, [view]);
};

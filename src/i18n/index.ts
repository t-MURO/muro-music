import de from "./de.json";
import en from "./en.json";

export const localeOptions = [
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
] as const;

const localeMessages = {
  en,
  de,
} as const;

export type Locale = keyof typeof localeMessages;
export type Messages = (typeof localeMessages)[Locale];
export type MessageKey = keyof Messages;

let currentLocale: Locale = "en";
let currentMessages: Messages = localeMessages[currentLocale];

export const isLocale = (value: string): value is Locale =>
  Object.prototype.hasOwnProperty.call(localeMessages, value);

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
  currentMessages = localeMessages[locale] ?? localeMessages.en;
};

export const getLocale = () => currentLocale;

export const t = (key: MessageKey) => currentMessages[key] ?? key;

import { defineStore } from "pinia";

export type ReaderTheme = "paper" | "kindle" | "green" | "night";

type ReaderSettingsState = {
  fontSize: number;
  lineHeight: number;
  theme: ReaderTheme;
};

const STORAGE_KEY = "novel-cloud-reader.reader-settings";
const DEFAULT_SETTINGS: ReaderSettingsState = {
  fontSize: 20,
  lineHeight: 1.9,
  theme: "paper"
};
const THEME_SEQUENCE: ReaderTheme[] = ["paper", "kindle", "green", "night"];

export const useReaderSettingsStore = defineStore("reader-settings", {
  state: (): ReaderSettingsState => loadSettings(),
  actions: {
    increaseFontSize() {
      this.fontSize = Math.min(30, this.fontSize + 1);
      persistSettings(this.$state);
    },
    decreaseFontSize() {
      this.fontSize = Math.max(16, this.fontSize - 1);
      persistSettings(this.$state);
    },
    setTheme(theme: ReaderTheme) {
      this.theme = theme;
      persistSettings(this.$state);
    },
    toggleTheme() {
      const currentIndex = THEME_SEQUENCE.indexOf(this.theme);
      this.theme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
      persistSettings(this.$state);
    }
  }
});

function loadSettings(): ReaderSettingsState {
  const storedSettings = readStoredSettings();

  return {
    fontSize: clampNumber(storedSettings?.fontSize, 16, 30, DEFAULT_SETTINGS.fontSize),
    lineHeight: clampNumber(storedSettings?.lineHeight, 1.6, 2.2, DEFAULT_SETTINGS.lineHeight),
    theme: normalizeTheme(storedSettings?.theme)
  };
}

function readStoredSettings(): Partial<ReaderSettingsState> | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Partial<ReaderSettingsState>) : undefined;
  } catch {
    return undefined;
  }
}

function persistSettings(settings: ReaderSettingsState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function normalizeTheme(theme: unknown): ReaderTheme {
  return THEME_SEQUENCE.includes(theme as ReaderTheme) ? (theme as ReaderTheme) : DEFAULT_SETTINGS.theme;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

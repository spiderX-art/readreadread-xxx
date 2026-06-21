import { defineStore } from "pinia";

export const useReaderSettingsStore = defineStore("reader-settings", {
  state: () => ({
    fontSize: 20,
    lineHeight: 1.9,
    theme: "paper" as "paper" | "green" | "night"
  }),
  actions: {
    increaseFontSize() {
      this.fontSize = Math.min(30, this.fontSize + 1);
    },
    decreaseFontSize() {
      this.fontSize = Math.max(16, this.fontSize - 1);
    },
    toggleTheme() {
      this.theme = this.theme === "paper" ? "green" : "paper";
    }
  }
});

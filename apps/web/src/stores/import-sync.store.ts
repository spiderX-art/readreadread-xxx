import { defineStore } from "pinia";
import type { SyncImportResult } from "shared";
import { syncPreviewImports } from "../services/import.api";
import { useAuthStore } from "./auth.store";

const SYNC_PATH = "/小说";
const SYNC_COOLDOWN_MS = 60_000;

export const useImportSyncStore = defineStore("importSync", {
  state: () => ({
    loading: false,
    error: undefined as string | undefined,
    result: undefined as SyncImportResult | undefined,
    lastStartedAt: 0,
    lastCompletedAt: 0
  }),
  actions: {
    async sync(options: { force?: boolean } = {}): Promise<SyncImportResult | undefined> {
      const authStore = useAuthStore();

      if (!authStore.userId || this.loading) {
        return this.result;
      }

      const now = Date.now();

      if (!options.force && this.lastStartedAt && now - this.lastStartedAt < SYNC_COOLDOWN_MS) {
        return this.result;
      }

      this.loading = true;
      this.error = undefined;
      this.lastStartedAt = now;

      try {
        const result = await syncPreviewImports(SYNC_PATH);
        this.result = result;
        this.lastCompletedAt = Date.now();
        return result;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "自动同步失败";
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});

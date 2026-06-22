import { defineStore } from "pinia";
import type { SyncImportResult, SyncJob } from "shared";
import { createSyncImportJob, getSyncImportJob, retrySyncImportJobItem } from "../services/import.api";
import { useAuthStore } from "./auth.store";

const SYNC_PATH = "/小说";
const SYNC_COOLDOWN_MS = 60_000;
const SYNC_POLL_MS = 1_500;
const FINAL_SYNC_STATUSES = new Set(["completed", "failed"]);

export const useImportSyncStore = defineStore("importSync", {
  state: () => ({
    loading: false,
    error: undefined as string | undefined,
    job: undefined as SyncJob | undefined,
    jobId: undefined as string | undefined,
    result: undefined as SyncImportResult | undefined,
    lastStartedAt: 0,
    lastCompletedAt: 0
  }),
  actions: {
    async sync(options: { force?: boolean } = {}): Promise<SyncJob | undefined> {
      const authStore = useAuthStore();

      if (!authStore.userId || this.loading) {
        return this.job;
      }

      const now = Date.now();

      if (!options.force && this.lastStartedAt && now - this.lastStartedAt < SYNC_COOLDOWN_MS) {
        return this.job;
      }

      this.loading = true;
      this.error = undefined;
      this.lastStartedAt = now;

      try {
        const created = await createSyncImportJob(SYNC_PATH);
        this.jobId = created.jobId;
        this.job = created.job;
        const job = await this.pollJob(created.jobId);

        this.result = toSyncImportResult(job);
        this.lastCompletedAt = Date.now();
        return job;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "自动同步失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async retryFailedItem(itemId: string): Promise<SyncJob | undefined> {
      if (!this.jobId || this.loading) {
        return this.job;
      }

      this.loading = true;
      this.error = undefined;
      this.lastStartedAt = Date.now();

      try {
        const created = await retrySyncImportJobItem(this.jobId, itemId);
        this.jobId = created.jobId;
        this.job = created.job;
        const job = await this.pollJob(created.jobId);

        this.result = toSyncImportResult(job);
        this.lastCompletedAt = Date.now();
        return job;
      } catch (error) {
        this.error = error instanceof Error ? error.message : "失败文件重试失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async pollJob(jobId: string): Promise<SyncJob> {
      let job = await getSyncImportJob(jobId);
      this.job = job;

      while (!FINAL_SYNC_STATUSES.has(job.status)) {
        await wait(SYNC_POLL_MS);
        job = await getSyncImportJob(jobId);
        this.job = job;
      }

      if (job.status === "failed") {
        throw new Error(job.message ?? "自动同步失败");
      }

      return job;
    }
  }
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toSyncImportResult(job: SyncJob): SyncImportResult {
  return {
    path: job.path,
    scannedCount: job.scannedCount,
    candidateCount: job.candidateCount,
    imported: job.imported,
    skipped: job.skipped,
    failed: job.failed.map((item) => ({
      ...item,
      message: item.message ?? "自动导入失败"
    }))
  };
}

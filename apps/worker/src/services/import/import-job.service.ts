export const IMPORT_JOB_STATUSES = ["pending", "processing", "success", "failed"] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

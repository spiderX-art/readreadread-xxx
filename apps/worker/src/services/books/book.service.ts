import type { BookStatus } from "shared";

export function shouldUpdateLastReadAt(status: BookStatus): boolean {
  return status === "reading" || status === "finished";
}

import type { NetdiskFile } from "shared";
import { apiGet } from "./api";

export function listNetdiskFiles(path: string): Promise<{ path: string; files: NetdiskFile[] }> {
  return apiGet(`/api/netdisk/files?path=${encodeURIComponent(path)}`);
}

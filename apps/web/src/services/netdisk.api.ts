import type { NetdiskFile } from "shared";
import { apiGet } from "./api";

export function listNetdiskFiles(path: string): Promise<{ path: string; files: NetdiskFile[] }> {
  return apiGet(`/api/netdisk/files?path=${encodeURIComponent(path)}`);
}

export function searchNetdiskFiles(q: string, path = "/"): Promise<{ q: string; path: string; files: NetdiskFile[] }> {
  const params = new URLSearchParams({
    q,
    path
  });

  return apiGet(`/api/netdisk/search?${params.toString()}`);
}

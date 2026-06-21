import type { NetdiskFile } from "shared";

export function markImportedFiles(files: NetdiskFile[], importedFileIds: Set<string>): NetdiskFile[] {
  return files.map((file) => ({
    ...file,
    imported: importedFileIds.has(file.fsId)
  }));
}

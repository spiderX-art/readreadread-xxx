import { Hono } from "hono";
import { listBookRowsBySourceFileIds } from "../db/repositories/book.repo";
import type { AppEnv } from "../env";
import {
  listBaiduNetdiskFiles,
  markImportedFiles,
  searchBaiduNetdiskFiles
} from "../services/baidu/baidu-file.service";
import { getValidBaiduAccessToken } from "../services/baidu/baidu-token.service";
import { ok } from "../utils/response";

export const netdiskRoutes = new Hono<AppEnv>();

netdiskRoutes.get("/files", async (c) => {
  const path = c.req.query("path") ?? "/";
  const accessToken = await getValidBaiduAccessToken(c.env.DB, c.env, c.get("userId"));
  const files = await listBaiduNetdiskFiles(accessToken, path);

  return c.json(ok({ path, files: await markFilesImported(c.env.DB, c.get("userId"), files) }));
});

netdiskRoutes.get("/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const path = c.req.query("path") ?? "/";
  const accessToken = await getValidBaiduAccessToken(c.env.DB, c.env, c.get("userId"));
  const files = q.trim() ? await searchBaiduNetdiskFiles(accessToken, q.trim(), path) : [];

  return c.json(ok({ q, path, files: await markFilesImported(c.env.DB, c.get("userId"), files) }));
});

async function markFilesImported(db: D1Database, userId: string, files: Awaited<ReturnType<typeof listBaiduNetdiskFiles>>) {
  const importedBooks = await listBookRowsBySourceFileIds(
    db,
    userId,
    files.filter((file) => !file.isDir).map((file) => file.fsId)
  );
  const importedBooksBySourceFileId = new Map<string, string>();

  for (const book of importedBooks) {
    if (book.source_file_id && !importedBooksBySourceFileId.has(book.source_file_id)) {
      importedBooksBySourceFileId.set(book.source_file_id, book.id);
    }
  }

  return markImportedFiles(files, importedBooksBySourceFileId);
}

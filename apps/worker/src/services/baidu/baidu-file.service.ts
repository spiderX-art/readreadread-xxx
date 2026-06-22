import { detectEncoding } from "parser";
import type { NetdiskFile } from "shared";
import { AppError } from "../../utils/errors";

export function markImportedFiles(files: NetdiskFile[], importedBooksBySourceFileId: Map<string, string>): NetdiskFile[] {
  return files.map((file) => ({
    ...file,
    imported: importedBooksBySourceFileId.has(file.fsId),
    bookId: importedBooksBySourceFileId.get(file.fsId)
  }));
}

interface BaiduFileItem {
  fs_id: number | string;
  path: string;
  server_filename?: string;
  filename?: string;
  size?: number;
  isdir?: number;
  server_mtime?: number;
  dlink?: string;
}

interface BaiduFileListResponse {
  errno?: number;
  errmsg?: string;
  list?: BaiduFileItem[];
}

const BAIDU_FILE_API_URL = "https://pan.baidu.com/rest/2.0/xpan/file";
const BAIDU_MULTIMEDIA_API_URL = "https://pan.baidu.com/rest/2.0/xpan/multimedia";
const MAX_TXT_DOWNLOAD_BYTES = 80 * 1024 * 1024;

export async function listBaiduNetdiskFiles(accessToken: string, path: string): Promise<NetdiskFile[]> {
  const url = createBaiduFileApiUrl(accessToken, "list");
  url.searchParams.set("dir", normalizeNetdiskPath(path));
  url.searchParams.set("folder", "0");
  url.searchParams.set("start", "0");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("web", "1");
  url.searchParams.set("order", "name");
  url.searchParams.set("desc", "0");

  const body = await fetchBaiduFileList(url);
  return (body.list ?? []).map(toNetdiskFile).filter((file) => file.isDir || file.ext?.toLowerCase() === "txt");
}

export async function searchBaiduNetdiskFiles(accessToken: string, keyword: string, path = "/"): Promise<NetdiskFile[]> {
  const url = createBaiduFileApiUrl(accessToken, "search");
  url.searchParams.set("key", keyword);
  url.searchParams.set("dir", normalizeNetdiskPath(path));
  url.searchParams.set("recursion", "1");
  url.searchParams.set("web", "1");

  const body = await fetchBaiduFileList(url);
  return (body.list ?? []).map(toNetdiskFile).filter((file) => file.isDir || file.ext?.toLowerCase() === "txt");
}

export async function downloadBaiduTxtFile(
  accessToken: string,
  input: { fsId: string; fileName?: string; fileSize?: number }
): Promise<{ text: string; fileName: string; fileSize: number; path: string }> {
  const meta = await getBaiduFileMeta(accessToken, input.fsId);
  const fileName = meta.filename ?? meta.server_filename ?? input.fileName ?? `${input.fsId}.txt`;
  const fileSize = meta.size ?? input.fileSize ?? 0;

  if (meta.isdir) {
    throw new AppError(400, "BAIDU_FILE_IS_DIRECTORY", "请选择 TXT 文件，而不是文件夹");
  }

  if (getFileExt(fileName) !== "txt") {
    throw new AppError(422, "UNSUPPORTED_BAIDU_FILE_TYPE", "仅支持导入 TXT 文件");
  }

  if (fileSize > MAX_TXT_DOWNLOAD_BYTES) {
    throw new AppError(422, "TXT_FILE_TOO_LARGE", "TXT 文件超过 80MB，暂不支持导入");
  }

  if (!meta.dlink) {
    throw new AppError(422, "BAIDU_DOWNLOAD_LINK_MISSING", "百度网盘未返回下载链接");
  }

  const downloadUrl = new URL(meta.dlink);
  downloadUrl.searchParams.set("access_token", accessToken);

  const response = await fetch(downloadUrl.toString(), {
    headers: {
      "User-Agent": "pan.baidu.com"
    }
  });

  if (!response.ok) {
    throw new AppError(500, "BAIDU_DOWNLOAD_FAILED", "百度网盘文件下载失败");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > MAX_TXT_DOWNLOAD_BYTES) {
    throw new AppError(422, "TXT_FILE_TOO_LARGE", "TXT 文件超过 80MB，暂不支持导入");
  }

  return {
    text: decodeTxtBytes(bytes),
    fileName,
    fileSize: fileSize || bytes.byteLength,
    path: meta.path
  };
}

async function getBaiduFileMeta(accessToken: string, fsId: string): Promise<BaiduFileItem> {
  const url = createBaiduFileApiUrl(accessToken, "filemetas", BAIDU_MULTIMEDIA_API_URL);
  url.searchParams.set("fsids", `[${normalizeFsId(fsId)}]`);
  url.searchParams.set("dlink", "1");
  url.searchParams.set("thumb", "0");
  url.searchParams.set("extra", "0");

  const body = await fetchBaiduFileList(url);
  const meta = body.list?.[0];

  if (!meta) {
    throw new AppError(404, "BAIDU_FILE_NOT_FOUND", "百度网盘文件不存在");
  }

  return meta;
}

function createBaiduFileApiUrl(accessToken: string, method: string, baseUrl = BAIDU_FILE_API_URL): URL {
  const url = new URL(baseUrl);
  url.searchParams.set("method", method);
  url.searchParams.set("access_token", accessToken);
  return url;
}

async function fetchBaiduFileList(url: URL): Promise<BaiduFileListResponse> {
  const response = await fetch(url.toString());
  const body = (await response.json().catch(() => ({}))) as BaiduFileListResponse;

  if (!response.ok || (body.errno !== undefined && body.errno !== 0)) {
    throw new AppError(500, "BAIDU_FILE_API_FAILED", body.errmsg ?? "百度网盘文件接口请求失败");
  }

  return body;
}

function toNetdiskFile(item: BaiduFileItem): NetdiskFile {
  const name = item.server_filename ?? item.filename ?? item.path.split("/").pop() ?? String(item.fs_id);
  const modifiedAt = item.server_mtime ? new Date(item.server_mtime * 1000).toISOString() : undefined;

  return {
    fsId: String(item.fs_id),
    path: item.path,
    name,
    size: item.size ?? 0,
    isDir: item.isdir === 1,
    ext: getFileExt(name),
    modifiedAt
  };
}

function getFileExt(fileName: string): string | undefined {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(index + 1).toLowerCase() : undefined;
}

function normalizeNetdiskPath(path: string): string {
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed || ""}`;
}

function normalizeFsId(fsId: string): string {
  const trimmed = fsId.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new AppError(400, "INVALID_BAIDU_FS_ID", "百度网盘文件 ID 无效");
  }

  return trimmed;
}

function decodeTxtBytes(bytes: Uint8Array): string {
  const encoding = detectEncoding(bytes);

  if (encoding !== "unknown") {
    return new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/, "");
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("gb18030").decode(bytes);
  }
}

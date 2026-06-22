import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/utils/errors";
import {
  downloadBaiduTxtFile,
  listBaiduNetdiskFiles,
  searchBaiduNetdiskFiles
} from "../../src/services/baidu/baidu-file.service";

describe("baidu file service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists directories and TXT files while filtering unsupported file types", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.searchParams.get("method")).toBe("list");
      expect(url.searchParams.get("dir")).toBe("/小说");
      expect(url.searchParams.get("access_token")).toBe("access-token");

      return jsonResponse({
        errno: 0,
        list: [
          baiduItem({ fs_id: 1, path: "/小说/玄幻", server_filename: "玄幻", isdir: 1 }),
          baiduItem({ fs_id: 2, path: "/小说/书.txt", server_filename: "书.txt", size: 2048 }),
          baiduItem({ fs_id: 3, path: "/小说/封面.jpg", server_filename: "封面.jpg", size: 4096 })
        ]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const files = await listBaiduNetdiskFiles("access-token", "小说");

    expect(files).toEqual([
      expect.objectContaining({ fsId: "1", name: "玄幻", isDir: true }),
      expect.objectContaining({ fsId: "2", name: "书.txt", isDir: false, ext: "txt", size: 2048 })
    ]);
  });

  it("searches recursively under the selected path", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.searchParams.get("method")).toBe("search");
      expect(url.searchParams.get("key")).toBe("凡人");
      expect(url.searchParams.get("dir")).toBe("/小说");
      expect(url.searchParams.get("recursion")).toBe("1");

      return jsonResponse({
        errno: 0,
        list: [baiduItem({ fs_id: 2, path: "/小说/凡人.txt", server_filename: "凡人.txt", size: 1024 })]
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchBaiduNetdiskFiles("access-token", "凡人", "/小说")).resolves.toHaveLength(1);
  });

  it("downloads and decodes a TXT file", async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("第一章 开始")]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          errno: 0,
          list: [
            baiduItem({
              fs_id: 123,
              path: "/小说/开始.txt",
              server_filename: "开始.txt",
              size: bytes.byteLength,
              dlink: "https://download.example/file"
            })
          ]
        })
      )
      .mockResolvedValueOnce(new Response(bytes));
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadBaiduTxtFile("access-token", { fsId: "123" });

    expect(result).toEqual({
      text: "第一章 开始",
      fileName: "开始.txt",
      fileSize: bytes.byteLength,
      path: "/小说/开始.txt"
    });
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://download.example/file?access_token=access-token");
  });

  it("rejects directories, non-TXT files, and oversized files before downloading", async () => {
    await expectDownloadRejected(
      baiduItem({ fs_id: 123, path: "/小说", server_filename: "小说", isdir: 1, dlink: "https://download.example/file" }),
      "BAIDU_FILE_IS_DIRECTORY"
    );
    await expectDownloadRejected(
      baiduItem({ fs_id: 123, path: "/小说/封面.jpg", server_filename: "封面.jpg", dlink: "https://download.example/file" }),
      "UNSUPPORTED_BAIDU_FILE_TYPE"
    );
    await expectDownloadRejected(
      baiduItem({
        fs_id: 123,
        path: "/小说/大书.txt",
        server_filename: "大书.txt",
        size: 80 * 1024 * 1024 + 1,
        dlink: "https://download.example/file"
      }),
      "TXT_FILE_TOO_LARGE"
    );
  });
});

async function expectDownloadRejected(item: Record<string, unknown>, code: string): Promise<void> {
  const fetchMock = vi.fn(async () =>
    jsonResponse({
      errno: 0,
      list: [item]
    })
  );
  vi.stubGlobal("fetch", fetchMock);

  try {
    await downloadBaiduTxtFile("access-token", { fsId: "123" });
    throw new Error("Expected download to be rejected");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }

  expect(fetchMock).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
}

function baiduItem(input: Record<string, unknown>): Record<string, unknown> {
  return {
    fs_id: 1,
    path: "/小说/书.txt",
    server_filename: "书.txt",
    size: 0,
    isdir: 0,
    server_mtime: 1_700_000_000,
    ...input
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    }
  });
}

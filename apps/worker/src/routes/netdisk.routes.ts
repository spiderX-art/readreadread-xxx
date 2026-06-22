import { Hono } from "hono";
import type { AppEnv } from "../env";
import { listBaiduNetdiskFiles, searchBaiduNetdiskFiles } from "../services/baidu/baidu-file.service";
import { getValidBaiduAccessToken } from "../services/baidu/baidu-token.service";
import { ok } from "../utils/response";

export const netdiskRoutes = new Hono<AppEnv>();

netdiskRoutes.get("/files", async (c) => {
  const path = c.req.query("path") ?? "/";
  const accessToken = await getValidBaiduAccessToken(c.env.DB, c.env, c.get("userId"));
  const files = await listBaiduNetdiskFiles(accessToken, path);

  return c.json(ok({ path, files }));
});

netdiskRoutes.get("/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const path = c.req.query("path") ?? "/";
  const accessToken = await getValidBaiduAccessToken(c.env.DB, c.env, c.get("userId"));
  const files = q.trim() ? await searchBaiduNetdiskFiles(accessToken, q.trim(), path) : [];

  return c.json(ok({ q, path, files }));
});

import { Hono } from "hono";
import type { NetdiskFile } from "shared";
import type { AppEnv } from "../env";
import { ok } from "../utils/response";

export const netdiskRoutes = new Hono<AppEnv>();

netdiskRoutes.get("/files", (c) => {
  const path = c.req.query("path") ?? "/";
  const files: NetdiskFile[] = [];

  return c.json(ok({ path, files }));
});

netdiskRoutes.get("/search", (c) => {
  const q = c.req.query("q") ?? "";
  const files: NetdiskFile[] = [];

  return c.json(ok({ q, files }));
});

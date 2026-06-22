import { Hono } from "hono";
import { ensureUserRow } from "../db/repositories/user.repo";
import type { AppEnv } from "../env";
import { requireAuth } from "../middleware/auth.middleware";
import { createBaiduAuthorizationUrl } from "../services/baidu/baidu-auth.service";
import { exchangeBaiduAuthorizationCode } from "../services/baidu/baidu-token.service";
import { AppError } from "../utils/errors";
import { fail, ok } from "../utils/response";

export const authRoutes = new Hono<AppEnv>();

authRoutes.get("/baidu/login", requireAuth, (c) => {
  const clientId = c.env.BAIDU_CLIENT_ID;
  const redirectUri = c.env.BAIDU_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json(fail("BAIDU_AUTH_NOT_CONFIGURED", "百度网盘授权配置缺失"), 500);
  }

  const url = createBaiduAuthorizationUrl({
    clientId,
    redirectUri,
    state: c.get("userId")
  });

  return c.json(ok({ authorizationUrl: url }));
});

authRoutes.get("/baidu/callback", async (c) => {
  const code = c.req.query("code");
  const userId = c.req.query("state");

  if (!code) {
    return c.json(fail("MISSING_CODE", "缺少百度授权 code"), 400);
  }

  if (!userId) {
    return c.json(fail("MISSING_STATE", "缺少授权状态"), 400);
  }

  try {
    const now = new Date().toISOString();
    await ensureUserRow(c.env.DB, userId, now);
    await exchangeBaiduAuthorizationCode(c.env.DB, c.env, userId, code);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, "BAIDU_AUTH_FAILED", "百度网盘授权失败");
  }

  const redirectUrl = new URL("/auth", c.env.FRONTEND_ORIGIN);
  redirectUrl.searchParams.set("baidu", "connected");

  return c.redirect(redirectUrl.toString());
});

authRoutes.post("/logout", (c) => c.json(ok({ loggedOut: true })));

authRoutes.get("/me", requireAuth, (c) =>
  c.json(
    ok({
      id: c.get("userId"),
      displayName: c.get("userId")
    })
  )
);

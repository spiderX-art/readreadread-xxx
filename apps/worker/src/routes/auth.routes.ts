import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, ok } from "../utils/response";

export const authRoutes = new Hono<AppEnv>();

authRoutes.get("/baidu/login", (c) => {
  const clientId = c.env.BAIDU_CLIENT_ID;
  const redirectUri = c.env.BAIDU_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json(fail("BAIDU_AUTH_NOT_CONFIGURED", "百度网盘授权配置缺失"), 500);
  }

  const url = new URL("https://openapi.baidu.com/oauth/2.0/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "basic,netdisk");

  return c.json(ok({ authorizationUrl: url.toString() }));
});

authRoutes.get("/baidu/callback", (c) => {
  const code = c.req.query("code");

  if (!code) {
    return c.json(fail("MISSING_CODE", "缺少百度授权 code"), 400);
  }

  return c.json(ok({ code, status: "callback_received" }));
});

authRoutes.post("/logout", (c) => c.json(ok({ loggedOut: true })));

authRoutes.get("/me", (c) =>
  c.json(
    ok({
      id: "local-user",
      displayName: "本地读者"
    })
  )
);

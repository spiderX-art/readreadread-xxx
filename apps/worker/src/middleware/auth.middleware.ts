import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { fail } from "../utils/response";

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = c.req.header("x-user-id");

  if (!userId) {
    return c.json(fail("UNAUTHORIZED", "请先登录"), 401);
  }

  c.set("userId", userId);
  await next();
};

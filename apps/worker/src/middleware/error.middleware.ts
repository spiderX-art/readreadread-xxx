import type { Context } from "hono";
import type { AppEnv } from "../env";
import { AppError } from "../utils/errors";
import { fail } from "../utils/response";

export function handleError(error: Error, c: Context<AppEnv>): Response {
  if (error instanceof AppError) {
    return c.json(fail(error.code, error.message, error.data), error.status);
  }

  return c.json(fail("INTERNAL_ERROR", "服务暂时不可用"), 500);
}

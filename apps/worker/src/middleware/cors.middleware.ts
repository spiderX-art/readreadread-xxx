import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: (origin, c) => {
    if (!origin) {
      return c.env?.FRONTEND_ORIGIN || "*";
    }

    if (origin === c.env?.FRONTEND_ORIGIN || isLocalDevFrontend(origin, c.env?.APP_ENV)) {
      return origin;
    }

    return c.env?.FRONTEND_ORIGIN || origin;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true
});

function isLocalDevFrontend(origin: string, appEnv?: string): boolean {
  if (appEnv !== "development") {
    return false;
  }

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname) && /^517\d$/.test(url.port);
  } catch {
    return false;
  }
}

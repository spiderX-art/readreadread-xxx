import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: (origin, c) => c.env?.FRONTEND_ORIGIN || origin || "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true
});

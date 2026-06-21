import { Hono } from "hono";
import type { AppEnv } from "./env";
import { authRoutes } from "./routes/auth.routes";
import { bookRoutes } from "./routes/books.routes";
import { importRoutes } from "./routes/import.routes";
import { netdiskRoutes } from "./routes/netdisk.routes";
import { ratingRoutes } from "./routes/rating.routes";
import { readerRoutes } from "./routes/reader.routes";
import { reviewsRoutes } from "./routes/reviews.routes";
import { searchRoutes } from "./routes/search.routes";
import { tagRoutes } from "./routes/tags.routes";
import { corsMiddleware } from "./middleware/cors.middleware";
import { handleError } from "./middleware/error.middleware";
import { ok } from "./utils/response";

export const app = new Hono<AppEnv>();

app.use("*", corsMiddleware);
app.onError(handleError);

app.get("/", (c) => c.redirect("/api/health"));
app.get("/api/health", (c) =>
  c.json(
    ok({
      service: "novel-cloud-reader-api",
      status: "ok"
    })
  )
);

app.route("/api/auth", authRoutes);
app.route("/api/netdisk", netdiskRoutes);
app.route("/api/import", importRoutes);
app.route("/api/books", bookRoutes);
app.route("/api/books", readerRoutes);
app.route("/api/books", ratingRoutes);
app.route("/api/books", reviewsRoutes);
app.route("/api/books", searchRoutes);
app.route("/api", tagRoutes);

export default app;

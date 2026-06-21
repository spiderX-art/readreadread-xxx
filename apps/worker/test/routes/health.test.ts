import { describe, expect, it } from "vitest";
import { app } from "../../src/index";

describe("health route", () => {
  it("returns service status", async () => {
    const response = await app.request("/api/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: {
        service: "novel-cloud-reader-api",
        status: "ok"
      }
    });
  });
});

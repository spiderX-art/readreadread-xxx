import { expect, test } from "@playwright/test";

test("opens the bookshelf first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "私人书架" })).toBeVisible();
});

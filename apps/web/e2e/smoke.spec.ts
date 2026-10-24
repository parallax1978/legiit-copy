import { expect, test } from "@playwright/test";

test("landing page renders and links to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("argument");
  await page.getByRole("link", { name: /sign in/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
});

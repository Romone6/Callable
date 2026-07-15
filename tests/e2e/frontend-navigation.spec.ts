import { expect, test } from "@playwright/test";

test("marketing and workspace CTAs route to live frontend/API surfaces", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Open Workspace" }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Operational command layer status" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Review API Contracts" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { name: "Give your agents commands, not screenshots." })).toBeVisible();

  await page.getByRole("link", { name: "Live Endpoints" }).click();
  await expect(page).toHaveURL(/\/docs#live-endpoints$/);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "API Health" }).click();
  await expect(page).toHaveURL(/\/api\/health$/);
  await expect(page.getByText("verblayer")).toBeVisible();
});

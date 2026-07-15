import { expect, test } from "@playwright/test";

test("marketing docs include real command run contract examples", async ({ page }) => {
  await page.goto("/docs");

  await expect(page.getByRole("heading", { name: "Give your agents commands, not screenshots." })).toBeVisible();
  await expect(page.getByText("Contract responses")).toBeVisible();
  await expect(page.getByText("\"status\": \"succeeded\"")).toBeVisible();
  await expect(page.getByText("\"status\": \"waiting_for_approval\"")).toBeVisible();
  await expect(page.getByText("\"status\": \"failed\"")).toBeVisible();
  await expect(page.getByText("Run command contract")).toBeVisible();
});

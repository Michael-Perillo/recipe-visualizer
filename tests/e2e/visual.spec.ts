import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop visual baselines");
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Close recipe editor" }).click();
});

test("flow diagram light and dark appearance", async ({ page }) => {
  const artboard = page.getByTestId("recipe-artboard");
  await expect(artboard).toHaveScreenshot("flow-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(artboard).toHaveScreenshot("flow-dark.png");
});

test("matrix diagram light and dark appearance", async ({ page }) => {
  const artboard = page.getByTestId("recipe-artboard");
  await page.getByTestId("matrix-view").click();
  await expect(artboard).toHaveScreenshot("matrix-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(artboard).toHaveScreenshot("matrix-dark.png");
});

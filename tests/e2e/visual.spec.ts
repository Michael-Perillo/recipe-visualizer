import { expect, test } from "@playwright/test";
import {
  DEEP_RECIPE,
  MINIMAL_RECIPE,
  persistedLibraryFor,
} from "./recipes";

test.beforeEach(async ({ page }) => {
  await page.goto("/recipe-visualizer/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("flow diagram light and dark appearance", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop visual baseline");
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("recipe-artboard");
  await expect(artboard).toHaveScreenshot("flow-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(artboard).toHaveScreenshot("flow-dark.png");
});

test("matrix diagram light and dark appearance", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop visual baseline");
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("recipe-artboard");
  await page.getByTestId("matrix-view").click();
  await expect(artboard).toHaveScreenshot("matrix-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(artboard).toHaveScreenshot("matrix-dark.png");
});

test("minimal recipe remains composed in both diagram styles", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop visual baseline");
  await page.evaluate(
    (library) =>
      localStorage.setItem(
        "recipe-visualizer:library:v1",
        JSON.stringify(library),
      ),
    persistedLibraryFor(MINIMAL_RECIPE),
  );
  await page.reload();
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("recipe-artboard");
  await expect(artboard).toHaveScreenshot("minimal-flow.png");
  await page.getByTestId("matrix-view").click();
  await expect(artboard).toHaveScreenshot("minimal-matrix.png");
});

test("deep bounded recipe expands without clipping", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop visual baseline");
  await page.evaluate(
    (library) =>
      localStorage.setItem(
        "recipe-visualizer:library:v1",
        JSON.stringify(library),
      ),
    persistedLibraryFor(DEEP_RECIPE),
  );
  await page.reload();
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("recipe-artboard");
  await expect(artboard).toHaveScreenshot("deep-flow.png");
  await page.getByTestId("matrix-view").click();
  await expect(artboard).toHaveScreenshot("deep-matrix.png");
});

test("mobile preview retains a readable composed artboard", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile visual baseline");
  const artboard = page.getByTestId("recipe-artboard");
  await expect(artboard).toHaveScreenshot("flow-mobile.png");
  await page.getByTestId("matrix-view").click();
  await expect(artboard).toHaveScreenshot("matrix-mobile.png");
});

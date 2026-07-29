import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("switches views, scales servings, and persists edits", async ({ page }) => {
  test.skip(
    test.info().project.name.includes("mobile"),
    "Desktop library persistence coverage",
  );
  await expect(page.getByLabel("Recipe title")).toHaveValue("Espresso Brownies");
  await expect(page.getByTestId("recipe-artboard")).toHaveAttribute(
    "data-view",
    "flow",
  );

  await page.getByTestId("matrix-view").click();
  await expect(page.getByTestId("recipe-artboard")).toHaveAttribute(
    "data-view",
    "matrix",
  );

  await page.getByRole("button", { name: "Show 6 servings" }).click();
  await expect(page.getByLabel("Custom servings")).toHaveValue("6");
  await expect(page.getByTestId("recipe-artboard")).toContainText(
    "MATRIX RECIPE • SERVES 6",
  );

  await page.getByLabel("Recipe title").fill("Midnight Brownies");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Midnight Brownies",
  );
});

test("downloads self-contained SVG and a high-resolution PNG", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop export coverage");

  await page.getByLabel("Export visualization").click();
  const svgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe(
    "espresso-brownies-flow-serves-4-light.svg",
  );
  const svgPath = await svgDownload.path();
  expect(svgPath).not.toBeNull();

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG · 2×" }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe(
    "espresso-brownies-flow-serves-4-light.png",
  );
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
});

test("fits the matrix artboard and scrolls when zoomed", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop fit coverage");

  await page.getByTestId("matrix-view").click();
  const scrollArea = page.getByTestId("diagram-scroll-area");
  const artboard = page.getByTestId("recipe-artboard");
  const scrollBox = await scrollArea.boundingBox();
  const artboardBox = await artboard.boundingBox();

  expect(scrollBox).not.toBeNull();
  expect(artboardBox).not.toBeNull();
  expect(artboardBox!.width).toBeLessThanOrEqual(scrollBox!.width);
  expect(artboardBox!.height).toBeLessThanOrEqual(scrollBox!.height);

  for (let index = 0; index < 6; index += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
  }

  await expect
    .poll(() =>
      scrollArea.evaluate(
        (element) =>
          element.scrollWidth > element.clientWidth ||
          element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true);
});

test("supports the mobile editor and preview workflow", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only coverage");

  await expect(page.getByRole("button", { name: "preview" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "editor", exact: true }).click();
  await expect(page.getByTestId("recipe-editor")).toBeVisible();
  await page.getByLabel("Recipe title").fill("Pocket Brownies");
  await page.getByRole("button", { name: "preview", exact: true }).click();
  await expect(page.getByTestId("recipe-artboard")).toBeVisible();
  await expect(page.getByTestId("recipe-artboard")).toContainText(
    "Pocket Brownies",
  );
});

test("has no serious accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .disableRules(["svg-img-alt"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

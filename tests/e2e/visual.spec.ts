import { expect, test } from "@playwright/test";
import { DEEP_RECIPE, MINIMAL_RECIPE, persistedLibraryFor } from "./recipes";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function screenshotDiagram(
  page: import("@playwright/test").Page,
  target: import("@playwright/test").Locator,
  name: string,
) {
  // Preserve the real desktop/mobile width, but give tall SVGs enough vertical
  // space so the independently scrolling panel cannot clip the fixture.
  const viewport = page.viewportSize()!;
  const bounds = await target.boundingBox();
  await page.setViewportSize({
    ...viewport,
    height: Math.max(viewport.height, Math.ceil(bounds!.height) + 200),
  });
  try {
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveScreenshot(name);
  } finally {
    await page.setViewportSize(viewport);
  }
}

test("flow diagram light and dark appearance", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop visual baseline",
  );
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("graph-scroll-area");
  const method = page.getByTestId("diagram-method-key");
  await method.scrollIntoViewIfNeeded();
  await screenshotDiagram(page, method, "flow-method-light.png");
  await page.getByTestId("diagram-scroll-area").evaluate((element) => {
    element.scrollTop = 0;
  });
  await screenshotDiagram(page, artboard, "flow-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await screenshotDiagram(page, artboard, "flow-dark.png");
});

test("matrix diagram light and dark appearance", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop visual baseline",
  );
  await page.getByRole("button", { name: "Close recipe editor" }).click();
  const artboard = page.getByTestId("graph-scroll-area");
  await page.getByTestId("matrix-view").click();
  const method = page.getByTestId("diagram-method-key");
  await method.scrollIntoViewIfNeeded();
  await screenshotDiagram(page, method, "matrix-method-light.png");
  await page.getByTestId("diagram-scroll-area").evaluate((element) => {
    element.scrollTop = 0;
  });
  await screenshotDiagram(page, artboard, "matrix-light.png");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await screenshotDiagram(page, artboard, "matrix-dark.png");
});

test("minimal recipe remains composed in both diagram styles", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop visual baseline",
  );
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
  const artboard = page.getByTestId("graph-scroll-area");
  await screenshotDiagram(page, artboard, "minimal-flow.png");
  await page.getByTestId("matrix-view").click();
  await screenshotDiagram(page, artboard, "minimal-matrix.png");
});

test("deep bounded recipe expands without clipping", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop visual baseline",
  );
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
  const artboard = page.getByTestId("graph-scroll-area");
  const method = page.getByTestId("diagram-method-key");
  await screenshotDiagram(page, artboard, "deep-flow.png");
  await method.scrollIntoViewIfNeeded();
  await screenshotDiagram(page, method, "deep-flow-method.png");
  await page.getByTestId("diagram-scroll-area").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.getByTestId("matrix-view").click();
  await screenshotDiagram(page, artboard, "deep-matrix.png");
  await method.scrollIntoViewIfNeeded();
  await screenshotDiagram(page, method, "deep-matrix-method.png");
});

test("mobile preview retains a readable composed artboard", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.includes("mobile"),
    "Mobile visual baseline",
  );
  const artboard = page.getByTestId("graph-scroll-area");
  await screenshotDiagram(page, artboard, "flow-mobile.png");
  await page.getByTestId("matrix-view").click();
  await screenshotDiagram(page, artboard, "matrix-mobile.png");
});

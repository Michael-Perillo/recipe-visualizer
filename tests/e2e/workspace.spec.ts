import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { DEFAULT_RECIPE } from "../../src/data/defaultRecipe";
import { DEEP_RECIPE, MINIMAL_RECIPE, persistedLibraryFor } from "./recipes";

test.beforeEach(async ({ page }) => {
  await page.goto("/recipe-visualizer/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("keeps flow result labels inside the graph border", async ({ page }) => {
  for (const recipe of [
    DEFAULT_RECIPE,
    DEEP_RECIPE,
    MINIMAL_RECIPE,
    { ...MINIMAL_RECIPE, outputLabel: "W".repeat(100) },
  ]) {
    await page.evaluate(
      (library) =>
        localStorage.setItem(
          "recipe-visualizer:library:v1",
          JSON.stringify(library),
        ),
      persistedLibraryFor(recipe),
    );
    await page.reload();
    await expect(page.getByTestId("flow-output-label")).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.getByTestId("recipe-artboard").evaluate((svg) => {
      const panel = svg
        .querySelector<SVGGraphicsElement>('[data-testid="flow-graph-bounds"]')!
        .getBBox();
      const label = svg
        .querySelector<SVGGraphicsElement>('[data-testid="flow-output-label"]')!
        .getBBox();
      return {
        gap: panel.x + panel.width - label.x - label.width,
        top: label.y - panel.y,
        bottom: panel.y + panel.height - label.y - label.height,
      };
    });
    expect(bounds.gap).toBeGreaterThan(20);
    expect(bounds.top).toBeGreaterThan(0);
    expect(bounds.bottom).toBeGreaterThan(0);
  }
});

test("keeps method instructions readable with contained cues in both views", async ({
  page,
}, testInfo) => {
  for (const view of ["flow", "matrix"]) {
    await page.getByTestId(`${view}-view`).click();
    const method = page.getByTestId("diagram-method-key");
    await expect(method).toHaveAttribute(
      "data-columns",
      testInfo.project.name.includes("mobile") ? "1" : "2",
    );
    const fontSize = await page
      .getByTestId("method-instruction")
      .first()
      .locator("text")
      .evaluate((text) => {
        const svgText = text as SVGTextElement;
        return (
          Number(svgText.getAttribute("font-size")) * svgText.getScreenCTM()!.a
        );
      });
    expect(fontSize).toBeGreaterThan(15.5);
    expect(fontSize).toBeLessThan(16.5);
    const cardsFit = await page
      .getByTestId("method-card")
      .evaluateAll((cards) =>
        cards.every((card) => {
          const border = card.querySelector("rect")!.getBoundingClientRect();
          const cue = card
            .querySelector('[data-testid="method-cue"] > rect')!
            .getBoundingClientRect();
          return (
            cue.bottom < border.bottom - 15 &&
            [...card.querySelectorAll("text")].every((text) => {
              const box = text.getBoundingClientRect();
              return (
                box.left > border.left &&
                box.right < border.right &&
                box.top > border.top &&
                box.bottom < border.bottom
              );
            })
          );
        }),
      );
    expect(cardsFit).toBe(true);
  }
});

test("switches views, scales servings, and persists edits", async ({
  page,
}) => {
  test.skip(
    test.info().project.name.includes("mobile"),
    "Desktop library persistence coverage",
  );
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Espresso Brownies",
  );
  await expect(page.getByTestId("recipe-artboard")).toHaveAttribute(
    "data-view",
    "flow",
  );
  const flowText = await page
    .getByTestId("recipe-artboard")
    .locator("text")
    .allTextContents();
  expect(flowText.every((text) => !text.includes("…"))).toBe(true);
  expect(
    flowText.some(
      (text) =>
        text.replace(/\s/g, "") ===
        DEFAULT_RECIPE.prepNotes[0].replace(/\s/g, ""),
    ),
  ).toBe(true);
  await expect(
    page.locator('[data-ingredient-id="ingredient-cocoa"]'),
  ).toHaveAttribute("data-line-style", "dry");
  await expect(
    page.locator('[data-ingredient-id="ingredient-cocoa"]'),
  ).toHaveAttribute("data-featured", "true");
  await expect(
    page.locator('[data-ingredient-id="ingredient-espresso"]'),
  ).toHaveAttribute("data-line-style", "liquid");
  await expect(
    page.locator('[aria-label*="Step 5: Fold dry into wet"]'),
  ).toHaveAttribute("aria-label", /two additions.*Look for:/i);

  await page.getByTestId("matrix-view").click();
  await expect(page.getByTestId("recipe-artboard")).toHaveAttribute(
    "data-view",
    "matrix",
  );
  const matrixText = await page
    .getByTestId("recipe-artboard")
    .locator("text")
    .allTextContents();
  expect(matrixText.every((text) => !text.includes("…"))).toBe(true);
  expect(
    matrixText.some(
      (text) =>
        text.replace(/\s/g, "") ===
        DEFAULT_RECIPE.outputLabel.replace(/\s/g, ""),
    ),
  ).toBe(true);
  await expect(
    page.locator('[aria-label*="Step 1: Whisk dry"]'),
  ).toHaveAttribute("aria-label", /30 sec.*no pale flour/i);

  await page.getByRole("button", { name: "Show 6 servings" }).click();
  await expect(page.getByLabel("Custom servings")).toHaveValue("6");
  await expect(page.getByTestId("recipe-artboard")).toContainText(
    "MATRIX RECIPE • SERVES 6",
  );
  await expect(page.getByTestId("recipe-artboard")).toContainText("172.5 g");

  await page.getByLabel("Recipe title").fill("Midnight Brownies");
  await page.reload();
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Midnight Brownies",
  );
});

test("downloads self-contained SVG and a high-resolution PNG", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop export coverage",
  );

  for (const view of ["flow", "matrix"]) {
    await page.getByTestId(`${view}-view`).click();
    await page.getByLabel("Export visualization").click();
    const svgDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download SVG" }).click();
    const svgDownload = await svgDownloadPromise;
    expect(svgDownload.suggestedFilename()).toBe(
      `espresso-brownies-${view}-serves-4-light.svg`,
    );
    await svgDownload.saveAs(testInfo.outputPath(`${view}-recipe.svg`));
    const svgPath = await svgDownload.path();
    expect(svgPath).not.toBeNull();
    const svg = await readFile(svgPath!, "utf8");
    expect(svg).toContain("@font-face");
    expect(svg).toContain("Espresso Brownies");
    expect(svg).toContain('viewBox="0 0');
    expect(svg).toContain("METHOD • FOLLOW THE NUMBERS");
    expect(svg).toContain("Add the dry mixture in two additions");
    expect(svg).toContain("Look for:");
    for (const step of DEFAULT_RECIPE.steps) {
      // Complete values live in the exported card label even when visible SVG
      // text wraps across tspans; labels and visible metadata are both exported.
      expect(svg).toContain(step.details!);
      expect(svg).toContain(step.cue!);
      expect(svg).toContain(`TOOL: ${step.tool}`);
      expect(svg).toContain(`SETTING: ${step.setting}`);
    }
    expect(svg).toContain('data-testid="method-metadata"');
    expect(svg).toContain("TEMP: 350°F / 170°C");

    const pngDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG · up to 2×" }).click();
    const pngDownload = await pngDownloadPromise;
    expect(pngDownload.suggestedFilename()).toBe(
      `espresso-brownies-${view}-serves-4-light.png`,
    );
    await pngDownload.saveAs(testInfo.outputPath(`${view}-recipe.png`));
    const pngPath = await pngDownload.path();
    expect(pngPath).not.toBeNull();
    const png = await readFile(pngPath!);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBeGreaterThan(1_000);
    expect(png.readUInt32BE(20)).toBeGreaterThan(1_000);
    await page.getByLabel("Export visualization").click();
  }
});

test("keeps maps readable while method cards fit the panel independently of zoom", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop fit coverage");

  await page.getByTestId("matrix-view").click();
  const scrollArea = page.getByTestId("graph-scroll-area");
  const artboard = page.getByTestId("recipe-artboard");
  const scrollBox = await scrollArea.boundingBox();
  const artboardBox = await artboard.boundingBox();

  expect(scrollBox).not.toBeNull();
  expect(artboardBox).not.toBeNull();
  expect(artboardBox!.width).toBeGreaterThan(scrollBox!.width);
  expect(artboardBox!.height).toBeCloseTo(scrollBox!.height, 0);
  await expect
    .poll(() =>
      scrollArea.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 1,
      ),
    )
    .toBe(true);

  const method = page.getByTestId("method-artboard");
  const initialMethodWidth = (await method.boundingBox())!.width;
  for (let index = 0; index < 6; index += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
  }

  await expect
    .poll(() =>
      scrollArea.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    )
    .toBe(true);
  expect((await method.boundingBox())!.width).toBeCloseTo(initialMethodWidth);
  expect(
    await page
      .getByTestId("diagram-scroll-area")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
});

test("contains scrolling within workspace panels", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop scroll containment",
  );

  const documentMetrics = await page.evaluate(() => ({
    height: document.scrollingElement?.scrollHeight ?? 0,
    viewport: document.scrollingElement?.clientHeight ?? 0,
    scrollY: window.scrollY,
  }));
  expect(documentMetrics.height).toBeLessThanOrEqual(
    documentMetrics.viewport + 1,
  );
  expect(documentMetrics.scrollY).toBe(0);

  await page.getByRole("banner").hover();
  await page.mouse.wheel(0, 1_200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
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

test("creates, saves, and reloads a complete minimal recipe", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop creation coverage",
  );

  await page.getByRole("button", { name: "New recipe" }).click();
  await page.getByLabel("Recipe title").fill("Simple toast");
  await page.getByLabel("Final dish").fill("toast");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("Ingredient 1 name").fill("bread");
  await page.getByRole("button", { name: "Add operation" }).click();
  await page.getByLabel("Operation 1 action").fill("Toast");
  await page.getByRole("button", { name: "bread", exact: true }).click();

  await expect(page.getByTestId("recipe-artboard")).toBeVisible();
  await expect(page.getByText("Saved locally")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Recipe title")).toHaveValue("Simple toast");
  await expect(page.getByTestId("recipe-artboard")).toContainText("toast");
});

test("rejects invalid imports and normalizes valid unordered imports", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop import coverage",
  );

  const invalid = {
    ...DEFAULT_RECIPE,
    id: "invalid-import",
    title: "Invalid import",
    ingredients: DEFAULT_RECIPE.ingredients.map((ingredient, index) =>
      index === 0
        ? { ...ingredient, id: DEFAULT_RECIPE.ingredients[1].id }
        : ingredient,
    ),
  };
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "invalid.recipe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.getByRole("alert")).toContainText("cannot be imported");

  const unordered = {
    ...DEFAULT_RECIPE,
    id: "unordered-import",
    title: "Unordered brownies",
    ingredients: DEFAULT_RECIPE.ingredients.map((ingredient) => {
      const legacyIngredient = { ...ingredient };
      delete legacyIngredient.featured;
      return legacyIngredient;
    }),
    steps: [...DEFAULT_RECIPE.steps].reverse().map((step) => {
      const legacyStep = { ...step };
      delete legacyStep.timing;
      delete legacyStep.tool;
      delete legacyStep.setting;
      delete legacyStep.cue;
      return step.id === "step-bake"
        ? { ...legacyStep, durationMinutes: 35 }
        : legacyStep;
    }),
  };
  await fileInput.setInputFiles({
    name: "unordered.recipe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(unordered)),
  });
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Unordered brownies",
  );
  await expect(page.getByLabel("Operation 1 action")).toHaveValue("Whisk dry");
  await expect(page.getByLabel("Bake minimum timing")).toHaveValue("35");
  await expect(page.getByLabel("Bake timing unit")).toHaveValue("minutes");
  await expect(page.getByTestId("recipe-artboard")).toBeVisible();
});

test("preserves malformed storage as a recovery download", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop recovery coverage",
  );

  const malformed = JSON.stringify({
    schemaVersion: 1,
    activeRecipeId: MINIMAL_RECIPE.id,
    recipes: [
      {
        ...MINIMAL_RECIPE,
        ingredients: [
          {
            ...MINIMAL_RECIPE.ingredients[0],
            quantity: { value: -1, unit: "slice", scalable: true },
          },
        ],
      },
    ],
    view: "flow",
    theme: "light",
    servingsByRecipe: { [MINIMAL_RECIPE.id]: 1 },
  });
  await page.evaluate((raw) => {
    localStorage.setItem("recipe-visualizer:library:v1", raw);
  }, malformed);
  await page.reload();

  await expect(page.getByText("Saved data needed recovery")).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("recipe-visualizer:library:v1:recovery"),
    ),
  ).toBe(malformed);
});

test("synchronizes clean tabs and protects conflicting pending edits", async ({
  page,
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Desktop multi-tab coverage",
  );

  await expect(page.getByText("Saved locally")).toBeVisible();
  const secondPage = await context.newPage();
  await secondPage.goto("/recipe-visualizer/");
  await expect(secondPage.getByLabel("Recipe title")).toHaveValue(
    "Espresso Brownies",
  );

  await page.getByLabel("Recipe title").fill("Shared brownies");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await expect(secondPage.getByLabel("Recipe title")).toHaveValue(
    "Shared brownies",
  );

  await page.getByLabel("Recipe title").fill("First tab wins only by choice");
  await secondPage.getByLabel("Recipe title").fill("Pending second-tab edit");
  await expect(page.getByText("Saved locally")).toBeVisible();
  await expect(
    secondPage.getByText("Another tab changed this library"),
  ).toBeVisible();
  await secondPage.getByRole("button", { name: "Load other tab" }).click();
  await expect(secondPage.getByLabel("Recipe title")).toHaveValue(
    "First tab wins only by choice",
  );

  await page.getByLabel("Recipe title").fill("Another first-tab edit");
  await secondPage.getByLabel("Recipe title").fill("Second tab keeps its edit");
  await expect(
    secondPage.getByText("Another tab changed this library"),
  ).toBeVisible();
  await secondPage.getByRole("button", { name: "Keep this tab" }).click();
  await expect(secondPage.getByLabel("Recipe title")).toHaveValue(
    "Second tab keeps its edit",
  );
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Second tab keeps its edit",
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

test("loads brand icons through the Pages base path", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "One production asset check",
  );

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/recipe-visualizer/apple-touch-icon.png",
  );
  for (const asset of [
    "favicon.ico",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "site-icon-512.png",
  ]) {
    const response = await page.request.get(
      new URL(asset, page.url()).toString(),
    );
    expect(response.ok(), `${asset} should load from the Pages path`).toBe(
      true,
    );
    expect(Number(response.headers()["content-length"] ?? 0)).toBeGreaterThan(
      0,
    );
  }
});

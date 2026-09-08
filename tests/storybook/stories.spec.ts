import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { DEFAULT_RECIPE } from "../../src/data/defaultRecipe";

const index = JSON.parse(
  readFileSync("storybook-static/index.json", "utf8"),
) as {
  entries: Record<string, { id: string; type: string }>;
};
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === "story",
);

for (const story of stories) {
  test(`renders ${story.id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await expect(
      page.locator("#storybook-root > .story-surface"),
    ).toBeVisible();
    await expect(page.locator(".sb-errordisplay")).not.toBeVisible();
    if (story.id.endsWith("prep-note-typing")) {
      await expect(page.getByLabel("Prep note 1", { exact: true })).toHaveValue(
        "Line the pan with parchment.",
      );
      await expect(
        page.getByLabel("Prep note 1", { exact: true }),
      ).toBeFocused();
    }
    if (story.id.endsWith("controls-and-states")) {
      await expect(page.getByLabel("Recipe title")).toHaveValue(
        "Cocoa brownies",
      );
      await expect(
        page.getByRole("button", { name: "Matrix" }),
      ).toHaveAttribute("aria-pressed", "true");
    }
    expect(errors).toEqual([]);
  });
}

for (const theme of ["light", "dark"]) {
  test(`workspace is isolated and accessible in ${theme}`, async ({ page }) => {
    await page.goto(
      `/iframe.html?id=workspace-recipe-studio--brownies&viewMode=story&globals=theme:${theme}`,
    );
    await expect(page.getByLabel("Recipe title")).toHaveValue(
      "Espresso Brownies",
    );
    await page.getByLabel("Recipe title").fill("Story-only edit");
    await page.getByTestId("matrix-view").click();
    await expect(page.getByTestId("recipe-artboard")).toHaveAttribute(
      "data-view",
      "matrix",
    );
    expect(
      await page.evaluate(() =>
        localStorage.getItem("recipe-visualizer:library:v1"),
      ),
    ).toBeNull();
    const results = await new AxeBuilder({ page })
      .include(".rv-workspace")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await page.reload();
    await expect(page.getByLabel("Recipe title")).toHaveValue(
      "Espresso Brownies",
    );
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`workspace-${theme}.png`);
  });
}

test("mobile workspace and docs scroll independently of the app shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/iframe.html?id=workspace-recipe-studio--mobile&viewMode=story",
  );
  await expect(
    page.getByRole("navigation", { name: "Mobile workspace view" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("workspace-mobile-preview.png");
  await page.getByRole("button", { name: "editor", exact: true }).click();
  await expect(page.getByLabel("Recipe title")).toBeVisible();
  const prepNote = page.getByLabel("Prep note 1", { exact: true });
  await expect(prepNote).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(prepNote).toHaveAttribute("rows", "3");
  expect((await prepNote.boundingBox())?.height).toBeGreaterThan(70);
  await expect(page).toHaveScreenshot("workspace-mobile-editor.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto(
    "/iframe.html?id=editor-recipe-editor--complete-recipe&viewMode=story",
  );
  await expect(page.getByLabel("Final operation")).toBeAttached();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(true);
  await page.getByLabel("Final operation").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Final operation")).toBeInViewport();
  await page.goto("/iframe.html?id=controls-button--docs&viewMode=docs");
  await expect(page.locator(".sbdocs-wrapper")).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).position),
  ).not.toBe("fixed");
});

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`method cards match the consuming workspace at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      for (const view of ["flow", "matrix"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(
          `/iframe.html?id=workspace-recipe-studio--brownies&viewMode=story&globals=theme:${theme}`,
        );
        await page.getByTestId(`${view}-view`).click();
        const method = page.getByTestId("diagram-method-key");
        await expect(method).toBeAttached();
        await page.evaluate(() => document.fonts.ready);
        const displayWidth = Number(
          await method.getAttribute("data-display-width"),
        );
        const readCards = () =>
          page.getByTestId("method-card").evaluateAll((cards) =>
            cards.map((card) => {
              const border = card
                .querySelector("rect")!
                .getBoundingClientRect();
              const texts = [...card.querySelectorAll("text")];
              const instruction = card.querySelector<SVGTextElement>(
                '[data-testid="method-instruction"] text',
              )!;
              const cue = card
                .querySelector('[data-testid="method-cue"] > rect')!
                .getBoundingClientRect();
              return {
                instruction: card.getAttribute("aria-label"),
                text: texts.map((text) =>
                  [...text.querySelectorAll("tspan")]
                    .map((span) => span.textContent)
                    .join(" "),
                ),
                width: border.width,
                height: border.height,
                bodyFontSize:
                  Number(instruction.getAttribute("font-size")) *
                  instruction.getScreenCTM()!.a,
                cueBottomGap: border.bottom - cue.bottom,
                contained: texts.every((text) => {
                  const box = text.getBoundingClientRect();
                  return (
                    box.left > border.left &&
                    box.right < border.right &&
                    box.top > border.top &&
                    box.bottom < border.bottom
                  );
                }),
              };
            }),
          );
        const workspaceCards = await readCards();
        const columns = await method.getAttribute("data-columns");
        // Match the canvas, not the shell: Storybook adds 24px of padding per side.
        await page.setViewportSize({
          width: Math.ceil(displayWidth) + 48,
          height: 1000,
        });
        await page.goto(
          `/iframe.html?id=diagrams-method-cards--two-columns&viewMode=story&globals=theme:${theme}&args=width:${displayWidth}`,
        );
        await expect(page.getByTestId("diagram-method-key")).toHaveAttribute(
          "data-columns",
          columns!,
        );
        await page.evaluate(() => document.fonts.ready);
        const storyCards = await readCards();
        expect(storyCards).toHaveLength(DEFAULT_RECIPE.steps.length);
        storyCards.forEach((card, index) => {
          const original = workspaceCards[index];
          expect(card.instruction).toBe(original.instruction);
          expect(card.text).toEqual(original.text);
          expect(card.text).toContain(DEFAULT_RECIPE.steps[index].details);
          expect(card.text).toContain(DEFAULT_RECIPE.steps[index].cue);
          // Ignore fractional SVG scaling from the app's paper border/fit zoom.
          expect(card.width / card.bodyFontSize).toBeCloseTo(
            original.width / original.bodyFontSize,
            1,
          );
          expect(card.height / card.bodyFontSize).toBeCloseTo(
            original.height / original.bodyFontSize,
            1,
          );
          expect(card.bodyFontSize).toBeCloseTo(16, 0);
          expect(card.cueBottomGap).toBeGreaterThan(19);
          expect(card.contained).toBe(true);
          expect(original.contained).toBe(true);
        });
        const bake = page.getByTestId("method-card").nth(5);
        await expect(bake.locator('[data-field="time"]')).toHaveText(
          /TIME30–35 min/,
        );
        await expect(bake.locator('[data-field="temperature"]')).toHaveText(
          /TEMP350°F/,
        );
        await expect(bake.locator('[data-field="tool"]')).toHaveText(
          /TOOL8×8-in pan/,
        );
        await expect(bake.locator('[data-field="setting"]')).toHaveText(
          /SETTINGCenter rack/,
        );
      }
      await expect(page.getByTestId("method-card").first()).toHaveScreenshot(
        `method-card-${width}-${theme}.png`,
      );
    });
  }
}

test("compact desktop preview shows the whole brownie map without a squeezed editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1110, height: 1000 });
  await page.goto(
    "/iframe.html?id=workspace-recipe-studio--brownies&viewMode=story",
  );
  await expect(
    page.getByRole("navigation", { name: "Mobile workspace view" }),
  ).toBeVisible();
  await expect(page.getByTestId("recipe-editor")).not.toBeVisible();
  const map = page.getByTestId("graph-scroll-area");
  expect(
    await map.evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await map.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeLessThanOrEqual(1);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("workspace-compact-desktop.png");
  await page.getByRole("button", { name: "editor", exact: true }).click();
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Espresso Brownies",
  );
});

test("standalone methods reflow when the preview shrinks instead of hiding columns", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=diagrams-method-cards--three-columns&viewMode=story",
  );
  const method = page.getByTestId("diagram-method-key");
  for (const [width, columns] of [
    [1440, "3"],
    [1000, "2"],
    [390, "1"],
  ] as const) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(method).toHaveAttribute("data-columns", columns);
    expect(
      await page
        .locator(".story-diagram")
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
  }
});

test("maximum-length instructions keep metadata and cues separate without clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(
    "/iframe.html?id=diagrams-method-cards--maximum-length&viewMode=story",
  );
  const card = page.getByTestId("method-card").first();
  await expect(card).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  const metrics = await card.evaluate((element) => {
    const panel = element.querySelector("rect")!.getBoundingClientRect();
    const cue = element
      .querySelector('[data-testid="method-cue"] > rect')!
      .getBoundingClientRect();
    const method = element
      .querySelector('[data-testid="method-instruction"]')!
      .getBoundingClientRect();
    return {
      methodGap: cue.top - method.bottom,
      bottomGap: panel.bottom - cue.bottom,
      contained: [...element.querySelectorAll("text")].every((text) => {
        const box = text.getBoundingClientRect();
        return (
          box.left > panel.left &&
          box.right < panel.right &&
          box.top > panel.top &&
          box.bottom < panel.bottom
        );
      }),
    };
  });
  expect(metrics.contained).toBe(true);
  expect(metrics.methodGap).toBeGreaterThan(12);
  expect(metrics.bottomGap).toBeGreaterThan(19);
  await expect(card).toHaveScreenshot("maximum-method-mobile.png");
});

for (const width of [390, 1440]) {
  test(`deep maps stay readable without shrinking method text at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const view of ["flow", "matrix"]) {
      await page.goto(
        `/iframe.html?id=diagrams-recipe-diagrams--long-text-and-deep-chain&viewMode=story&args=view:${view}`,
      );
      const artboard = page.getByTestId("recipe-artboard");
      await expect(artboard).toHaveAttribute("data-view", view);
      await page.evaluate(() => document.fonts.ready);
      const fonts = await page
        .getByTestId("graph-operation")
        .evaluateAll((operations) =>
          operations.map((operation) => {
            const text = operation.querySelector<SVGTextElement>("text")!;
            return (
              Number(text.getAttribute("font-size")) * text.getScreenCTM()!.a
            );
          }),
        );
      expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12.9);
      const map = page.getByTestId("graph-scroll-area");
      const scroll = await map.evaluate((element) => ({
        width: element.scrollWidth,
        visible: element.clientWidth,
        verticalOverflow: element.scrollHeight - element.clientHeight,
      }));
      expect(scroll.verticalOverflow).toBeLessThanOrEqual(1);
      if (width === 1440) expect(scroll.width - scroll.visible).toBeLessThan(2);
      else expect(scroll.width).toBeLessThan(1500);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const methodWidth = (await page
        .getByTestId("method-artboard")
        .boundingBox())!.width;
      expect(methodWidth).toBeLessThanOrEqual(width - 48);
      await map.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        element.scrollTop = element.scrollHeight;
      });
      const finalText = page
        .getByTestId("graph-operation")
        .last()
        .locator("text")
        .last();
      await finalText.scrollIntoViewIfNeeded();
      await expect(finalText).toBeInViewport();
      // Capture the viewport without locator.screenshot scrolling the pan area
      // back to its own origin (which would hide the final operation again).
      const mapBox = (await map.boundingBox())!;
      const clip = {
        x: mapBox.x,
        y: Math.max(0, mapBox.y),
        width: mapBox.width,
        height:
          Math.min(1000, mapBox.y + mapBox.height) - Math.max(0, mapBox.y),
      };
      const labelBox = (await finalText.boundingBox())!;
      expect(labelBox.y).toBeGreaterThanOrEqual(clip.y);
      expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(
        clip.y + clip.height,
      );
      expect(await page.screenshot({ clip })).toMatchSnapshot(
        `deep-${view}-map-end-${width}.png`,
      );
    }
  });
}

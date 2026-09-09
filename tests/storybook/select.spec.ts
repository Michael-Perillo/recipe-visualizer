import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`select menu is themed and accessible in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 500 });
    await page.goto(`/iframe.html?id=controls-select--default&viewMode=story&globals=theme:${theme}`);
    const trigger = page.getByRole("combobox", { name: "Timing unit" });
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("option", { name: "Minutes", exact: true })).toHaveAttribute("aria-selected", "true");
    const accessibility = await new AxeBuilder({ page })
      .include(".story-surface")
      // Focus guards immediately forward focus; test their Tab behavior below.
      .exclude("[data-base-ui-focus-guard]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`select-${theme}.png`);
    await page.getByRole("option", { name: "Hours", exact: true }).click();
    await expect(trigger).toHaveText("Hours");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("listbox")).toBeHidden();
  });
}

test("select supports keyboard, typeahead, cancellation, and clearing", async ({ page }) => {
  await page.goto("/iframe.html?id=controls-select--clearable&viewMode=story");
  const trigger = page.getByRole("combobox", { name: "Final operation" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("3. Cool and slice");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveText("3. Cool and slice");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("option", { name: "Choose an operation" }).click();
  await expect(trigger).toHaveText("Choose an operation");

  await page.goto("/iframe.html?id=controls-select--default&viewMode=story");
  const timing = page.getByRole("combobox", { name: "Timing unit" });
  await timing.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("hours");
  await page.keyboard.press("Enter");
  await expect(timing).toHaveText("Hours");
  await timing.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(timing).toHaveAttribute("aria-expanded", "false");
  await timing.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(timing).toHaveAttribute("aria-expanded", "false");
});

test("disabled select and disabled options cannot be chosen", async ({ page }) => {
  await page.goto("/iframe.html?id=controls-select--disabled&viewMode=story");
  await expect(page.getByRole("combobox")).toBeDisabled();
  await page.goto("/iframe.html?id=controls-select--keyboard-selection&viewMode=story");
  const trigger = page.getByRole("combobox");
  // The story's play function finishes with focus returned after Escape.
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText("Minutes");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(page.getByRole("option", { name: "Hours", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveText("Minutes");
});

test.describe("touch dropdown", () => {
  test.use({ viewport: { width: 390, height: 600 }, isMobile: true, hasTouch: true });
  for (const theme of ["light", "dark"]) {
    test(`long menu fits and scrolls on mobile in ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=controls-select--recipe-library&viewMode=story&globals=theme:${theme}`);
      const trigger = page.getByRole("combobox", { name: "Active recipe" });
      await trigger.tap();
      const popup = page.locator(".rv-select-popup");
      await expect(popup).toBeVisible();
      const bounds = (await popup.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(600);
      await expect(page.getByRole("option").first()).toHaveCSS("min-height", "44px");
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`select-mobile-${theme}.png`);
      const last = page.getByRole("option", { name: "Recipe 25 · Weekend baking" });
      await last.scrollIntoViewIfNeeded();
      await last.tap();
      await expect(trigger).toHaveText("Recipe 25 · Weekend baking");
      await expect(page.getByRole("listbox")).toBeHidden();
    });
  }
});

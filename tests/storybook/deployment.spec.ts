import { expect, test } from "@playwright/test";

test("hosted Storybook supports sidebar navigation and refreshed story links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/?path=/story/workspace-recipe-studio--brownies");
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.getByLabel("Recipe title")).toHaveValue(
    "Espresso Brownies",
  );
  await page
    .locator('a[href="/?path=/story/workspace-recipe-studio--empty-draft"]')
    .click();
  await expect(page).toHaveURL(
    /\?path=\/story\/workspace-recipe-studio--empty-draft$/,
  );
  await expect(preview.getByLabel("Recipe title")).toHaveValue("Untitled recipe");
  await page.reload();
  await expect(preview.getByLabel("Recipe title")).toHaveValue("Untitled recipe");

  await page.goto("/?path=/docs/controls-button--docs");
  await expect(preview.locator(".sbdocs-wrapper")).toBeVisible();
  await page.reload();
  await expect(preview.locator(".sbdocs-wrapper")).toBeVisible();
  expect(errors).toEqual([]);
});

test("hosted Storybook serves its index and branded assets", async ({ request }) => {
  const index = await request.get("/index.json");
  expect(index.ok()).toBe(true);
  expect((await index.json()).entries).toHaveProperty(
    "workspace-recipe-studio--brownies",
  );

  for (const asset of ["favicon-32x32.png", "apple-touch-icon.png"]) {
    const response = await request.get(`/${asset}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

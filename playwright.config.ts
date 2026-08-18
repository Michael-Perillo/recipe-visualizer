import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:4173/recipe-visualizer/",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    colorScheme: "light",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "npm run preview:pages -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/recipe-visualizer/",
    reuseExistingServer: !process.env.CI,
  },
});

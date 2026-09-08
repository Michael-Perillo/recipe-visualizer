import { expect, test } from "@playwright/test";

// Intentionally fails only the App check on this disposable validation branch.
// Never merge this file into main.
test("production gate rejects an app-only failure", () => {
  expect("blocked by the App check").toBe("promoted to production");
});

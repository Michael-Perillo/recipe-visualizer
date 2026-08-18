import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base:
    process.env.VITE_BASE_PATH ??
    (process.env.GITHUB_ACTIONS ? "/recipe-visualizer/" : "/"),
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

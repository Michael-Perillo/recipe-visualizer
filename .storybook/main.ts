import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: "@storybook/react-vite",
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  // App base-path overrides must not leak into this independent component library.
  viteFinal: async (config) => ({ ...config, base: "./" }),
};

export default config;

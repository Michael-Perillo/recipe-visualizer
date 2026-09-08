import type { Preview } from "@storybook/react-vite";
import "@fontsource-variable/manrope";
import "../src/index.css";
import "./storybook.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Recipe Visualizer color theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "Paper / light" },
          { value: "dark", title: "Ink / dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <div
        className={`rv-theme story-surface ${context.globals.theme === "dark" ? "dark" : ""}`}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile: {
          name: "Mobile · 390 × 844",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        desktop: {
          name: "Desktop · 1440 × 1000",
          styles: { width: "1440px", height: "1000px" },
          type: "desktop",
        },
      },
    },
    options: {
      storySort: {
        order: ["Foundations", "Controls", "Editor", "Diagrams", "Workspace"],
      },
    },
  },
};

export default preview;

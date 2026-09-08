import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  layoutCustomisations: {
    showPanel: (state, defaultValue) =>
      state.storyId === "foundations-design-kitchen--overview"
        ? false
        : defaultValue,
  },
  theme: create({
    base: "light",
    brandTitle: "Recipe Visualizer / Design kitchen",
    brandImage: "./favicon-32x32.png",
    colorPrimary: "#638d22",
    colorSecondary: "#48651d",
    appBg: "#f4f3ec",
    appContentBg: "#fbfaf5",
    appBorderColor: "#d8d6cc",
    appBorderRadius: 10,
    fontBase: '"Manrope Variable", system-ui, sans-serif',
    textColor: "#171714",
    barSelectedColor: "#48651d",
  }),
});

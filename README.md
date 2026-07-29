# Recipe Visualizer

A local-first recipe editor that turns structured recipes into matrix and flow
diagrams. Recipes stay in the browser and can be exported as portable JSON,
SVG, or PNG files.

## Development

```bash
npm install
npm run dev
```

Run the complete local verification suite with:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests and builds the app before
deploying `dist` from the `main` branch. In GitHub, set **Settings → Pages →
Source** to **GitHub Actions**. The Vite production base is
`/recipe-visualizer/`.

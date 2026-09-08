# Recipe Visualizer

![Recipe Visualizer banner](public/og.png)

Recipe Visualizer is a local-first recipe editor that turns structured cooking
instructions into expressive matrix and flow diagrams. It is a client-side
portfolio project built around a simple idea: a recipe can be both a document
you edit and a system you can see.

Recipes stay in the browser. They can be scaled to a target serving count and
exported as portable Recipe Visualizer JSON, self-contained SVG, or high-
resolution PNG files.

## What it does

- Builds recipes from ingredients, prep notes, and dependency-linked
  operations.
- Captures method, timing ranges, equipment, speed or heat settings, and
  visual doneness cues for each operation.
- Switches between a process-oriented flow view and an ingredient-oriented
  matrix view.
- Scales primary quantities and structured alternate measurements together;
  freeform ingredient notes intentionally remain unscaled.
- Supports light and dark presentation, responsive zooming, mobile
  editor/preview switching, and accessible SVG descriptions.
- Saves a library of up to 50 recipes locally, flushes pending edits when the
  page is hidden, and coordinates changes between browser tabs.
- Validates imports before adding them and normalizes valid operations into
  dependency-first editor order.

## Product walkthrough

1. Choose the sample recipe, duplicate it, or create a blank recipe.
2. Add ingredients and optional alternate amount/unit pairs. Add a note only
   for context that should not scale. Choose a dry, liquid, or neutral line
   style, then optionally add featured emphasis without changing that line.
3. Add operations, record their timing and sensory cues, and select the
   ingredient or earlier-operation inputs each one consumes.
4. Name the final dish and select its final operation. The recipe is marked
   ready only after its numeric values and graph are valid.
5. Preview the matrix or flow diagram, choose a serving count, and export JSON,
   SVG, or PNG.

The editor deliberately applies practical portfolio-scale bounds: 40
ingredients, 24 operations, 8 prep notes, and two alternate measurements per
ingredient. Field lengths are bounded, while diagram labels and instructions
wrap in full rather than being ellipsized.

## Architecture and data flow

The application is React + TypeScript on Vite. Zod validates serialized data;
the domain layer performs graph and numeric checks that go beyond JSON shape
validation.

```mermaid
flowchart LR
  Editor["React recipe editor"] --> Document["RecipeDocumentV1"]
  Import["JSON import"] --> Shape["Zod shape validation"]
  Shape --> Semantics["Numeric + graph validation"]
  Semantics --> Document
  Document --> Graph["Tree graph + dependency order"]
  Graph --> Matrix["Responsive matrix SVG"]
  Graph --> Flow["Responsive flow SVG"]
  Document --> Storage["Debounced localStorage library"]
  Storage --> Recovery["Recovery copy + salvage"]
  Matrix --> Export["SVG / PNG export"]
  Flow --> Export
```

The diagram renderers calculate their view boxes from graph depth, complete
dynamically wrapped text, and a shared numbered method key containing the
complete cooking instructions. Featured ingredients use an emphasis marker
independent of their dry, liquid, or neutral line geometry. The method cards
form a responsive arrowed sequence with cue panels aligned along
each row. The persistence layer keeps optional `updatedAt` and `originId`
metadata outside recipe documents so existing version 1 exports remain
compatible.

## Local data, recovery, and multiple tabs

There is no account, server database, analytics pipeline, or cloud sync.
Libraries are stored under `recipe-visualizer:library:v1` in local storage.

If saved state is malformed, the original payload is copied to
`recipe-visualizer:library:v1:recovery` before any replacement is written.
Individually valid recipes are salvaged when possible. The in-app recovery
notice can download the raw recovery JSON or reset local data after
confirmation. If the recovery copy cannot be created, the primary value is
left untouched.

Newer changes from another tab load automatically only when the current tab
has no pending edits. Concurrent edits produce an explicit choice to load the
other tab or keep and publish the current tab; the app does not pretend to do
record-level merging.

## JSON compatibility and graph model

Recipe documents use `schemaVersion: 1`. Structured alternate measurements,
operation timing/tool/setting/cue fields, ingredient `featured` emphasis, and
persistence coordination metadata are additive and optional, so earlier
version 1 exports without them remain importable. Legacy ingredients using
`visualStyle: "featured"` remain supported and are rendered with inferred line
geometry plus the new emphasis marker. Legacy `durationMinutes` values remain
supported and are converted to structured timing when edited. Import files are
limited to 1 MB and pass file-size, Zod-shape, and semantic graph validation
before being added.

Version 1 intentionally models a tree, not a general branching graph. An
ingredient or intermediate preparation can feed only one later operation.
When a recipe divides batter, reserves a sauce, or reuses an ingredient at
different points, represent those portions as separate quantities. This keeps
layout, ordering, and editing behavior predictable without hiding the
limitation.

## Accessibility

- Semantic controls and explicit labels cover recipe editing, view switching,
  saving, conflicts, recovery, and export actions.
- Each diagram is an SVG image with a title and description.
- Keyboard focus remains stable while editing prep notes.
- Light and dark themes retain the high-contrast visual language.
- Playwright runs axe checks for serious and critical violations on desktop
  and mobile fixtures.

## Development and testing

### Design kitchen / Storybook

```bash
npm run storybook          # http://127.0.0.1:6006
npm run build-storybook    # standalone output in storybook-static/
npm run test:storybook     # build, then test that static output on port 6007
```

Storybook uses the real React components and app styles, not a separate mock UI.
Start in **Foundations → Design kitchen** for the visual language, then explore
buttons and field states, complete/empty editors, both diagrams, and the full
workspace. The theme toolbar switches Paper/light and Ink/dark; the viewport
menu includes 390 px mobile and 1440 px desktop sizes. **Method cards** has a
width control for inspecting one-, two-, and three-column arrowed layouts.
The width control sets a maximum: standalone cards and complete diagrams both
measure the available display width and reflow, keeping instructions and cues
at about 16 px at normal zoom. Time, temperature, tool and setting are explicitly
labeled in each card, with full method text and a separate “Look for” panel.
Process maps fit the available width within a 65–85% reading scale and enlarged
flow labels (13–17 px at normal zoom). Compact operation spacing and an in-node
finished-dish label reduce horizontal panning. The map has no separate vertical
scrollbar; narrow screens can still pan horizontally. Below 1280 px the workspace
uses editor/preview tabs so the editor doesn't squeeze a readable chart into a
narrow side panel. Zoom affects only the map; the method remains fitted to the
panel below it. The **Method ↓** shortcut
jumps to the instructions. Both the app and full-diagram stories use the same
`RecipeDiagram` presentation, and isolated method stories use its `MethodDiagram`.
SVG and PNG exports combine the entire un-cropped map and full method on a
single sheet at a consistent native type scale, independent of screen pan/zoom.
PNG exports use up to 2× resolution, capped at 32 megapixels and 16,384 px per side.
Minimal and long-text/deep-chain stories share the browser-test fixtures.

Editor and workspace stories run with an in-memory `AppStateProvider`. They
never read or write the saved browser library, listen to its cross-tab events,
or change the document theme. Story edits reset when the story is remounted
(including a theme change). The app itself still persists normally.
The bundled brownie example is not a migration of existing saved recipes:
older local copies keep their original instructions. The **Legacy instructions**
story covers sparse older data without inventing missing metadata or cues.
The original saved brownie can be explicitly replaced using **Recipe file menu →
Restore brownie example**. This requires confirmation and leaves other recipes
and serving preferences unchanged; export the old JSON first to keep a backup.

Design tokens live in `src/styles/design-system.css`; reusable buttons,
statuses, section headings, and view selectors live in `src/components/ui.tsx`.
The system uses a 40 px control rhythm, 10 px control corners, 16 px panel
corners, quiet section icons, visible keyboard focus, and lime for selected
states and primary actions. Keep the SVG palette in `diagram/shared.tsx`
aligned with those tokens: exports need literal colors to remain standalone.

The Storybook suite renders every story, checks typing interactions, runs
light/dark workspace accessibility and storage-isolation checks, and maintains
desktop/mobile workspace snapshots. CI builds and tests Storybook separately;
only the app's tested `dist/` is deployed to Pages. No Storybook hosting or
third-party visual-testing account is required; telemetry is disabled.

### App commands

Use Node.js 22 to match CI:

```bash
npm install
npm run dev
```

The verification commands are:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` creates the production Pages build and runs Playwright
against `vite preview` at `/recipe-visualizer/`. The browser suite covers
persistence, recovery, cross-tab conflicts, imports, scaling, SVG/PNG exports,
responsive diagrams, accessibility, and desktop/mobile visual baselines.

Before an approved release, `npm run audit:prod` checks production dependency
advisories with `npm audit --omit=dev`. Advisory changes are reviewed rather
than used as a nondeterministic blocking CI gate.

## GitHub Pages deployment

The workflow in `.github/workflows/pages.yml` pins third-party actions to full
commit SHAs. Its test job installs dependencies, lints, typechecks, runs unit
and component tests, creates the Pages build once, and tests that exact
artifact. The same `dist` directory is uploaded and deployed without a second
build.

In GitHub, set **Settings → Pages → Source** to **GitHub Actions**. The
production Vite base is `/recipe-visualizer/`. Pushes to `main` deploy after the
test job passes; pull requests run the same verification without deploying.
Dependabot is configured for npm and GitHub Actions updates.

A public site link is intentionally omitted until this checkout has a real
repository origin and confirmed Pages deployment URL.

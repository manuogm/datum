# Datum

Visual engineering tools for mechanical design, built to replace complex spreadsheets.
Runs entirely in the browser: no backend, no accounts, no CAD integration.

Live site: https://manuogm.github.io/datum/

## Tools

| Tool | Standard | Status |
| --- | --- | --- |
| Fit tolerance calculator | ISO 286-1/-2 | In progress |
| Bolted joint design helper | VDI 2230 | Planned |
| Composite laminate optimizer | Classical laminate theory | Planned |

## How the code is organised

```
src/
  app/            Application shell: navigation, layout, theme
  core/           Shared building blocks: units, number formatting, PDF report export
  tools/
    fits/
      calc/       Pure ISO 286 calculations and tables, with tests (no UI code)
      ui/         Screens for the fit calculator
```

Every calculation lives in a `calc/` folder as plain functions with no UI code.
Each table and formula cites the clause of the standard it comes from, and each
calculation is checked by tests against worked examples from the standard.

## Running locally

```
npm install
npm run dev     # local dev server
npm test        # calculation tests
npm run build   # production build into dist/
```

Pushing to `main` deploys to GitHub Pages (enable Pages with source "GitHub Actions"
in the repository settings once).

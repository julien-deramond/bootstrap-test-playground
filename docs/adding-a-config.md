# Adding a config

Use this when you want to try a design system, a palette or a set of Bootstrap options, and keep it as something the toolbar, the matrix and the test suites can switch to. A config is three style files and a README in `configs/<name>/`. [Customizing](customizing.md#configs) describes what they are.

## Start from the working copy

The working copy lives in `src/styles/`. Begin from Bootstrap's defaults, or from a config close to what you want:

```sh
npm run use-config default     # or another config; it refuses to run over uncommitted changes
npm run dev
```

Then change the three files:

- `main.scss`: replace `@use "bootstrap/scss/bootstrap";` with a `with (…)` block for Sass options, `$theme-colors`, `$root-tokens` and component `$*-tokens`.
- `tokens.css`: runtime custom properties, for what you want to test without Sass.
- `_custom.scss`: rules that tokens can't express.

Both routes don't always give the same result. [Sass or tokens.css](../configs/README.md#sass-or-tokenscss) lists the differences.

## Port a design system

Start with its tokens, not its look. List the design system's radius, spacing, type scale, palette and control heights, then map each to the Bootstrap option or token that carries it. Put the ones Sass derives from (`$radius`, `$spacer`, `$theme-colors`, `$font-family-base`) in `main.scss` so utilities follow, and the rest in `$root-tokens` or the component token maps. Keep `_custom.scss` for what is left, and comment each rule with the token you wished existed. Those comments are the gaps to report.

[`configs/pill/`](../configs/pill/) is the smallest example: one `$radius` value in `main.scss`, and a README that says what to look at. [`configs/shadcn/`](../configs/shadcn/) is the large one: a full re-theme in `main.scss`, a short `_custom.scss`, and a README whose *Known gaps* link a tracking issue for each missing token.

## Save it

```sh
npm run save-config rounded-dark -- "Large radii and a dark-first palette" --category themes
```

The name takes lowercase letters, digits and dashes. The categories are `shape`, `color`, `typography`, `layout`, `options`, `sass` and `themes`. This creates `configs/rounded-dark/` with a README from [the template](../scripts/templates/config/README.md) and updates the table in `configs/README.md`.

Fill in the README: a first paragraph that says what the config is for (the toolbar shows it), then *What it stresses*, *Pages to check* and *Known gaps*. Each known gap links its tracking issue, as [Reproducing an issue](reproducing-an-issue.md) describes. Then:

```sh
npm run configs-table
npm run check-configs
```

`configs-table` refreshes `configs/README.md`, and CI fails when it's stale. `check-configs` compiles the new config and lists Sass errors and warnings.

## Look at it

Pick the config in the toolbar's *Config* list, or add `?config=rounded-dark` to any URL. To see what it changes against the others, render a page under several configs:

```sh
npm run matrix -- components-button#sizes --configs=default,rounded-dark
```

This writes a grid to `reports/page-matrix/` and prints how many pixels of each cell differ from the first column. [Matrix](pages.md#matrix) has the options, and the same grid is at `/matrix.html`.

## Check it

```sh
A11Y_CONFIGS=rounded-dark npm run test:a11y
npm run report:contrast -- --config rounded-dark
```

Custom palettes are where contrast and focus rings break. The scan lists each violation with the page and the colors axe measured, and the contrast report measures every documented color pairing. A violation Bootstrap causes becomes a tracking issue, and a known one gets an entry in `tests/a11y/known-issues.js` with its number. See [Accessibility scan](testing.md#accessibility-scan).

Pull requests that add or change a config run the console crawl and the smoke tests with it, scoped to that config. `npm run test-scope` shows what they will run.

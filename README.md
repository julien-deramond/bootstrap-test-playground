# Bootstrap test playground

A Vite multi-page playground for testing [Bootstrap v6](https://github.com/twbs/bootstrap/tree/v6-dev) (`v6-dev` branch) and reproducing issues. Every screen or reproduction is a plain HTML file, and Sass and CSS changes hot-reload.

Out of the box it renders **Bootstrap's defaults**: nothing is configured in Sass and no CSS custom property is overridden. The customization entry points are already wired up, so testing a change means uncommenting a few lines.

## Quick start

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The home page lists every page, with search and filters (see [Finding pages](#finding-pages)).

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` / `npm run preview` | Builds every page to `dist/` and serves the build |
| `npm run test:visual [-- -u]` | Screenshots every page and compares with the baselines (see [Visual regression tests](#visual-regression-tests)) |
| `npm run test:console` | Opens every page and fails on errors, warnings and failed requests (see [Console crawl](#console-crawl)) |
| `npm run check-configs [-- --strict]` | Compiles the working copy, every config and every reproduction, and lists Sass errors and warnings (see [Checking configs](#checking-configs)) |
| `npm run check-dist` | Checks that the default config compiles to Bootstrap's `dist/css/bootstrap.css` (see [Checking the dist](#checking-the-dist)) |
| `npm run compile-matrix` | Compiles Bootstrap under combinations of its `$enable-*` options and reports failures and options that do nothing (see [Option combinations](#option-combinations)) |
| `npm run audit-tokens [-- --all \| --render]` | Lists `--bs-*` tokens that are read but never defined, or defined but never read, and with `--render` the ones overriding doesn't change (see [Auditing tokens](#auditing-tokens)) |
| `npm run new-issue 42928 [-- --config <name>]` | Creates `issues/42928/` from the reproduction template and a config |
| `npm run save-config <name> [-- "Description"]` | Saves the working copy (`src/styles/`) as `configs/<name>/` |
| `npm run use-config <name>` | Replaces the working copy with `configs/<name>/` |
| `npm run update-bootstrap` | Moves `node_modules/bootstrap` to the latest `v6-dev` commit, then runs `check-configs`, `check-dist`, `audit-tokens` and `compile-matrix` against it |
| `npm run sync-kitchen-sink -- ../twbs/bootstrap` | Regenerates `kitchen-sink/` from a Bootstrap checkout's docs |

## Where Bootstrap comes from

By default, Bootstrap is installed from GitHub (`github:twbs/bootstrap#v6-dev`), and `package-lock.json` pins the commit. Run `npm run update-bootstrap` to move to the latest commit. The toolbar and home page show which commit is in use.

Dependabot updates the playground's other dependencies and its GitHub Actions every week, but never `bootstrap`, so each Bootstrap update stays a deliberate `npm run update-bootstrap`.

To test a **local checkout** instead, such as a branch you're working on:

```sh
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Vite then resolves every `bootstrap/...` import (Sass and JS) to that folder, and edits there hot-reload too. Delete `.env.local` to go back to GitHub.

The playground builds Bootstrap from **source**, the way Bootstrap's own build does:

- **CSS** is compiled from `scss/`, then `postcss.config.js` applies the same PostCSS step as Bootstrap's `build/postcss.config.mjs`. That step adds the `--bs-` prefix to every custom property and runs Autoprefixer with Bootstrap's `.browserslistrc`. The output matches `dist/css/bootstrap.css` (see [Checking the dist](#checking-the-dist)), and the builds keep `light-dark()` intact.
- **JavaScript** is imported from `js/src/index.ts`, so the playground runs the branch's current code even when the committed `js/dist/` hasn't been rebuilt yet. To test the prebuilt files instead, import `'bootstrap'` in `src/js/main.js`.

### Checking the dist

Findings here only carry over upstream if the playground compiles Bootstrap the way Bootstrap does. `npm run check-dist` compiles `configs/default/` the way Vite does and compares the result with Bootstrap's committed `dist/css/bootstrap.css`, rule by rule. It ignores comments, the banner, the source map and formatting:

```
✗ playground vs dist: 1 changed, 1 only in playground
    changed: @layer components > .badge
    only in playground: @layer components > .badge-dot
    full diff: reports/dist/playground-vs-dist.diff
```

A difference means one of two things: the playground's pipeline moved away from Bootstrap's build, or Bootstrap's source moved and nobody rebuilt the committed dist, as in [#1](https://github.com/julien-deramond/bootstrap-test-playground/issues/1). With `BOOTSTRAP_PATH` pointing to a checkout that has its dependencies installed, the script also runs Bootstrap's own build, with the checkout's Sass and `build/postcss.config.mjs`, and tells the two apart:

```
✓ pipeline (playground vs Bootstrap’s build): no drift
✗ dist (committed dist vs Bootstrap’s build): 3 changed
```

The normalized CSS and the full diffs go to `reports/dist/`. `npm run update-bootstrap` runs the check after each update, and so does the *Configs* workflow on every pull request, which uploads `reports/dist/` as the *dist-drift* artifact when it fails. When the `dist` line fails, record it as an upstream issue (see [Upstream issues](#upstream-issues)). When the `pipeline` line fails, update `postcss.config.js` to match Bootstrap's `build/postcss.config.mjs`.

### Auditing tokens

A token that is read but never defined silently drops its declaration. A token that is defined but never read does nothing when you override it. Both are easy to miss and easy to detect. `npm run audit-tokens` compiles every config, reads its `--bs-*` custom properties and reports four kinds of findings, each with the Sass file and line:

| Kind | Meaning |
| --- | --- |
| `undefined` | Read without a fallback and never defined. Usually a bug, like a renamed token |
| `hook` | Read with a fallback and never defined: a customization hook, listed so a new one stands out |
| `unused` | Defined and never read: a scale meant for users, or a dead token |
| `foreign` | Defined only on one component and read on an unrelated selector, which is usually intended composition, like `.combobox-toggle.form-control` |

[`scripts/known-tokens.mjs`](scripts/known-tokens.mjs) lists the known findings, each with its tracking issue or the reason it is intended. By default the report only shows the others, so it stays empty until something changes:

```
✓ configs/default: 0 new, 276 known
✗ configs/rounded: 1 new, 276 known
  Read without a fallback, never defined (undefined): 1
    --probe-color
      .probe  configs/rounded/_custom.scss:14
```

`-- --all` lists the known findings too. The audit fails on a new finding, and on a known entry that no longer matches anything, so a fix upstream gets noticed. `npm run update-bootstrap` runs it after each update, and the *Configs* workflow on every pull request. Record a new bug as an upstream issue (see [Upstream issues](#upstream-issues)) and add it to `known-tokens.mjs` with the issue number.

The static audit can't see a token that is read but shadowed, like the hard-coded radius next to `--check-border-radius` ([#4](https://github.com/julien-deramond/bootstrap-test-playground/issues/4)). `npm run audit-tokens -- --render` checks the rendering instead. It starts a dev server, and for each of the ~630 component tokens of `configs/default`:

1. It finds an element that defines the token and contains one that reads it, on the kitchen sink pages first, then the other pages.
2. It overrides the token there with a series of test values (a color, a length, a keyword, `none`…).
3. It compares computed styles, including the `::before`, `::after`, `::backdrop`… that read it, then screenshots.

It takes about four minutes and writes one line per token to `reports/tokens/render.md`: *effective*, *no visible effect*, *not read*, or why it couldn't tell (no example on any page, or a hover or focus state the pages don't show). A token with no visible effect on a page may be masked there by a utility or the page's own CSS, so check the page before filing it upstream.

### Option combinations

`scss/_config.scss` has a dozen `$enable-*` flags, plus `$color-mode-type`, and they interact: shadows and gradients, grid and CSS grid, transitions and reduced motion. `npm run compile-matrix` compiles Bootstrap under 94 combinations in a few seconds: the defaults, every flag on, every flag off, each option toggled alone and each pair of options toggled together. It fails when:

- a combination doesn't compile, and it names the combination;
- toggling an option leaves the CSS byte-identical, meaning the option does nothing;
- toggling one option changes nothing once another is toggled, although it does on its own, meaning the first masks it.

```
Combination            Status  Size      Δ default  Rules  Warnings  Notes
default                ok      481.4 KB  ±0         4419   0
all-off                ok      418.7 KB  −62.6 KB   3794   0
caret=false            ok      481.4 KB  ±0         4419   0         identical to default
rounded=false          ok      469.2 KB  −12.1 KB   4366   0
✓ caret: toggling it leaves the CSS byte-identical (known: #129)
```

Options known to do nothing are listed in [`scripts/known-options.mjs`](scripts/known-options.mjs), with their tracking issue or the reason. The full table is in `reports/matrix/summary.md`, and each combination's CSS is next to it, ready to diff. `npm run update-bootstrap` runs the matrix after each update, and so does the *Configs* workflow.

## Customizing

The styles for the shared pages come from three files in `src/styles/`, the **working copy**. Out of the box they're empty or commented out, so the output is Bootstrap's defaults.

| File | Use it for |
| --- | --- |
| [`main.scss`](src/styles/main.scss) | **Sass configuration**: swap `@use "bootstrap/scss/bootstrap";` for the commented `with (...)` version (options, `$root-tokens`, `$theme-colors`, component `$*-tokens`) |
| [`_custom.scss`](src/styles/_custom.scss) | **Custom Sass rules**, in Bootstrap's `custom` cascade layer, with access to Bootstrap's mixins and functions |
| [`tokens.css`](src/styles/tokens.css) | **Runtime CSS custom properties**, no Sass needed |

In `tokens.css`, write tokens unprefixed like the Sass docs (`--border-radius`) or prefixed like the dist CSS (`--bs-border-radius`). Both end up as `--bs-*`. Where you put an override matters:

- **Global tokens** (`:root`) must stay **unlayered**. Bootstrap outputs its `:root` tokens unlayered, so an override inside `@layer custom { :root { … } }` loses.
- **Component tokens and rules** go in `@layer custom`, after `components` and before `helpers` and `utilities`.

### Configs

Once the working copy holds a good test case, save it as a **config**, a folder in [`configs/`](configs/) with the same three files:

```sh
npm run save-config rounded-dark -- "Large radii and a dark-first palette"
```

Then:

- **Preview it on any page** with the toolbar's *Styles* menu, or with `?config=rounded-dark` in the URL. The shared stylesheets are swapped live, and the page doesn't need a reload.
- **Start a reproduction from it**: `npm run new-issue 42928 -- --config rounded-dark`
- **Make it the working copy**: `npm run use-config rounded-dark`. This refuses to run if `src/styles/` has uncommitted changes, unless you pass `-- --force`.

`configs/default/` holds Bootstrap's defaults. Keep it pristine; `npm run use-config default` resets the working copy. `configs/shadcn/` recreates shadcn/ui's default theme (see [Real screens](#real-screens)).

### Checking configs

A config only compiles when a page uses it, so a Bootstrap update that renames a Sass variable or a token map can break one without anyone noticing. `npm run check-configs` compiles `main.scss` of the working copy, of every folder in `configs/` and of every reproduction in `issues/`. It uses Sass, then `postcss.config.js`, the way Vite does, and runs `tokens.css` through PostCSS too:

```
Bootstrap: twbs/bootstrap#v6-dev @ 624c7b98c

✓ src/styles
✓ configs/default
! configs/shadcn: 1 warning
    Deprecation [color-functions]: darken() is deprecated. …
      at configs/shadcn/_custom.scss:15:13
✗ issues/42928: This variable was not declared with !default in the @used module.
    at issues/42928/main.scss:10:39
```

It exits with an error when a folder fails to compile, and with `-- --strict` when there is any warning, `@warn` and Sass deprecations included. It honors `BOOTSTRAP_PATH`, like the dev server. `npm run update-bootstrap` runs it against the newly installed commit. [`.github/workflows/configs.yml`](.github/workflows/configs.yml) runs it on every pull request and every push to `main`, and shows each warning as an annotation.

## Pages

```text
index.html               Home: every page, with search and filters
pages/                   Starter screens (dashboard, checkout and sign-in forms, product and pricing marketing)
screens/                 Real app screens ported from shadcn/ui (dashboard, tasks, authentication, playground, cards, login and signup blocks)
kitchen-sink/            One page per component or form doc, with all of its docs examples (generated)
compare.html             Side-by-side comparison of any page
issues/<name>/           Issue reproductions (index.html + the three config files)
src/styles/              Working copy of the styles (see Customizing)
configs/<name>/          Saved configs; configs/default/ is Bootstrap's defaults
src/js/main.js           Shared entry: Bootstrap JS, demo wiring, config switcher, toolbar
src/js/page-index.js     Page list and search, shared by the home page and the page switcher
public/                  Favicon and the early preferences script
scripts/                 new-issue, save-config, use-config, sync-kitchen-sink, issue template
tests/visual/            Visual regression suite (Playwright) and its baselines
```

Every `.html` file under `pages/`, `screens/`, `kitchen-sink/` and `issues/` is picked up automatically. There's no list to maintain.

### Finding pages

- **Home page**: search by title, description, tag, source or example heading, then narrow down by group and tag. Press <kbd>/</kbd> to focus the search, <kbd>Enter</kbd> to open the first result and the arrow keys to move through them. Filters live in the URL (`/?q=menu&tag=forms`), so a filtered list can be shared. Switch between the grid and a denser list, and find recently viewed pages at the top.
- **Page switcher**: press <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd> on macOS) on any page, or use *Search* in the toolbar. A search that matches an example heading jumps straight to it, like `tool place` for the tooltip *Placement* example.
- **Previous and next**: the toolbar's <kbd>‹</kbd> <kbd>›</kbd> flip through the pages of the current group.

Each page describes itself in its `<head>`, and the index picks it up:

```html
<title>Screens: Tasks</title>                             <!-- group prefixes like "Screens:" are dropped -->
<meta name="description" content="One line about the page.">
<meta name="playground-tags" content="table, forms, menu">
<meta name="playground-source" content="…" data-url="…">  <!-- see Real screens -->
```

Without a description, the header's lead paragraph (`.fs-lg`) is used. Every `<h2 id="…">` becomes a searchable example heading. Kitchen sink pages are tagged `components` or `forms`. Give new pages a description and a few tags, reusing existing tags where they fit, so they stay easy to find.

### Starter screens

Adapted from Bootstrap's own examples (`site/src/assets/examples/`). Like the real screens, each one credits its source with a `playground-source` meta tag (see below). They load the shared styles, so they show the working copy, or whichever config you pick in the toolbar.

### Real screens

Modern application screens ported from [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT): its examples (`apps/v4/app/(app)/examples/`), the cards showcase from its home page, and its login and signup blocks. Each one is rebuilt with Bootstrap v6 components and utilities, and the little custom CSS they need sticks to Bootstrap's tokens. That way they follow the color mode, the direction, the *Primary* hue and the configs. Charts are inline SVG, so there's no chart library.

They're meant as realistic test beds: the places where a screen needs custom CSS point to what Bootstrap is missing.

To see how close Bootstrap can get to the originals, open them with the `shadcn` config (*Styles* in the toolbar, or `?config=shadcn`). It configures Bootstrap with shadcn/ui's default theme: neutral palette, near-black primary, `.625rem` radius, Geist, 36px controls and outer focus rings. See [`configs/shadcn/`](configs/shadcn/).

Each screen credits its source with a `<meta name="playground-source" content="…" data-url="…" data-license="…">` tag in its `<head>`. The toolbar then shows "Adapted from …" with a permalink to the shadcn/ui commit it was ported from, even when collapsed, and the home page lists it next to the page. Any other page adapted from elsewhere can use the same tag.

### Kitchen sink

`kitchen-sink/*.html` is generated from the live examples in the v6 docs (`site/src/content/docs/{components,forms}/*.mdx`), so it always uses the current markup. The npm package doesn't ship the docs, so regenerating needs a Bootstrap checkout:

```sh
npm run sync-kitchen-sink -- ../twbs/bootstrap   # or rely on BOOTSTRAP_PATH in .env.local
```

Don't edit these files by hand. They're overwritten on every sync.

### Issue reproductions

```sh
npm run new-issue 42928                          # from configs/default (Bootstrap's defaults)
npm run new-issue pg-3 -- --config rounded-dark  # from a saved config
npm run new-issue pg-4 -- --config working       # from the working copy
```

This creates `issues/<name>/` with an `index.html` and a copy of the config's three files, served at `/issues/<name>/`. A numeric name links to `twbs/bootstrap#<name>`. Each reproduction **compiles its own copy of Bootstrap**, so its styles stay isolated from the shared files, from other reproductions, and from the toolbar's *Styles* menu.

To share a reproduction, push the repository and link to the folder on GitHub, or open it in StackBlitz: `https://stackblitz.com/github/julien-deramond/bootstrap-test-playground`.

## Toolbar

Each page has a small floating toolbar. It renders in a shadow root, so it doesn't pick up or leak any styles.

| Control | Effect | Shortcut | URL override |
| --- | --- | --- | --- |
| Color mode | Auto (system), Light or Dark, through `data-bs-theme` on `<html>` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> cycles | `?theme=dark` |
| Direction | LTR or RTL, through `dir` on `<html>` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> toggles | `?dir=rtl` |
| Primary | Remaps the `--bs-primary-*` tokens to another hue at runtime | | `?primary=teal` |
| Styles | Swaps the working copy for a saved config | | `?config=<name>` |
| ‹ › | Previous and next page in the same group | | |
| Search | Opens the page switcher | <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd>) | |
| Compare | Opens the current page in the compare view | | |
| Reset | Back to Bootstrap's defaults | | |

Toolbar choices are saved in `localStorage` and applied before first paint by `public/playground-prefs.js`. URL parameters override them for that view only, without saving, which makes links like `/pages/dashboard.html?theme=dark&dir=rtl` shareable. `window.bootstrap` is available in the console on every page.

### Screenshot and embed flags

More URL parameters change what a page shows, for screenshots, embeds and visual tests. They combine, as in `/kitchen-sink/components-tooltip.html?chrome=0&section=placement&freeze`.

| Parameter | Effect |
| --- | --- |
| `?embed` | Hides the toolbar. The compare view uses it for its panes. |
| `?chrome=0` | Hides the toolbar and the page's own playground UI: every element marked `data-playground-chrome`, like the kitchen sink header, navigation and example headings, or the header and steps of a reproduction. Only the markup under test remains. |
| `?frame=0` | Removes the padding, border and background of the kitchen sink's `.bd-example` frames. |
| `?section=<id>` | Shows one kitchen sink example only. The id is the example heading's, as in the page's *On this page* links. |
| `?freeze` | Makes the page render the same way on every load: no animations, transitions or text caret, no smooth scrolling, carousels don't autoplay, "today" is January 15, 2026 (for the datepicker), and `Math.random` is seeded. |

Mark playground UI on a new page with `data-playground-chrome` so `?chrome=0` hides it. The kitchen sink generator and the reproduction template already do.

### Compare

[`/compare.html`](compare.html) shows any page twice, side by side, with separate theme, direction, primary and config settings, and keeps the two panes' scroll positions in sync. Presets cover Light / Dark, LTR / RTL, and Working / Default. The whole setup lives in the URL, so a comparison can be shared as a link.

## Visual regression tests

[`tests/visual/`](tests/visual/visual.spec.js) screenshots every page with [Playwright](https://playwright.dev) and compares each screenshot with a baseline, pixel for pixel. Kitchen sink pages get one screenshot per example, other pages one full-page screenshot. Pages load with `?chrome=0&freeze` (see [Screenshot and embed flags](#screenshot-and-embed-flags)), and remote images are replaced with a local placeholder, so two runs on the same machine produce identical pixels.

The suite runs against a production build served by `vite preview`, which it starts on port 4179. It builds with your `.env.local`, so `BOOTSTRAP_PATH` works here too. Once, after `npm install`:

```sh
npx playwright install chromium
```

Then, to check what a Bootstrap change does to the rendering:

```sh
npm run test:visual -- -u     # 1. record baselines from the current state
# 2. change Bootstrap: npm run update-bootstrap, a BOOTSTRAP_PATH checkout, or src/styles/
npm run test:visual           # 3. compare
npx playwright show-report tests/report   # 4. expected, actual and diff for each failure
```

After an intended change, run `npm run test:visual -- -u` again to accept the new rendering. Filter with Playwright's options, like `npm run test:visual -- -g tooltip`.

The default matrix is light and dark, LTR, with the working copy. Widen it with environment variables:

| Variable | Default | Example |
| --- | --- | --- |
| `VISUAL_THEMES` | `light,dark` | `VISUAL_THEMES=light` for a quicker run |
| `VISUAL_DIRS` | `ltr` | `VISUAL_DIRS=ltr,rtl` |
| `VISUAL_CONFIGS` | `working` | `VISUAL_CONFIGS=working,shadcn`, or `all` for every folder in `configs/` |

Baselines live in `tests/visual/screenshots/<platform>/`. Fonts and anti-aliasing differ between operating systems, so a baseline only compares with screenshots taken on the same one. Local baselines (`darwin/`, `win32/`) are ignored by git. Only `linux/`, the platform CI uses, is meant to be committed.

### In CI

[`.github/workflows/visual.yml`](.github/workflows/visual.yml) runs the suite on every pull request and every push to `main`, against the committed Linux baselines. When it fails, the *visual-report* artifact of the run holds the report: download it and open `index.html`.

When a pull request changes the rendering on purpose, such as a Bootstrap update, add the `update-baselines` label to it. CI then records new Linux baselines, commits them to the pull request's branch as `test: update the Linux visual baselines`, and removes the label. Review that commit's images before merging. This works for branches of this repository, not for forks. A push made by CI doesn't start other workflows, so the comparison runs again on the next push, or on `main` after the merge.

## Console crawl

[`tests/console/`](tests/console/console.spec.js) opens every page, including the home and compare pages, in light and dark with the working copy and every saved config. It fails on anything a page reports:

- uncaught exceptions
- `console.error` and `console.warn`, which includes Bootstrap's deprecation notices
- requests to the playground itself that fail or return an error status, like a missing asset

Remote resources, such as avatars and web fonts, are blocked, so an unreachable host never fails the run. Like the visual suite, the crawl runs against a production build on port 4179, with your `.env.local`:

```sh
npm run test:console
npm run test:console -- -g combobox   # only the pages whose URL matches
```

Each failure names the page, with its `?theme=` and `?config=`, and lists the messages.

Problems caused by an open upstream bug go in [`tests/console/known-issues.js`](tests/console/known-issues.js), with the tracking issue number, a pattern for the message and the pages where it happens. They no longer fail the run on those pages. When a listed problem stops happening on a page, the run fails, so the entry gets removed and the tracking issue moves to `upstream-fixed` (see [Upstream issues](#upstream-issues)).

Sass `@warn` output shows up in the build log, not in the browser, so the crawl doesn't see it. [`npm run check-configs`](#checking-configs) reports it.

[`.github/workflows/console.yml`](.github/workflows/console.yml) runs the crawl on every pull request and every push to `main`.

## Deployment

Every push to `main` builds the playground and deploys it to GitHub Pages at <https://julien-deramond.github.io/bootstrap-test-playground/> ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). The site lives in a subfolder, so the workflow sets `BASE_PATH=/bootstrap-test-playground/`, and the build adds that prefix to every root-relative link. To check such a build locally:

```sh
BASE_PATH=/bootstrap-test-playground/ npm run build
npx vite preview --base /bootstrap-test-playground/
```

## Upstream issues

Potential Bootstrap bugs found here are tracked as issues in this repository. Each one carries one of three labels as it moves through the process: `upstream` (not reported yet), then `upstream-reported`, then `upstream-fixed`, when the issue is closed. The workflow is in [CLAUDE.md](CLAUDE.md).

This includes the bugs the checks find: console errors, Sass warnings from Bootstrap's files, a stale dist and token findings. Each one gets a tracking issue before it's allowlisted in [`tests/console/known-issues.js`](tests/console/known-issues.js) or [`scripts/known-tokens.mjs`](scripts/known-tokens.mjs), and the allowlist entry carries the issue number. When a check reports that a known entry is gone, the fix has landed: move the issue to `upstream-fixed` and close it.

## License

[MIT](LICENSE). The starter screens and kitchen sink examples are adapted from [Bootstrap](https://github.com/twbs/bootstrap), which is also MIT-licensed. The real screens are adapted from [shadcn/ui](https://github.com/shadcn-ui/ui), MIT-licensed, see [`screens/LICENSE-shadcn-ui.md`](screens/LICENSE-shadcn-ui.md).

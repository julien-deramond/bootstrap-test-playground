# Pages and tools

## Layout

```text
index.html               Home: every page, with search and filters
pages/                   Starter screens (dashboard, checkout and sign-in forms, product and pricing marketing), utility API checks, focus rings
screens/                 Real app screens ported from shadcn/ui (dashboard, tasks, authentication, playground, cards, login and signup blocks)
kitchen-sink/            One page per component or form doc, with all of its docs examples (generated)
compare.html             Side-by-side comparison of any page
matrix.html              One page or example under several configs, themes and directions
issues/<name>/           Issue reproductions (index.html + the three config files)
src/styles/              Working copy of the styles (see Customizing)
configs/<name>/          Saved configs; configs/default/ is Bootstrap's defaults
src/js/main.js           Example pages' entry: Bootstrap JS, demo wiring, config switcher, toolbar
src/js/home.js           Home page: page search and the Configs section, without the toolbar
src/js/page-index.js     Page list and search, shared by the home page and the page switcher
public/                  Favicon and the early preferences script
scripts/                 npm scripts: configs, reproductions, updates, checks and audits, and their allowlists
tests/visual/            Visual regression suite (Playwright) and its baselines
tests/console/           Console crawl (Playwright) and its known issues
tests/smoke/             Interaction smoke tests (Playwright) and their known issues
tests/a11y/              Accessibility scan (Playwright and axe-core) and its known issues
docs/                    This documentation
```

Every `.html` file under `pages/`, `screens/`, `kitchen-sink/` and `issues/` is picked up automatically. There's no list to maintain.

## Finding pages

- **Home page**: search by title, description, tag, source or example heading, then narrow down with the sidebar's groups and tags. Press <kbd>/</kbd> to focus the search, <kbd>Enter</kbd> to open the first result and the arrow keys to move through them. Filters live in the URL (`/?q=menu&tag=forms`), so a filtered list can be shared. Switch between compact tiles and a denser list, and find recently viewed pages at the top. The sidebar's *Configs* (`/?group=configs`, or `/#configs`) lists the saved configs by category, applies one in a click, and the search filters them too. The home page is playground UI, not a page under test: it has no toolbar and always renders with Bootstrap's defaults, following the system's color mode, whatever the toolbar preferences or URL parameters.
- **Page switcher**: press <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd> on macOS) on any example page, or use *Search* in the toolbar. On the home page, it focuses the search field. A search that matches an example heading jumps straight to it, like `tool place` for the tooltip *Placement* example.
- **Previous and next**: the toolbar's <kbd>‹</kbd> <kbd>›</kbd> flip through the pages of the current group.

Both searches also take **class names and tokens**, to find where something is used:

- `btn-subtle` or `.btn-subtle` finds every page whose markup uses the class, the most uses first, and jumps to the first example that does. The start of a name works too while typing (`btn-sub`). A word without a dash matches a class (`btn`) only where it matches nothing else.
- `--alert-padding-x`, with or without `bs-`, or its start (`--alert-`), finds the pages using the classes that declare it, here `.alert`.

Each result lists what matched. The index keeps the Bootstrap classes, those named in Bootstrap's compiled `dist/css/bootstrap.css` (the `BOOTSTRAP_PATH` checkout's when set), and leaves out the playground's own chrome. A token maps to the classes whose rules declare it, so a global token like `--primary` finds nothing. On the home page, kitchen sink cards also link to their docs source.

Each page describes itself in its `<head>`, and the index picks it up:

```html
<title>Screens: Tasks</title>                             <!-- group prefixes like "Screens:" are dropped -->
<meta name="description" content="One line about the page.">
<meta name="playground-tags" content="table, forms, menu">
<meta name="playground-source" content="…" data-url="…">  <!-- see Real screens -->
```

Without a description, the header's lead paragraph (`.fs-lg`) is used. Every `<h2 id="…">` becomes a searchable example heading, and the Bootstrap classes in the markup, outside `data-playground-chrome`, become searchable classes. Kitchen sink pages are tagged `components` or `forms`. Give new pages a description and a few tags, reusing existing tags where they fit, so they stay easy to find.

## Starter screens

Adapted from Bootstrap's own examples (`site/src/assets/examples/`). Like the real screens, each one credits its source with a `playground-source` meta tag (see below). They load the shared styles, so they show the working copy, or whichever config you pick in the toolbar.

## Real screens

Modern application screens ported from [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT): its examples (`apps/v4/app/(app)/examples/`), the cards showcase from its home page, and its login and signup blocks. Each one is rebuilt with Bootstrap v6 components and utilities, and the little custom CSS they need sticks to Bootstrap's tokens. That way they follow the color mode, the direction, the *Primary* hue and the configs. Charts are inline SVG, so there's no chart library.

They're meant as realistic test beds: the places where a screen needs custom CSS point to what Bootstrap is missing.

To see how close Bootstrap can get to the originals, open them with the `shadcn` config (*Config* in the toolbar, or `?config=shadcn`). It configures Bootstrap with shadcn/ui's default theme: neutral palette, near-black primary, `.625rem` radius, Geist, 36px controls and outer focus rings. See [`configs/shadcn/`](../configs/shadcn/).

Each screen credits its source with a `<meta name="playground-source" content="…" data-url="…" data-license="…">` tag in its `<head>`. The toolbar then shows "Adapted from …" with a permalink to the shadcn/ui commit it was ported from, even when collapsed, and the home page lists it next to the page. Any other page adapted from elsewhere can use the same tag.

## Kitchen sink

`kitchen-sink/*.html` is generated from the live examples in the v6 docs (`site/src/content/docs/{components,forms}/*.mdx`), so it always uses the current markup. The npm package doesn't ship the docs, so regenerating needs a Bootstrap checkout:

```sh
npm run sync-kitchen-sink -- ../twbs/bootstrap   # or rely on BOOTSTRAP_PATH in .env.local
```

Don't edit these files by hand. They're overwritten on every sync.

With `BOOTSTRAP_PATH` set, `npm run dev` watches those MDX files: editing one resyncs its page only, and Vite reloads it. When the list of pages changes (a page added, removed or renamed), every page is rewritten, like a full sync. The server's log says which files it wrote. The generator lives in [`scripts/lib/kitchen-sink.mjs`](../scripts/lib/kitchen-sink.mjs).

## Issue reproductions

```sh
npm run new-issue 42928                          # from configs/default (Bootstrap's defaults)
npm run new-issue pg-3 -- --config rounded-dark  # from a saved config
npm run new-issue pg-4 -- --config working       # from the working copy
```

This creates `issues/<name>/` with an `index.html` and a copy of the config's three files, served at `/issues/<name>/`. A numeric name links to `twbs/bootstrap#<name>`. Each reproduction **compiles its own copy of Bootstrap**, so its styles stay isolated from the shared files, from other reproductions, and from the toolbar's *Config* list.

To share a reproduction, push the repository and link to the folder on GitHub, or open it in StackBlitz: `https://stackblitz.com/github/julien-deramond/bootstrap-test-playground`.

## Toolbar

Each example page has a small floating toolbar at its bottom end, a pill that sums up the current state, like `shadcn · dark · RTL · pink · dist`. It renders in a shadow root, so it doesn't pick up or leak any styles, and its contents stay left to right on RTL pages. The home page, the compare view and the sizes page have none, and keep Bootstrap's defaults.

| Pill | Effect | Shortcut |
| --- | --- | --- |
| Home | Back to the home page | |
| ‹ › | Previous and next page in the same group | |
| Summary | Opens the settings panel | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> toggles |
| Search | Opens the page switcher | <kbd>Ctrl</kbd>+<kbd>K</kbd> (<kbd>⌘</kbd>+<kbd>K</kbd>) |

On a first visit, a hint above the pill says what it does. It goes away for good (`localStorage`) once the panel opens, a shortcut is used or it's dismissed, and never shows under automation (`navigator.webdriver`), so tests and screenshots don't see it.

The settings panel is a modal dialog, a bottom sheet on small screens. It closes on <kbd>Esc</kbd> and on a click outside it, and stays open from page to page until it's closed, for the browser session.

| Panel | Effect | Shortcut | URL override |
| --- | --- | --- | --- |
| Color mode | Auto (system), Light or Dark, through `data-bs-theme` on `<html>`, plus the custom modes of the current config, like *Sepia* with `configs/color-modes-custom/` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> cycles | `?theme=dark`, `?theme=sepia` |
| Direction | LTR or RTL, through `dir` on `<html>` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> toggles | `?dir=rtl` |
| CSS, JavaScript | *Source* compiles Bootstrap from `scss/` or `js/src/`, *Dist* loads the prebuilt `dist/css/bootstrap.css` or `js/dist/` (see [Where Bootstrap comes from](bootstrap.md#source-or-dist)) | | `?css=dist`, `?js=dist` |
| Primary | Remaps the `--bs-primary-*` tokens to another hue at runtime | | `?primary=teal` |
| Config | Swaps the working copy for a saved config. Configs are grouped by category, with a filter, their description, a *tokens only* badge and their known gaps (see [`configs/README.md`](../configs/README.md#saved-configs)) | | `?config=<name>` |
| Copy link | Copies the page's URL with the current choices as URL overrides | | |
| Compare | Opens the current page in the compare view | | |
| Reset | Back to Bootstrap's defaults | | |

Toolbar choices are saved in `localStorage` and applied before first paint by `public/playground-prefs.js`. URL parameters override them for that view only, without saving, which makes links like `/pages/dashboard.html?theme=dark&dir=rtl` shareable. `window.bootstrap` is available in the console on every page.

## Screenshot and embed flags

More URL parameters change what a page shows, for screenshots, embeds and visual tests. They combine, as in `/kitchen-sink/components-tooltip.html?chrome=0&section=placement&freeze`.

| Parameter | Effect |
| --- | --- |
| `?embed` | Hides the toolbar. The compare view uses it for its panes. |
| `?chrome=0` | Hides the toolbar and the page's own playground UI: every element marked `data-playground-chrome`, like the kitchen sink header, navigation and example headings, or the header and steps of a reproduction. Only the markup under test remains. |
| `?frame=0` | Removes the padding, border and background of the kitchen sink's `.bd-example` frames. |
| `?section=<id>` | Shows one kitchen sink example only. The id is the example heading's, as in the page's *On this page* links. |
| `?freeze` | Makes the page render the same way on every load: no animations, transitions or text caret, no smooth scrolling, carousels don't autoplay, "today" is January 15, 2026 (for the datepicker), and `Math.random` is seeded. |

Mark playground UI on a new page with `data-playground-chrome` so `?chrome=0` hides it. The kitchen sink generator and the reproduction template already do.

## Compare

[`/compare.html`](../compare.html) shows any page twice, side by side, with separate theme, direction, primary, config and source (CSS and JS, `src` or `dist`) settings, and keeps the two panes' scroll positions in sync. Presets cover Light / Dark, LTR / RTL, Working / Default and Source / Dist, plus Commit A / B under [`diff-bootstrap --serve`](bootstrap.md#comparing-two-commits). The whole setup lives in the URL, so a comparison can be shared as a link.

## Matrix

[`/matrix.html`](../matrix.html) renders one page, or one kitchen sink example, in a grid: a column per config, a row per theme and direction. Pick the configs by category, the themes and directions, the cell width and the zoom. *Diff against first column* blends the first column over every cell of its row with `mix-blend-mode: difference`, so what a config doesn't change turns black. The toolbar's *Matrix* link opens it on the current page, and the whole setup lives in the URL: `/matrix.html?page=/kitchen-sink/components-button.html&section=sizes&configs=default,square,pill`.

`npm run matrix -- components-button#sizes` writes the same grid as one image, `reports/page-matrix/components-button--sizes.png`, and prints how many pixels of each cell differ from the first column of its row. `--diff` shows the differences in magenta instead of the screenshots. `--configs=`, `--themes=`, `--dirs=` and `--width=` pick the grid; a page is a kitchen sink page's name or a path, like `/pages/dashboard.html`. It runs its own dev server, so `BOOTSTRAP_PATH` applies.

## Deployment

Every push to `main` builds the playground and deploys it to GitHub Pages at <https://julien-deramond.github.io/bootstrap-test-playground/> ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)). The site lives in a subfolder, so the workflow sets `BASE_PATH=/bootstrap-test-playground/`, and the build adds that prefix to every root-relative link. To check such a build locally:

```sh
BASE_PATH=/bootstrap-test-playground/ npm run build
npx vite preview --base /bootstrap-test-playground/
```

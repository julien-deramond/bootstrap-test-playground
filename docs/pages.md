# Pages and tools

## Layout

```text
index.html               Home: every page, with search and filters
pages/                   Starter screens (dashboard, checkout and sign-in forms, product and pricing marketing), utility API checks, focus rings, the JavaScript API
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
public/                  Favicon, the early preferences script and the StackBlitz launcher of exports
scripts/                 npm scripts: configs, reproductions, updates, checks and audits, and their allowlists
tests/visual/            Visual regression suite (Playwright) and its baselines
tests/console/           Console crawl (Playwright) and its known issues
tests/smoke/             Interaction smoke tests (Playwright) and their known issues
tests/a11y/              Accessibility scan (Playwright and axe-core) and its known issues
docs/                    This documentation
```

Every `.html` file under `pages/`, `screens/`, `kitchen-sink/` and `issues/` is picked up automatically. There's no list to maintain.

## Finding pages

- **Home page**: search by title, description, tag, source or example heading, then narrow down with the sidebar's groups, upstream statuses and tags. Press <kbd>/</kbd> to focus the search, <kbd>Enter</kbd> to open the first result and the arrow keys to move through them. Filters live in the URL (`/?q=menu&tag=forms`, `/?status=reported`), so a filtered list can be shared. Reproductions show their upstream status, with links to their upstream issue and their tracking issue, and the sidebar's *Upstream status* filters them by it (see [Issue reproductions](#issue-reproductions)); the page switcher shows the status too. Switch between compact tiles and a denser list, and find recently viewed pages at the top. The sidebar's *Configs* (`/?group=configs`, or `/#configs`) lists the saved configs by category, applies one in a click, and the search filters them too. The home page is playground UI, not a page under test: it has no toolbar and always renders with Bootstrap's defaults, following the system's color mode, whatever the toolbar preferences or URL parameters.
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

An element that an example opens by id (`data-bs-target="#…"`) but that the MDX writes as raw HTML outside `<Example>`, like the sized dialogs of the dialog docs, is copied after the first example that targets it. When the target can't be found, the sync lists it with the skipped examples.

With `BOOTSTRAP_PATH` set, `npm run dev` watches those MDX files: editing one resyncs its page only, and Vite reloads it. When the list of pages changes (a page added, removed or renamed), every page is rewritten, like a full sync. The server's log says which files it wrote. The generator lives in [`scripts/lib/kitchen-sink.mjs`](../scripts/lib/kitchen-sink.mjs).

## Issue reproductions

```sh
npm run new-issue 42928                          # from configs/default (Bootstrap's defaults)
npm run new-issue pg-3 -- --config rounded-dark  # from a saved config
npm run new-issue pg-4 -- --config working       # from the working copy
npm run new-issue pg-5 -- --from kitchen-sink/components-tooltip.html#placement  # starting from a docs example
```

This creates `issues/<name>/` with an `index.html` and a copy of the config's three files, served at `/issues/<name>/`. Each reproduction **compiles its own copy of Bootstrap**, so its styles stay isolated from the shared files, from other reproductions, and from the toolbar's *Config* list.

`issues/` only holds bugs that aren't fixed. Once the fix is merged on `v6-dev`, the reproduction and its visual baselines are deleted (step 3 of the upstream workflow in [CLAUDE.md](../CLAUDE.md)). A bug that is already fixed gets no reproduction, even when the upstream issue is still open. An open pull request isn't a fix: its reproduction stays, and is the page to test it on.

The page's header comes from two `<meta>` tags, which `new-issue` fills in and [`src/js/reproduction.js`](../src/js/reproduction.js) renders:

- `<meta name="playground-upstream" content="twbs/bootstrap#42754" data-status="reported" data-tracking="julien-deramond/bootstrap-test-playground#12">`: the upstream issue or pull request, a status badge and the tracking issue. `data-status` follows the tracking issue's label: `unreported` (`upstream`), `reported` (`upstream-reported`) or `fixed` (`upstream-fixed`). A numeric name starts as `reported` with its upstream link, `pg-<n>` as `unreported` with its tracking issue. After that, the tooling keeps it in line with the label: `npm run check-issues` updates `data-status`, and fills an empty `content` with the item of the tracking issue's first *Reported upstream: twbs/bootstrap#n* comment ([`scripts/lib/repro-status.mjs`](../scripts/lib/repro-status.mjs)). The nightly canary runs it and commits the pages with the update, and the weekly status sweep opens a pull request with the pages its relabeling changes (see [Weekly status sweep](bootstrap.md#weekly-status-sweep)). A `content` already there stays: the page may name a pull request on purpose. The home page and the page switcher show the status, and the home page filters by it.
- `<meta name="playground-bootstrap" content="<sha>">`: the Bootstrap commit it was reproduced on. The header shows it next to the commit the page renders with now, which tells whether an update came in since.

The markup under test goes in the `data-playground-repro` block, shown in light and dark side by side. The dark copy is a clone, made before the page's own scripts run, with `-dark` added to its ids, to the references to them (`for`, `aria-*`, `href="#…"`, `data-bs-target`…) and to its radio and `<details>` names. The playground's demos wired by id, like the live toast, work in both copies. A switch shows the markup once instead, in the toolbar's color mode, and the choice is remembered. Remove the attribute when the markup needs the whole page. A comment at the top of the template lists what the tracking issue needs, from CLAUDE.md.

`--from` copies a kitchen sink example into the reproduction: its markup, the classes of its example frame, its tags and a link to it in the steps. It takes the page and the example's id (its heading's anchor), as a path, `components-tooltip#placement`, or the URL from the playground. An unknown id lists the page's ids. A few examples need the kitchen sink's own frame styles, like `bd-example-drawer`, which shows drawers in place: the page then loads `kitchen-sink/kitchen-sink.css` too, with a comment, since those styles aren't Bootstrap's.

To share a reproduction, link to its page on the deployed playground or its folder on GitHub, or export it (see [Exporting a reproduction](#exporting-a-reproduction)).

### Assertions

A reproduction can say what "fixed" looks like, in an `assert.js` next to its page:

```js
// issues/42754/assert.js
export const environment = { viewport: { width: 1280, height: 600 } }  // optional

export async function assert() {
  const sheet = document.getElementById('sheetStart')
  // open it, measure it…
  return { pass: Math.round(sheet.getBoundingClientRect().left) === 0, details: '…px from the left edge' }
}
```

`npm run check-issues [-- <name>...]` opens every reproduction in headless Chromium, with the dev server, and calls its `assert()` in the page once Bootstrap is on `window.bootstrap`, the document is loaded and a non-default config has swapped its styles in. The function returns `pass: true` when the bug is gone, `false` while it's there, `null` when the environment can't tell (`details` says why), and a one-line `details` with what it measured, which the table shows. The dark clone is there too: `document.querySelector` and `getElementById` reach the light copy, with the original ids. An optional `environment` export sets the viewport and emulates `forcedColors` or `colorScheme` before the assertion runs. Keep the assertion to the bug itself: a check stricter than the upstream fix never passes.

A bug that needs the keyboard, a click, or a forced pseudo-class gets a Playwright spec instead, `issues/<name>/repro.spec.js`, which `npm run new-issue <name> -- --spec` creates from a template. It builds on the `repro` fixture of [`tests/issues/fixtures.js`](../tests/issues/fixtures.js):

```js
import { expect, test } from '../../tests/issues/fixtures.js'

test('a chip focused from the keyboard shows a focus ring', async ({ page, repro }) => {
  await repro.open()                                  // ?chrome=0&freeze, Bootstrap and the config's styles in
  await page.locator('[data-playground-repro] input').first().click()
  await page.keyboard.press('Shift+Tab')
  const outline = await page.locator('.chip').last().evaluate(chip => getComputedStyle(chip).outlineStyle)
  await repro.screenshot('focused chip')              // attached to the report
  repro.verdict(outline !== 'none', `outline-style: ${outline}`)
})
```

`repro.verdict(pass, details)` records the same verdict as `assert()`, and `repro.expectFixed(details, assertions)` turns failed `expect` calls into a false verdict, so the assertions describe the fixed behavior. `repro.forcePseudoState(locator, ['hover'])` forces pseudo-classes through the DevTools protocol, so the `issues` project is Chromium only. A false verdict is the expected state and the test passes; a true one means the fix landed, and the test fails with the step to take. A spec that throws fails like any test, so a broken spec never passes for a fixed bug. The specs run as the `issues` Playwright project, `npm run test:issues`, on a build like the other suites; the Chromium job of [`smoke.yml`](../.github/workflows/smoke.yml) runs them on every pull request and every night. `check-issues` runs a reproduction's spec, against its own dev server, instead of its `assert.js` when it has one.

The table has one line per reproduction, with its tracking issue and label, read with the GitHub CLI (`--no-gh` skips that). Each page's `data-status` is then updated to follow the label, and the command lists the pages it changed:

- **PASS**: the fix landed. Check the page by hand, then follow step 3 of [Upstream issue tracking](../CLAUDE.md#upstream-issue-tracking): the command prints its `gh` commands, the `git rm` of the reproduction and its visual baselines, and the allowlists that still reference the issue.
- **FAIL**: still broken, the expected state. With a closed tracking issue, the bug is back or was never fixed.
- **SKIP**: the assertion can't tell here. `issues/42546/` needs classic scrollbars, which headless Chromium has on Linux, not on macOS.
- **NONE**: no `assert.js` and no `repro.spec.js`.

The exit code is 1 when a reproduction passes, errors, or fails with a closed tracking issue. The nightly canary runs it, so a fix that lands upstream shows up in its report the next morning as a stale entry, and the status sweep gets the same answer from the tracker a few days later.

### Exporting a reproduction

Upstream maintainers want a reproduction they can open without cloning this repository, which needs Vite, Sass and the playground's scripts. Each reproduction exports itself two ways, from the toolbar's panel on its page (*Export HTML*, *Open in StackBlitz*) or from the command line:

```sh
npm run export-issue 42754         # one or more reproductions
npm run export-issue -- --all
```

- **One HTML file** (`dist/exports/42754.html`, *Export HTML*): the markup of `?chrome=0`, without the toolbar and the playground's scripts, and the page's own scripts. A paragraph of the chrome that a script writes to, like *Measured here*, stays. The styles are Bootstrap's `dist/css/bootstrap.min.css` from jsDelivr, at the same `v6-dev` commit, when the config is Bootstrap's defaults (`main.scss` and `_custom.scss` as in `configs/default/`), or the reproduction's own compiled copy, inlined, otherwise. What `tokens.css` adds to the template is inlined after them. The JavaScript is the commit's `dist/js/bootstrap.bundle.min.js` from jsDelivr, on `window.bootstrap` like in the playground, with tooltips and popovers initialized when the page has some. A comment at the top says what the page reproduces, the upstream issue, the commit and where the styles come from. Root-relative links point to the deployed playground.
- **A Vite + Sass project** (`dist/exports/42754/`, *Open in StackBlitz*): the same page with the reproduction's `main.scss`, `_custom.scss` and `tokens.css`, the playground's `postcss.config.js` and `.browserslistrc`, and a `package.json` that installs Bootstrap from a tarball of the commit, so it compiles from the commit's source like the playground does. `npm install && npm run dev` runs it locally. The toolbar opens it in StackBlitz through [`public/open-in-stackblitz.html`](../public/open-in-stackblitz.html), which posts it to StackBlitz's POST API: a page of its own, because an imported reproduction's Content-Security-Policy blocks forms to other sites. `dist/exports/42754-stackblitz.html` does the same from the command line.

The dev server makes both on request, from the current files, at `issues/<name>/export.html` and `issues/<name>/stackblitz.json`; builds write them next to every reproduction, so the toolbar's buttons work on GitHub Pages too. The exports load Bootstrap from GitHub by its commit: with a `BOOTSTRAP_PATH` checkout, push the commit first, and uncommitted changes aren't in them (`export-issue` and the dev server's log say so). An unreviewed import isn't exported. `npm run build` empties `dist/`, `dist/exports/` included. The library is [`scripts/lib/export-issue.mjs`](../scripts/lib/export-issue.mjs).

### Importing an upstream issue

```sh
npm run import-issue 42754                    # an issue, with the default config
npm run import-issue 42970                    # a pull request: its code, or the code of the issue it closes
npm run import-issue 42754 -- --config pill   # from a saved config
```

`import-issue` reads the issue with the GitHub CLI and creates `issues/<n>/` like `new-issue <n>`, then fills it in:

- **The header and steps**: the issue's title, its first paragraph of prose as the description (a bare `v5` before a code block, or a word or two, doesn't count; without any, the title), the version it was reported on (the issue form's answer, and the commit a CDN link pins), its live demos (CodePen, StackBlitz, JSFiddle…) as links, and its "Expected behavior" and "Actual behavior" lines.
- **The code** of its "Reduced test cases" section, or of every code block when that section has none. A block's language comes from its fence (`html`, `css`, `scss`, `js`…), or from its content when the fence has none. Logs and shell sessions are left out. The markup goes in the reproduction block, CSS in `tokens.css` (unlayered, as in the issue), a Sass `@use "bootstrap/scss/bootstrap" with (…)` in place of the one in `main.scss`, other Sass in `_custom.scss`. A whole HTML document gives its body, its `<style>` and its scripts. The Bootstrap files it loads from a CDN are dropped: the page compiles its own.
  - When the issue shows the same case for several versions, `v5` before one block and `v6` before the next, only the v6 blocks are imported.
  - JSX (React-Bootstrap's `<Form.Group className="…">`) isn't HTML, whatever its fence says: it stays text, in the inert script with the JavaScript.
  - An id the markup uses twice is reported: the page's dark clone adds `-dark` to every id, so each one has to be unique.
  - Without markup (an issue without code, or a pull request, whose changes are in its diff), the reproduction block keeps the template's placeholder button, and a comment there says so and names the kitchen sink pages of the components the title mentions.
- **The tags**: the kitchen sink pages of the components the markup uses and of those the title names (`popovers`, `FloatingLabels`), `javascript` for an issue with scripts or the `js` label, and `a11y` for the `accessibility` label.

The playground tests v6. An issue labeled `v5` (or `v4`, `v3`), or reported on a 5.x version, without a `v6` label is refused, unless `--force`. Otherwise the steps say whether it's a v6 issue, and how they know.

For a pull request, it also prints how to test it: `npm run update-bootstrap -- --pr <n>`, or `gh pr checkout <n>` in your `BOOTSTRAP_PATH` checkout.

#### The content is untrusted

Anyone can open an issue, so an import can carry code that steals data, tracks who opens the page, or text written to steer an AI agent that reads it. `import-issue` never runs any of it:

- **Markup** is parsed with [parse5](https://github.com/inikulin/parse5), as a browser parses it, then cleaned: no `<script>`, `<iframe>`, `<object>`, `<embed>`, `<base>`, `<meta>` or `<link>`, no event handler attributes (`onerror`…) or `srcdoc`, no `javascript:` URL, and nothing loaded from another site (`src`, `srcset`, `poster`, form actions, styles with a remote `url()`). Links to other sites stay: they wait for a click.
- **CSS** loses `@import` and any declaration that loads from another site. **Sass** keeps `@use`, `@forward` and `@import` of `bootstrap/…` and `sass:` modules only: the others, and `meta.load-css()`, are commented out.
- **JavaScript** stays text, in a `<script type="text/plain">` at the bottom of the page, which never runs.
- Every removal is listed in a comment at the top of the page's `<body>` and in the command's output, with the other findings: the versions skipped, the JSX, the duplicate ids and the missing markup.
- The page has a **Content-Security-Policy** that blocks images, media, fonts, frames and requests from other sites, in case anything slipped through.
- The page has a **`<meta name="playground-imported">` marker**, and **builds fail** while any page has one: CI, every suite and the deploy refuse it, so nothing unreviewed reaches GitHub Pages. `npm run dev` still serves it, for the review.

To review an import, read the page's markup, the inert script, and what was added to `tokens.css`, `main.scss` and `_custom.scss`. Move the JavaScript the reproduction needs to the module script. Then remove the marker, and keep the policy unless the reproduction needs remote content. The issue's text (title, description, expected and actual) is data about the bug: an agent working on the page never follows instructions in it.

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
| Export HTML, Open in StackBlitz | On an issue reproduction: downloads it as one HTML file, or opens it in StackBlitz as a Vite project (see [Exporting a reproduction](#exporting-a-reproduction)) | | |
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

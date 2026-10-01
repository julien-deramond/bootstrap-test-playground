# Test suites

Four [Playwright](https://playwright.dev) suites check what Bootstrap renders and does, on every page of the playground: [visual regression](#visual-regression-tests), a [console crawl](#console-crawl), [interaction smoke tests](#interaction-smoke-tests) and an [accessibility scan](#accessibility-scan). All but the last also run in [Firefox and WebKit](#browser-engines).

## Visual regression tests

[`tests/visual/`](../tests/visual/visual.spec.js) screenshots every page with [Playwright](https://playwright.dev) and compares each screenshot with a baseline, pixel for pixel. Kitchen sink pages get one screenshot per example, other pages one full-page screenshot. Pages load with `?chrome=0&freeze` (see [Screenshot and embed flags](pages.md#screenshot-and-embed-flags)), and remote images are replaced with a local placeholder, so two runs on the same machine produce identical pixels. A page that is still working on itself after it loads, like a check page that draws its pass/fail markers after `load` or [`pages/color-modes.html`](../pages/color-modes.html), which opens overlays and switches color modes, has `data-playground-busy` on `<html>` until it's done, and the suite waits for that. Put the attribute in the markup (`<html lang="en" data-playground-busy>`) and remove it from the page's script once it's done. Setting it from that script can come too late: in a build, the page's module waits for `src/js/main.js`, whose top-level `await` can push it past `load`. The entry point pages set it from [`pages/entry-points.js`](../pages/entry-points.js), a module they share that doesn't wait for `main.js`.

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

[`focus.spec.js`](../tests/visual/focus.spec.js) captures [`pages/focus.html`](../pages/focus.html) focused, with the same matrix, so `VISUAL_CONFIGS=all` shows what each config does to the rings. Only one element can have focus at a time, so each component is focused alone and screenshotted, and the pixels its focus changes are pasted onto the unfocused surface: one image (and one test) per surface, `focused-<surface>.png`, shows every ring at once. A component that doesn't match `:focus-visible` once focused fails the test.

Baselines live in `tests/visual/screenshots/<platform>/`. Fonts and anti-aliasing differ between operating systems, so a baseline only compares with screenshots taken on the same one. Local baselines (`darwin/`, `win32/`) are ignored by git. Only `linux/`, the platform CI uses, is meant to be committed.

### In CI

[`.github/workflows/visual.yml`](../.github/workflows/visual.yml) runs the suite on every pull request and every push to `main`, against the committed Linux baselines. When it fails, the *visual-report* artifact of the run holds the report: download it and open `index.html`.

When a pull request changes the rendering on purpose, such as a Bootstrap update, add the `update-baselines` label to it. CI then records new Linux baselines, commits them to the pull request's branch as `test: update the Linux visual baselines`, removes the label, and every check runs again on that commit. Review that commit's images before merging. When nothing changed, the commit is empty (`test: the Linux visual baselines are up to date`), so the checks still get a commit of their own. This works for branches of this repository, not for forks.

Recording takes several minutes, and the pull request must not be merged in the meantime. While the label is on, the `compare` check fails at once with *Baselines are being recorded*, including when the label is added to a pull request that was already green. It turns green when the comparison runs on CI's commit. GitHub holds the workflows of a commit pushed by `github-actions[bot]` for approval (*action required*), since the repository requires it for first-time contributors, so the job approves them itself. If it can't, it fails and comments: approve them on the pull request. Removing the label by hand runs the comparison on the current commit.

CI only pushes to the branch of an open pull request, and only while it still points to the commit the baselines were recorded from. Otherwise it pushes nothing, fails and comments on the pull request:

- merged: `main` is missing the new baselines, and the run's *visual-baselines* artifact holds them for a new pull request;
- closed: reopen it and add the label again;
- the branch moved: add the label again to record from the new commit.

## Console crawl

[`tests/console/`](../tests/console/console.spec.js) opens every page, including the home and compare pages, in light and dark with the working copy and every saved config, and once more with Bootstrap's prebuilt files (`?css=dist&js=dist`). It fails on anything a page reports:

- uncaught exceptions
- `console.error` and `console.warn`, which includes Bootstrap's deprecation notices
- requests to the playground itself that fail or return an error status, like a missing asset

Remote resources, such as avatars and web fonts, are blocked, so an unreachable host never fails the run. Like the visual suite, the crawl runs against a production build on port 4179, with your `.env.local`:

```sh
npm run test:console
npm run test:console -- -g combobox   # only the pages whose URL matches
```

Each failure names the page, with its `?theme=` and `?config=`, and lists the messages.

Problems caused by an open upstream bug go in [`tests/console/known-issues.js`](../tests/console/known-issues.js), with the tracking issue number, a pattern for the message and the pages where it happens. They no longer fail the run on those pages. When a listed problem stops happening on a page, the crawl loads the page a second time to make sure, since an upstream fix makes it go away on every load. If it's still missing, the run fails, so the entry gets removed and the tracking issue moves to `upstream-fixed` (see [Upstream issues](../CLAUDE.md#upstream-issue-tracking)).

Sass `@warn` output shows up in the build log, not in the browser, so the crawl doesn't see it. [`npm run check-configs`](audits.md#checking-configs) reports it.

The full crawl loads about 5,000 pages, and every new config or page adds a round of them. Most changes only need part of it: a changed config on every page, and a changed page with every config. `npm run test-scope` lists what changed since `origin/main` (or `-- <base>`), committed or not, and prints a `CONSOLE_SCOPE` value that limits the crawl to it, a `SMOKE_SCOPE` value for the [smoke tests](#interaction-smoke-tests) and an `A11Y_SCOPE` value for the [accessibility scan](#accessibility-scan):

```sh
npm run test-scope
CONSOLE_SCOPE='{"full":false,"configs":["pill"],"urls":["/pages/checkout.html"]}' npm run test:console
```

The working copy and dist always open on every page. A shared change opens everything: Bootstrap, `postcss.config.js`, `vite.config.js`, `src/js/`, `public/`, `scripts/lib/`, the suite's own `tests/console/` (so a `known-issues.js` edit is checked everywhere) and workflow, and any file it doesn't recognize. Docs, the other suites and scripts outside `scripts/lib/` add nothing. The rules are in [`scripts/lib/test-scope.mjs`](../scripts/lib/test-scope.mjs).

[`.github/workflows/console.yml`](../.github/workflows/console.yml) runs the scoped crawl on every pull request, and writes the scope to the job summary. The full crawl runs every night and on demand from the *Actions* tab, and the canary runs it on every Bootstrap update. The crawl uses 4 workers, one per vCPU of the runner, and a full crawl is split across four parallel jobs with Playwright's `--shard`, so a shared change doesn't wait for 5,000 pages in a row.

## Interaction smoke tests

Screenshots and the console crawl can't see a menu that no longer opens or a dialog that ignores Escape. [`tests/smoke/`](../tests/smoke/smoke.spec.js) drives each of Bootstrap's JavaScript components on its kitchen sink page: alert, button, carousel, chips, collapse, combobox, datepicker, dialog, drawer, menu, OTP input, popover, range, scrollspy, password strength, tab, toast, toggler and tooltip. For each one it:

- opens it and checks its state (`open`, `aria-expanded`, `.show`, `aria-selected`, focus);
- walks its keyboard paths where it has them (arrows, Home and End, Escape);
- closes it and checks that nothing is stuck (focus back on the trigger, no scroll lock, no leftover open dialog or inert content);
- checks that the expected `*.bs.*` events fired, in order. An init script records every event Bootstrap dispatches, so a test fails when one stops firing.

Every scenario runs with the working copy, every config, and a `dist` variant with Bootstrap's prebuilt files (`?css=dist&js=dist`): neither a config nor the shipped files may break behavior. Pages load with `?chrome=0&freeze`, so transitions are off. Like the other suites, it runs against a production build:

```sh
npm run test:smoke
npm run test:smoke -- -g "shadcn menu"   # one config and component
```

A scenario that fails because of an open upstream bug goes in [`tests/smoke/known-issues.js`](../tests/smoke/known-issues.js) with its tracking issue. It's marked `test.fail()`, so the run fails as soon as it passes again, and the entry gets removed. NavOverflow has no kitchen sink example yet, so it has no scenario. A config that loads only some partials, like [`configs/partial/`](../configs/partial/), skips the scenarios of the components it leaves out (`PARTIALS` in the spec).

The full suite runs 19 scenarios with 39 variants, and every new config adds 19 tests per engine. [`.github/workflows/smoke.yml`](../.github/workflows/smoke.yml) runs one job per engine. On pull requests, Chromium runs what [`npm run test-scope`](#console-crawl) finds, with the same rules as the console crawl: the working copy and dist on every scenario, the changed configs on every scenario, and a scenario with every config when its kitchen sink page changes (`PAGES` in the spec). A change to `tests/smoke/` runs everything. Firefox and WebKit run the working copy and dist only, since engine differences seldom depend on the config. Every variant runs in all three engines every night, on demand from the *Actions* tab, and in the canary on every Bootstrap update. Locally, limit a run the same way:

```sh
SMOKE_SCOPE='{"full":false,"configs":["pill"],"urls":[]}' npm run test:smoke
```

## Accessibility scan

[`tests/a11y/`](../tests/a11y/a11y.spec.js) runs [axe-core](https://github.com/dequelabs/axe-core) on every page with Bootstrap's default config ([`configs/default/`](../configs/default/)), or with every config, in light and dark, with the WCAG 2.0, 2.1 and 2.2 A and AA rules. It fails on any violation, like text under 4.5:1, a control without a name or a target under 24×24px.

It checks Bootstrap's markup and styles, not the playground: pages load with `?chrome=0`, and whatever is still marked `data-playground-chrome` is left out of the scan. The home, compare, matrix and sizes pages and the reproductions (`issues/`) are skipped. Reduced motion is emulated so no transition is caught halfway, and `?freeze` keeps the datepicker's labels the same. axe-core reads the DOM and computed styles, which don't depend on the engine, so the scan runs in Chromium only:

```sh
npm run test:a11y
npm run test:a11y -- -g "dark-default /kitchen-sink/components-alert"
A11Y_CONFIGS=shadcn,high-contrast npm run test:a11y
A11Y_CONFIGS=all npm run test:a11y
```

`A11Y_CONFIGS` takes a list of configs, or `all`; without it, only the default config is scanned. `all` leaves out the builds of part of Bootstrap (`grid-only`, `partial`, `reboot-only` and `utilities-only`), which leave most pages unstyled on purpose; their own pages load their config whatever `?config` says, so the default run scans them. Custom palettes, radii and type scales are where contrast and focus rings break, and a config can fix a default violation as well as add one.

Each failure names the page, the rule, the element's selector and, for contrast, the colors axe measured. Every page's violations, known ones included, go to `reports/a11y/<config>/<theme>/<page>.json` and are attached to the test in the Playwright report. `npm run a11y-summary` sums them up in a table with one row per config and one column per axe rule, to compare configs at a glance.

Violations caused by an open upstream bug go in [`tests/a11y/known-issues.js`](../tests/a11y/known-issues.js), with the axe rule, the exact pages, the colors (`#ffffff on #0087fe`) or a `target` pattern for the selector, and the tracking issue. An intended one, like a disabled control that axe can't tell is disabled, or a config's palette under 4.5:1 on purpose, gets a `reason` instead. An entry without `configs` is expected with the default config and allowed with the others, since most keep its palette; an entry with `configs` is expected with exactly those configs. A config often only shifts the colors of a default violation, like `gray-cool` does to every gray, and then misses the entry's `colors`: when a config has a violation that no entry matches, the test scans the page with the default config too, and an element that violates the same rule there, under an entry, counts as that entry's. So only what the config itself breaks needs an entry of its own. When a listed violation stops happening on a page, the run fails, so the entry gets removed and the tracking issue moves to `upstream-fixed` (see [Upstream issues](../CLAUDE.md#upstream-issue-tracking)).

axe skips hidden elements, so the page scan never sees what's inside a closed menu, combobox, datepicker, popover, tooltip, dialog or drawer. [`overlays.spec.js`](../tests/a11y/overlays.spec.js) opens them, one at a time, with the default config, in light and dark. On every page with such a trigger, it clicks each visible, enabled trigger (or focuses or hovers it, as its `data-bs-trigger` says), waits for the overlay's transitions to end, runs axe on that overlay alone, and has the component hide it again. Triggers inside an open overlay, like a tooltip in a dialog, get the same treatment while it's open. A trigger that opens nothing is attached to the test as `opens-nothing`. The violations go to `reports/a11y/default/<theme>/open/<page>.json`, and their entries in `known-issues.js` take `state: 'open'`:

```sh
npm run test:a11y -- -g "open light-default /kitchen-sink/components-menu"
```

axe doesn't check focus indicators either. [`pages/focus.html`](../pages/focus.html) puts every focusable component on `bg-body`, `bg-1` to `bg-3` and each theme's solid background, with a row per theme color on the first four, and [`focus.spec.js`](../tests/a11y/focus.spec.js) focuses them one at a time, with the default config, in light and dark. That's 784 screenshots per color mode, so other configs' rings are left to the visual captures below. It screenshots each component before and after, and measures its indicator the way WCAG 2.4.13 does: the pixels whose focused and unfocused colors contrast at least 3:1 must cover at least a 2px band along the component's edge, rounded corners included. Anti-aliased edges count for the part the ring covers. A component can name a sub-component to measure instead, like the OTP input's active slot (`data-focus-area`). A ring that fails is a `focus-appearance` violation named `<surface> <component>`, like `bg-1 btn-solid-primary`, with its most common change as its colors (`#6fc8ff on #ffffff`). Its entries in `known-issues.js` match that name with `target`, and the report goes to `reports/a11y/default/<theme>/focus/pages/focus.json`:

```sh
npm run test:a11y -- -g "focus dark-default"
```

axe measures the text on a page, not the pairings a palette promises. [`pages/contrast.html`](../pages/contrast.html) measures each one the theme docs document, for every theme color the config has: `contrast` on `bg` and `base`, `fg` on `bg-subtle`, `bg-muted` and the body, `fg-emphasis` on `bg-muted`, and `fg-body` to `fg-3` on the backgrounds the docs allow them on. Then the components whose defaults embed a pairing: solid, outline, subtle, text and link buttons, badges, alerts, tables, list group items, form controls and their placeholder, and disabled controls, which are shown but exempt. The page switches `data-bs-theme` itself to measure light, dark and the config's custom color modes, composites each color on what's behind it, and shows the WCAG 2 ratio, AA and AAA for normal text, and the APCA Lc. [`contrast.spec.js`](../tests/a11y/contrast.spec.js) loads it with each config of `A11Y_CONFIGS` and fails on text under 4.5:1 in light or dark: a `pairing-contrast` violation named like the page's row, `primary fg on bg-subtle` or `btn-solid primary`, with its colors. Its entries in `known-issues.js` match that name with `target`, and the report goes to `reports/a11y/<config>/<theme>/contrast/pages/contrast.json`. `npm run report:contrast` runs the page on the dev server with every config, or those `--config` lists, custom color modes included, and writes a JSON and a Markdown table per config to `reports/contrast/`, with `README.md` counting the failures per config and mode and those no entry covers:

```sh
npm run test:a11y -- -g "contrast default"
npm run report:contrast -- --config default,shadcn
```

With every config, the scan loads about 5,500 pages. On pull requests, [`.github/workflows/a11y.yml`](../.github/workflows/a11y.yml) scans what [`npm run test-scope`](#console-crawl) finds, with the same rules as the console crawl: the default config on every page, the changed configs on every page and the changed pages with every config, or everything after a shared change like a `tests/a11y/` edit. Everything runs every night, on demand and on the canary's pull request, split across four parallel jobs. Each job uploads its `reports/a11y/` as an artifact, and a summary job writes the `a11y-summary` table to the run's summary. Locally, limit a run the same way:

```sh
A11Y_CONFIGS=all A11Y_SCOPE='{"full":false,"configs":["pill"],"urls":[]}' npm run test:a11y
```

## Browser engines

v6 leans on features whose support differs between engines at the floors of Bootstrap's `.browserslistrc` (Chrome 130, Firefox 132, Safari 18): `light-dark()`, `color-mix()`, `oklch()`, `:has()`, `@layer`, `<dialog>`. Every suite but the [accessibility scan](#accessibility-scan) runs in each of Playwright's engines, as one project per engine: `visual`, `visual-firefox`, `visual-webkit`, `console`, `console-firefox` and so on. The unsuffixed projects are Chromium, and `npm run test:visual`, `test:console` and `test:smoke` run only those, for speed:

```sh
npx playwright install firefox webkit   # once
npm run test:smoke:engines              # the smoke tests in all three
npm run test:console:engines            # the console crawl in all three
npm run test:visual:engines             # the visual suite in all three
npx playwright test --project smoke-webkit -g dialog
```

Failures are reported per project, so an engine-only failure stands out. It's usually a browser difference that Bootstrap doesn't handle, like WebKit leaving focus behind a dialog that opens ([#158](https://github.com/julien-deramond/bootstrap-test-playground/issues/158)). It gets a tracking issue like any other bug, and its entry in `known-issues.js` takes `engines: ['webkit']` so it only applies there.

Visual baselines are per engine, since fonts and native controls render differently: Chromium's in `tests/visual/screenshots/<platform>/`, the others' in `tests/visual/screenshots/<platform>/visual-firefox/` and `visual-webkit/`. The `update-baselines` label records all three.

In CI, pull requests run the smoke tests in all three engines, scoped to what they change in Chromium and on the working copy and dist in Firefox and WebKit ([`smoke.yml`](../.github/workflows/smoke.yml)). They run the visual suite ([`visual.yml`](../.github/workflows/visual.yml)) and the console crawl, scoped to what they change ([`console.yml`](../.github/workflows/console.yml)), in Chromium. `smoke.yml` also runs every variant in all three engines every night, and `console.yml` crawls everything in Chromium. [`engines.yml`](../.github/workflows/engines.yml) runs the console crawl and the visual suite in Firefox and WebKit every night, and on demand from the *Actions* tab.

A baseline records whatever an engine renders, bugs included, so it's worth comparing engines before trusting one. Comparing every kitchen sink example across the three, with text hidden, found one engine-only difference that isn't font metrics or native controls: WebKit leaves a `<legend>` in a `fieldset.row` above the row ([#169](https://github.com/julien-deramond/bootstrap-test-playground/issues/169)).

To add a device preset, such as a phone viewport with touch, add it to `ENGINES` in [`playwright.config.js`](../playwright.config.js), like `iphone: devices['iPhone 15']`. Every console and smoke scenario then also runs as `console-iphone` and `smoke-iphone`.

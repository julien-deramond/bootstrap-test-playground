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
| `npm run test:smoke` | Opens, drives and closes every JavaScript component and checks its state and events (see [Interaction smoke tests](#interaction-smoke-tests)) |
| `npm run test:smoke:engines` / `test:console:engines` | The same suites in Chromium, Firefox and WebKit (see [Browser engines](#browser-engines)) |
| `npm run lint:html [-- --all]` | Validates the HTML of every page with html-validate (see [Validating HTML](#validating-html)) |
| `npm run check-configs [-- --strict]` | Compiles the working copy, every config and every reproduction, and lists Sass errors and warnings (see [Checking configs](#checking-configs)) |
| `npm run check-dist` | Checks that the default config compiles to Bootstrap's `dist/css/bootstrap.css` (see [Checking the dist](#checking-the-dist)) |
| `npm run check-size [-- --record]` | Measures each config's CSS, the dist files and the JS bundle (minified, gzip, brotli) and compares them with `sizes/history.json` (see [Sizes](#sizes)) |
| `npm run compile-matrix` | Compiles Bootstrap under combinations of its `$enable-*` options and reports failures and options that do nothing (see [Option combinations](#option-combinations)) |
| `npm run audit-rtl [-- --all \| --render]` | Lists declarations that use the physical left or right, and with `--render` the kitchen sink examples whose RTL rendering isn't the mirror image of the LTR one (see [Auditing RTL](#auditing-rtl)) |
| `npm run audit-motion [-- --all \| --render]` | Lists transitions and animations that ignore `prefers-reduced-motion` or survive `$enable-transitions: false`, and with `--render` what still moves in the browser (see [Auditing motion](#auditing-motion)) |
| `npm run audit-layers [-- --all \| --render]` | Lists rules outside Bootstrap's cascade layers, undeclared layers and every `!important`, and with `--render` checks the documented override rules in the browser (see [Auditing cascade layers](#auditing-cascade-layers)) |
| `npm run audit-tokens [-- --all \| --render]` | Lists `--bs-*` tokens that are read but never defined, or defined but never read, and with `--render` the ones overriding doesn't change (see [Auditing tokens](#auditing-tokens)) |
| `npm run new-issue 42928 [-- --config <name>]` | Creates `issues/42928/` from the reproduction template and a config |
| `npm run save-config <name> [-- "Description"]` | Saves the working copy (`src/styles/`) as `configs/<name>/` |
| `npm run use-config <name>` | Replaces the working copy with `configs/<name>/` |
| `npm run configs-table [-- --check]` | Regenerates the table of configs in `configs/README.md` from their READMEs, or with `--check` fails when it's stale (see [Configs](#configs)) |
| `npm run update-bootstrap` | Moves `node_modules/bootstrap` to the latest `v6-dev` commit, then runs `check-configs`, `check-dist`, `audit-tokens`, `compile-matrix`, `audit-rtl`, `audit-motion` and `audit-layers` against it, and records its sizes |
| `npm run sync-kitchen-sink -- ../twbs/bootstrap` | Regenerates `kitchen-sink/` from a Bootstrap checkout's docs |
| `npm run diff-bootstrap -- <from> <to> [--serve]` | Compares two Bootstrap commits: CSS diff, tokens, sizes and kitchen sink screenshots, or with `--serve` both in the compare view (see [Comparing two commits](#comparing-two-commits)) |
| `npm run canary-report [-- --only <checks>]` | Runs every check and writes the nightly canary's report to `reports/canary/report.md` (see [Nightly canary](#nightly-canary)) |

## Where Bootstrap comes from

By default, Bootstrap is installed from GitHub (`github:twbs/bootstrap#v6-dev`), and `package-lock.json` pins the commit. Run `npm run update-bootstrap` to move to the latest commit. The toolbar and home page show which commit is in use.

Dependabot updates the playground's other dependencies and its GitHub Actions every week, but never `bootstrap`. Bootstrap updates come from the [nightly canary](#nightly-canary), or from a deliberate `npm run update-bootstrap`.

### Comparing two commits

After an update, the question is what the upstream commits changed. `npm run diff-bootstrap -- <from> <to>` takes two commits, branches or tags of twbs/bootstrap (`npm run diff-bootstrap -- 624c7b9 v6-dev`) and fetches each into `.cache/bootstrap/<sha>/`, shallowly, reused on later runs. It then compares:

- the upstream commits between them;
- the default config's compiled CSS, normalized like [Checking the dist](#checking-the-dist), as a diff;
- its `--bs-*` tokens: added, removed, and changed values;
- the sizes [`check-size`](#sizes) measures;
- every kitchen sink example, screenshotted on a dev server per commit and compared pixel by pixel. `--no-screens` skips that part, and `--page=<filter>` narrows it.

```
35 upstream commits. CSS diff +465 −450 lines. Tokens: 22 added, 22 removed, 15 changed.
  dist/bootstrap.bundle.min.js: 49.3 KB +1.9 KB (+4.1%) brotli
5 kitchen sink examples render differently:
   280446 px  /kitchen-sink/forms-datepicker.html#inline-mode-4
```

It writes `reports/diff/<from>-<to>/index.html`, a browsable report with the diff, the token lists and each changed example (both commits and their difference), plus `summary.md`. The nightly canary runs it on every update: the summary goes into its pull request, and the full report into the run's artifact. A comparison takes one to two minutes.

To look at the two commits yourself, `npm run diff-bootstrap -- <from> <to> --serve` skips the report and serves the playground with `<from>` at <http://localhost:5198/> and with `<to>` under <http://localhost:5198/b/>, from one origin. The [compare view](#compare) then gets a *Bootstrap* field in each pane and a *Commit A / B* preset, and keeps both panes in sync as usual:

```sh
npm run diff-bootstrap -- 624c7b9 v6-dev --serve
# Compare: http://localhost:5198/compare.html?page=%2Fkitchen-sink%2Fcomponents-button.html&a=bootstrap%3Da&b=bootstrap%3Db
```

### Nightly canary

[`.github/workflows/canary.yml`](.github/workflows/canary.yml) runs every night, and on demand from the *Actions* tab. When `v6-dev` has moved, it:

1. updates Bootstrap like `npm run update-bootstrap` (`package.json` keeps `#v6-dev`, the lockfile pins the new commit);
2. fetches that exact commit's docs and resyncs the kitchen sink;
3. runs every check with `npm run canary-report`, then compares the two commits with `npm run diff-bootstrap`: the compile and dist checks, every audit, `lint:html`, the size check (its table goes into the report, and the new sizes into `sizes/history.json`), the rendered audits, the console crawl, the smoke tests in all three engines, and the visual suite;
4. opens a pull request `chore(deps): update bootstrap to v6-dev@<sha>`, or updates the open one. It's labelled `canary`, plus `checks-failing` when a check fails.

The pull request body is the report: the upstream commits since the last update, one row per check, the kitchen sink pages the sync changed, the end of each failing check's output, and the allowlist entries that no longer match. A stale entry usually means Bootstrap fixed a tracked bug, which is step 3 of [Upstream issues](#upstream-issues). The visual suite is reported as *changed* rather than failed, since a Bootstrap update can change the rendering on purpose; the run's *canary-report* artifact has the diffs. When `v6-dev` hasn't moved, or the open pull request is already at its head, the workflow stops after one `git ls-remote`. When the pull request's branch has commits of your own, it leaves the branch alone and comments with a link to the new report. It never merges.

Upstream pull request numbers in commit subjects are shown as code, not links, so the report doesn't add a cross-reference to twbs/bootstrap every night.

Opening the pull request needs one of these:

- a `CANARY_TOKEN` repository secret (*Settings › Secrets and variables › Actions*, not an environment secret): a fine-grained token limited to this repository, with *Contents*, *Pull requests* and *Issues* read/write. *Issues* covers the labels and the take-over comment. With it, the pull request also starts the other workflows, and shows the token's owner as its author. When the token expires, the canary fails at checkout until the secret is updated.
- *Allow GitHub Actions to create and approve pull requests* in the repository's *Settings › Actions › General*. The pull request then comes from `GITHUB_TOKEN`, which doesn't start other workflows, so the report is its only check run.

From the *Actions* tab, *Run workflow* with *force* runs the checks even when `v6-dev` hasn't moved, and uploads the report without opening a pull request when nothing changed.

`npm run canary-report` runs the same checks locally, against `node_modules/bootstrap`, in about four minutes. `-- --only audit-rtl,lint:html` runs a subset, and `-- --from <sha> --to <sha>` adds the upstream commit range.

To test a **local checkout** instead, such as a branch you're working on:

```sh
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Vite then resolves every `bootstrap/...` import (Sass and JS) to that folder, and edits there hot-reload too. Delete `.env.local` to go back to GitHub.

The playground builds Bootstrap from **source**, the way Bootstrap's own build does:

- **CSS** is compiled from `scss/`, then `postcss.config.js` applies the same PostCSS step as Bootstrap's `build/postcss.config.mjs`. That step adds the `--bs-` prefix to every custom property and runs Autoprefixer with Bootstrap's `.browserslistrc`. The output matches `dist/css/bootstrap.css` (see [Checking the dist](#checking-the-dist)), and the builds keep `light-dark()` intact.
- **JavaScript** is imported from `js/src/index.ts`, so the playground runs the branch's current code even when the committed `js/dist/` hasn't been rebuilt yet.

Users install the package and get its prebuilt files, though, and a stale or broken `dist` is its own kind of bug (#1). The toolbar's **Source / Dist** switch, or `?css=dist` and `?js=dist` in the URL, loads those instead:

- **`css=dist`** replaces the compiled `main.scss` with `dist/css/bootstrap.css`. `tokens.css` still applies on top, from the working copy or the selected config, but a config's Sass options can't reach a prebuilt file. Issue reproductions compile their own styles, so they keep them.
- **`js=dist`** loads `js/dist/index.js`, what `import 'bootstrap'` gives users, instead of `js/src/index.ts`. Only one of the two ever loads. The JavaScript can't be swapped live, so the switch reloads the page.

Both honor `BOOTSTRAP_PATH`. The compare view's *Source / Dist* preset puts the default config compiled from source next to the prebuilt files, and the [console crawl](#console-crawl) and the [smoke tests](#interaction-smoke-tests) run a `dist` variant too.

`src/js/main.js` imports Bootstrap dynamically, so it runs after `DOMContentLoaded`, and sometimes after `load`. Several components only initialize from those events ([#160](https://github.com/julien-deramond/bootstrap-test-playground/issues/160)), so `main.js` replays the ones that fired while it loaded. A page's own inline scripts are bundled after `main.js` in a build: have them check `document.readyState` rather than only listen for `load`.

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

### Sizes

A config that adds a theme color or turns on every utility has a size cost, and a jump in output size is an early sign of a Sass loop gone wrong. `npm run check-size` measures, minified, gzipped and brotli-compressed:

- `css/<config>`: each saved config's CSS, compiled like the playground and minified with Lightning CSS at Bootstrap's browser floors, like `vite build`. The working copy isn't measured.
- `dist/…`: Bootstrap's prebuilt `bootstrap.min.css`, `bootstrap.min.js` and `bootstrap.bundle.min.js`, as users download them.
- `src/bootstrap.bundle.js`: `js/src` and its dependencies bundled and minified with Rolldown, which follows the source even when `dist/` wasn't rebuilt.

```
File                          Minified  Gzip     Brotli   Brotli change
css/default                   370.1 KB  49.8 KB  35.4 KB  ±0
dist/bootstrap.bundle.min.js  211.4 KB  57.8 KB  49.3 KB  ±0
src/bootstrap.bundle.js       186.1 KB  53.5 KB  46.5 KB  ±0
```

It compares the brotli size with the last entry of [`sizes/history.json`](sizes/history.json) and flags a change of more than 2%, without failing. Brotli, because it matches byte for byte on every platform, while Node's gzip output varies by up to 0.3% between macOS and the Linux runners on identical files. Gzip is still listed, as a server would send it. `-- --record` adds the current Bootstrap commit to the history (or replaces its entry). `npm run update-bootstrap` records after each update, and so does the [nightly canary](#nightly-canary), whose report has the table with each file's change. [`/sizes.html`](sizes.html) shows the latest sizes, their change and each file's history. A config edited between two updates shows up in the next change too.

### Option combinations

`scss/_config.scss` has a dozen `$enable-*` flags, plus `$color-mode-type`, and they interact: shadows and gradients, grid and CSS grid, transitions and reduced motion. `npm run compile-matrix` compiles Bootstrap under about 80 combinations in a few seconds: the defaults, every flag on, every flag off, each option toggled alone and each pair of options toggled together. It fails when:

- a combination doesn't compile, and it names the combination;
- toggling an option leaves the CSS byte-identical, meaning the option does nothing;
- toggling one option changes nothing once another is toggled, although it does on its own, meaning the first masks it.

```
Combination            Status  Size      Δ default  Rules  Warnings  Notes
default                ok      481.4 KB  ±0         4419   0
all-off                ok      418.7 KB  −62.6 KB   3794   0
rounded=false          ok      469.2 KB  −12.1 KB   4366   0
color-mode-type=data   ok      481.4 KB  ±0         4419   0         identical to default
✓ color-mode-type: toggling it leaves the CSS byte-identical (known: only changes the output of the color-mode() mixin, …)
```

Options known to do nothing are listed in [`scripts/known-options.mjs`](scripts/known-options.mjs), with their tracking issue or the reason. The full table is in `reports/matrix/summary.md`, and each combination's CSS is next to it, ready to diff. `npm run update-bootstrap` runs the matrix after each update, and so does the *Configs* workflow.

### Auditing RTL

Bootstrap v6 has no RTL stylesheet. It relies on logical properties (`margin-inline-start`, `inset-inline-end`), so every declaration that still uses the physical left or right either renders the same in both directions by design or is an RTL bug. `npm run audit-rtl` compiles `configs/default` and lists them, each with its Sass file and line:

- physical properties: `left`, `margin-right`, `border-top-left-radius`…
- directional values: `left`/`right` keywords (`background-position: right …`, `to right` gradients), an x offset (`translateX()`, a non-centered `transform-origin`), a rotation, a mirror (`scaleX(-1)`) or a slanted gradient, including in custom properties
- shorthands whose left and right sides differ, and shadows with an x offset

It leaves out what renders the same in both directions: `left: 0` with `right: 0` in the same rule, `left: 50%` with `translateX(-50%)`, and declarations that a `:dir(rtl)` or `[dir=rtl]` rule overrides for the same selector. Known findings are listed in [`scripts/known-rtl.mjs`](scripts/known-rtl.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches. `npm run update-bootstrap` runs it, and so does the *Configs* workflow.

The static list can't tell a bug from a deliberate choice. `npm run audit-rtl -- --render` looks at the result instead. It starts a dev server, screenshots each of the ~480 kitchen sink examples in LTR and in RTL, mirrors the RTL screenshot and compares it with the LTR one. A docs example should be its own mirror image, so what differs is a lead: a divider on the outer edge, a chevron on the wrong side. Text is made transparent first, since glyphs don't mirror. Some images are meant not to mirror either, like a check mark or a logo.

```
482 kitchen sink examples compared, 54 differ from their mirror image:
     8289 px  /kitchen-sink/forms-range.html#value-bubble
     5643 px  /kitchen-sink/components-avatar.html#stack-with-sizes
     1317 px  /kitchen-sink/components-badge.html#positioned
       36 px  /kitchen-sink/components-button-group.html#dividers
```

It takes under a minute and writes `reports/rtl/render.md`, with one image per example: the LTR screenshot, the mirrored RTL one and their difference in magenta. `--page=range` limits it to matching pages, and `--min-pixels=<n>` sets how many pixels must differ for an example to be listed (10 by default).

### Auditing motion

`$enable-reduced-motion` and `$enable-transitions` promise that motion can be removed, for the reader or for everyone. `npm run audit-motion` checks every transition, animation and smooth scroll of `configs/default`, each with its Sass file and line. Each one is:

- **guarded**: only declared under `@media (prefers-reduced-motion: no-preference)`;
- **stopped**: a `prefers-reduced-motion: reduce` rule sets it to `none`;
- **slowed**: a `reduce` rule only changes a custom property it reads, like a spinner's speed;
- **uncovered**: it moves whatever the reader's setting.

Then it compiles the two motion configs. [`configs/no-transitions`](configs/no-transitions/) (`$enable-transitions: false`) must have no transition left, and [`configs/no-reduced-motion`](configs/no-reduced-motion/) (`$enable-reduced-motion: false`) no `prefers-reduced-motion` query. Known findings are listed in [`scripts/known-motion.mjs`](scripts/known-motion.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches.

`npm run audit-motion -- --render` watches the browser instead, so it also sees motion started by Bootstrap's JavaScript. It opens every kitchen sink page twice: with `prefers-reduced-motion: reduce` emulated, where nothing may move, and with `configs/no-transitions`, where nothing may transition. On each page it records what runs once loaded, then clicks every toggle and focuses every field, and records what `document.getAnimations()` returns after each step. It takes about a minute and a half and writes `reports/motion/render.md`. The `runtime` patterns in `known-motion.mjs` match what it sees.

`npm run update-bootstrap` and the *Configs* workflow run the static audit. The *Console crawl* workflow runs `--render`.

### Auditing cascade layers

Bootstrap declares `@layer colors, config, root, reboot, layout, content, forms, components, custom, helpers, utilities`, and the [customization rules](#customizing) rely on it: global tokens stay unlayered, component overrides go in `@layer custom`, helpers and utilities win. `npm run audit-layers` maps every rule of `configs/default` to its layer and reports:

- **unlayered** rules, other than the global tokens on `:root`, `:host` and `[data-bs-theme]`. An unlayered rule beats every layer, so neither a utility nor `@layer custom` can override it.
- **undeclared** layers: an `@layer` block missing from the statement is ordered after `utilities`.
- **split** files: a Bootstrap source file whose rules land in more than one layer.
- every **`!important`**, grouped by rule. Across layers `!important` reverses the order: one in `reboot` beats one in `utilities`, and beats an unlayered one too.
- with a `BOOTSTRAP_PATH` checkout, a layer list in Bootstrap's `AGENTS.md` that differs from the statement (npm doesn't ship that file).

Known findings are listed in [`scripts/known-layers.mjs`](scripts/known-layers.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches.

[`issues/pg-27/`](issues/pg-27/) checks the rules themselves in the browser. Each check uses an override in that reproduction's own `tokens.css` or `_custom.scss`, the files the rules are about, with a `:where()` selector so only layer order can make it win, and shows a pass or fail marker. `npm run audit-layers -- --render` reads the markers. A check that fails with a `data-issue` is a known upstream bug; one that passes with it may be fixed. `npm run update-bootstrap` and the *Configs* workflow run the static audit, and the *Console crawl* workflow runs `--render`.

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

Its `README.md` starts from [the template](scripts/templates/config/README.md). The first paragraph describes the config, and the toolbar and the home page show it. Then come *What it stresses*, *Pages to check*, and *Known gaps*, which links the tracking issues. [`configs/README.md`](configs/README.md#saved-configs) has a table of every config, generated from those READMEs by `npm run configs-table`. `save-config` updates it, and the *Configs* workflow fails when it's stale.

Then:

- **Preview it on any page** with the toolbar's *Styles* menu, the *Configs* section at the bottom of the home page, or `?config=rounded-dark` in the URL. The shared stylesheets are swapped live, and the page doesn't need a reload.
- **Start a reproduction from it**: `npm run new-issue 42928 -- --config rounded-dark`
- **Make it the working copy**: `npm run use-config rounded-dark`. This refuses to run if `src/styles/` has uncommitted changes, unless you pass `-- --force`.

`configs/default/` holds Bootstrap's defaults. Keep it pristine; `npm run use-config default` resets the working copy. `configs/shadcn/` recreates shadcn/ui's default theme (see [Real screens](#real-screens)). Every `$enable-*` option that changes the CSS has a config that flips it, like `configs/no-rounded/` or `configs/grid-css-only/`. `configs/square/`, `configs/pill/`, `configs/compact/` and `configs/spacious/` push the radius, spacing and control size tokens to their extremes. `configs/gray-warm/`, `configs/gray-cool/`, `configs/hue-shift/`, `configs/mono/`, `configs/brand/` and `configs/dark-first/` do the same with the palette, the theme colors and the color scheme. `configs/web-font/`, `configs/serif/`, `configs/large-type/`, `configs/root-62-5/` and `configs/weights/` do it with fonts, text sizes and weights. `configs/breakpoints-custom/`, `configs/containers-fluid/`, `configs/grid-16/` and `configs/spacers-extended/` change the breakpoints, the containers, the grid and the spacing scale. `configs/no-transitions/` and `configs/no-reduced-motion/` are also used by [Auditing motion](#auditing-motion). [`configs/README.md`](configs/README.md#saved-configs) lists them all.

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
tests/console/           Console crawl (Playwright) and its known issues
tests/smoke/             Interaction smoke tests (Playwright) and their known issues
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

### Validating HTML

Invalid markup can hide or fake a Bootstrap bug: a `<div>` inside a `<button>`, a duplicate id, an unknown element. `npm run lint:html` validates every page, the home page, `compare.html` and the reproduction template with [html-validate](https://html-validate.org/), the validator Bootstrap uses for its docs. It uses the `html-validate:standard` preset, which checks validity (content models, duplicate ids, attributes) rather than style. Bootstrap's own docs config only checks duplicate ids.

It lists errors by file, so duplicate ids read per page. The kitchen sink has none: each example's ids are the docs' own, and the generator suffixes repeated section headings (`-2`, `-3`). An error in `kitchen-sink/` is an upstream docs bug, since those pages are generated. It gets a tracking issue and an entry in [`scripts/known-html.mjs`](scripts/known-html.mjs); fix errors in the playground's own pages instead. The lint fails on a new error and on an entry that no longer matches. The *Configs* workflow runs it.

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
| Source / Dist | Compiles Bootstrap from `scss/` and `js/src/`, or loads the prebuilt `dist/css/bootstrap.css` and `js/dist/` (see [Where Bootstrap comes from](#where-bootstrap-comes-from)) | | `?css=dist`, `?js=dist` |
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

[`/compare.html`](compare.html) shows any page twice, side by side, with separate theme, direction, primary, config and source (CSS and JS, `src` or `dist`) settings, and keeps the two panes' scroll positions in sync. Presets cover Light / Dark, LTR / RTL, Working / Default and Source / Dist, plus Commit A / B under [`diff-bootstrap --serve`](#comparing-two-commits). The whole setup lives in the URL, so a comparison can be shared as a link.

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

[`tests/console/`](tests/console/console.spec.js) opens every page, including the home and compare pages, in light and dark with the working copy and every saved config, and once more with Bootstrap's prebuilt files (`?css=dist&js=dist`). It fails on anything a page reports:

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

## Interaction smoke tests

Screenshots and the console crawl can't see a menu that no longer opens or a dialog that ignores Escape. [`tests/smoke/`](tests/smoke/smoke.spec.js) drives each of Bootstrap's JavaScript components on its kitchen sink page: alert, button, carousel, chips, collapse, combobox, datepicker, dialog, drawer, menu, OTP input, popover, range, scrollspy, password strength, tab, toast, toggler and tooltip. For each one it:

- opens it and checks its state (`open`, `aria-expanded`, `.show`, `aria-selected`, focus);
- walks its keyboard paths where it has them (arrows, Home and End, Escape);
- closes it and checks that nothing is stuck (focus back on the trigger, no scroll lock, no leftover open dialog or inert content);
- checks that the expected `*.bs.*` events fired, in order. An init script records every event Bootstrap dispatches, so a test fails when one stops firing.

Every scenario runs with the working copy, every config, and a `dist` variant with Bootstrap's prebuilt files (`?css=dist&js=dist`): neither a config nor the shipped files may break behavior. Pages load with `?chrome=0&freeze`, so transitions are off. Like the other suites, it runs against a production build:

```sh
npm run test:smoke
npm run test:smoke -- -g "shadcn menu"   # one config and component
```

A scenario that fails because of an open upstream bug goes in [`tests/smoke/known-issues.js`](tests/smoke/known-issues.js) with its tracking issue. It's marked `test.fail()`, so the run fails as soon as it passes again, and the entry gets removed. NavOverflow has no kitchen sink example yet, so it has no scenario. [`.github/workflows/smoke.yml`](.github/workflows/smoke.yml) runs the suite in all three engines on every pull request and every push to `main`.

## Browser engines

v6 leans on features whose support differs between engines at the floors of Bootstrap's `.browserslistrc` (Chrome 130, Firefox 132, Safari 18): `light-dark()`, `color-mix()`, `oklch()`, `:has()`, `@layer`, `<dialog>`. Every suite runs in each of Playwright's engines, as one project per engine: `visual`, `visual-firefox`, `visual-webkit`, `console`, `console-firefox` and so on. The unsuffixed projects are Chromium, and `npm run test:visual`, `test:console` and `test:smoke` run only those, for speed:

```sh
npx playwright install firefox webkit   # once
npm run test:smoke:engines              # the smoke tests in all three
npm run test:console:engines            # the console crawl in all three
npm run test:visual:engines             # the visual suite in all three
npx playwright test --project smoke-webkit -g dialog
```

Failures are reported per project, so an engine-only failure stands out. It's usually a browser difference that Bootstrap doesn't handle, like WebKit leaving focus behind a dialog that opens ([#158](https://github.com/julien-deramond/bootstrap-test-playground/issues/158)). It gets a tracking issue like any other bug, and its entry in `known-issues.js` takes `engines: ['webkit']` so it only applies there.

Visual baselines are per engine, since fonts and native controls render differently: Chromium's in `tests/visual/screenshots/<platform>/`, the others' in `tests/visual/screenshots/<platform>/visual-firefox/` and `visual-webkit/`. The `update-baselines` label records all three.

In CI, pull requests run the smoke tests in all three engines ([`smoke.yml`](.github/workflows/smoke.yml)) and the console crawl and visual suite in Chromium ([`console.yml`](.github/workflows/console.yml), [`visual.yml`](.github/workflows/visual.yml)). [`engines.yml`](.github/workflows/engines.yml) runs the console crawl and the visual suite in Firefox and WebKit every night, and on demand from the *Actions* tab.

A baseline records whatever an engine renders, bugs included, so it's worth comparing engines before trusting one. Comparing every kitchen sink example across the three, with text hidden, found one engine-only difference that isn't font metrics or native controls: WebKit leaves a `<legend>` in a `fieldset.row` above the row ([#169](https://github.com/julien-deramond/bootstrap-test-playground/issues/169)).

To add a device preset, such as a phone viewport with touch, add it to `ENGINES` in [`playwright.config.js`](playwright.config.js), like `iphone: devices['iPhone 15']`. Every console and smoke scenario then also runs as `console-iphone` and `smoke-iphone`.

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

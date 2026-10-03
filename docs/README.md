# Documentation

How the playground works, tool by tool. The [README](../README.md) has the overview and the quick start.

| Page | What it covers |
| --- | --- |
| [Customizing](customizing.md) | The working copy (`src/styles/`), where overrides go, and saved configs |
| [Pages and tools](pages.md) | The folder layout, page search, starter and real screens, the kitchen sink, issue reproductions, the toolbar and its URL flags, the compare and matrix views, deployment |
| [Bootstrap versions and updates](bootstrap.md) | Updating Bootstrap, what the last update changed, comparing two commits, the nightly canary, testing a local checkout, source or dist |
| [Test suites](testing.md) | Visual regression, console crawl, interaction smoke tests, accessibility scan, browser engines, and how CI runs them |
| [Checks and audits](audits.md) | Config compilation, HTML validation, dist drift, tokens, sizes, option combinations, RTL, motion, cascade layers, partial imports |

Contributors, human or agent, also follow [CLAUDE.md](../CLAUDE.md): the conventions, and how a Bootstrap bug found here is tracked until it's fixed upstream.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` / `npm run preview` | Builds every page to `dist/` and serves the build |
| `npm run test:visual [-- -u]` | Screenshots every page and compares with the baselines (see [Visual regression tests](testing.md#visual-regression-tests)) |
| `npm run test:console` | Opens every page and fails on errors, warnings and failed requests (see [Console crawl](testing.md#console-crawl)) |
| `npm run test:smoke` | Opens, drives and closes every JavaScript component and checks its state and events (see [Interaction smoke tests](testing.md#interaction-smoke-tests)) |
| `npm run test:a11y` | Scans every page with axe-core at WCAG 2.2 AA, in light and dark with the default config, or every config with `A11Y_CONFIGS=all`, then every overlay open (see [Accessibility scan](testing.md#accessibility-scan)) |
| `npm run a11y-summary` | Sums up the last accessibility scan per config: violating elements by axe rule (see [Accessibility scan](testing.md#accessibility-scan)) |
| `npm run report:contrast [-- --config <name>]` | Measures every documented color pairing and the components that embed one, per config and color mode, and writes `reports/contrast/` (see [Accessibility scan](testing.md#accessibility-scan)) |
| `npm run test-scope [-- <base>]` | Prints what the console crawl, the smoke tests and the accessibility scan have to run for the changes since `<base>` (see [Console crawl](testing.md#console-crawl)) |
| `npm run test:smoke:engines` / `test:console:engines` | The same suites in Chromium, Firefox and WebKit (see [Browser engines](testing.md#browser-engines)) |
| `npm run lint:html [-- --all]` | Validates the HTML of every page with html-validate (see [Validating HTML](audits.md#validating-html)) |
| `npm run check-configs [-- --strict]` | Compiles the working copy, every config and every reproduction, and lists Sass errors and warnings (see [Checking configs](audits.md#checking-configs)) |
| `npm run check-dist` | Checks that the default config compiles to Bootstrap's `dist/css/bootstrap.css` (see [Checking the dist](audits.md#checking-the-dist)) |
| `npm run check-size [-- --record]` | Measures each config's CSS, the dist files and the JS bundle (minified, gzip, brotli) and compares them with `sizes/history.json` (see [Sizes](audits.md#sizes)) |
| `npm run compile-matrix` | Compiles Bootstrap under combinations of its `$enable-*` options and reports failures and options that do nothing (see [Option combinations](audits.md#option-combinations)) |
| `npm run matrix -- <page>[#<example>]` | Renders a page or a kitchen sink example under several configs, themes and directions, and writes the grid as one image with a pixel diff against the first column (see [Matrix](pages.md#matrix)) |
| `npm run audit-rtl [-- --all \| --render]` | Lists declarations that use the physical left or right, and with `--render` the kitchen sink examples whose RTL rendering isn't the mirror image of the LTR one (see [Auditing RTL](audits.md#auditing-rtl)) |
| `npm run audit-motion [-- --all \| --render]` | Lists transitions and animations that ignore `prefers-reduced-motion` or survive `$enable-transitions: false`, and with `--render` what still moves in the browser (see [Auditing motion](audits.md#auditing-motion)) |
| `npm run audit-partials [-- --all]` | Compiles every Sass partial alone after `root`, the docs' Option B, maps what each needs from the others, and checks `with (…)` on the entry points (see [Auditing partial imports](audits.md#auditing-partial-imports)) |
| `npm run audit-layers [-- --all \| --render]` | Lists rules outside Bootstrap's cascade layers, undeclared layers and every `!important`, and with `--render` checks the documented override rules in the browser (see [Auditing cascade layers](audits.md#auditing-cascade-layers)) |
| `npm run audit-tokens [-- --all \| --render]` | Lists `--bs-*` tokens that are read but never defined, or defined but never read, and with `--render` the ones overriding doesn't change (see [Auditing tokens](audits.md#auditing-tokens)) |
| `npm run new-issue 42928 [-- --config <name>] [--from <page>#<id>]` | Creates `issues/42928/` from the reproduction template and a config, optionally starting from a kitchen sink example (see [Issue reproductions](pages.md#issue-reproductions)) |
| `npm run import-issue 42754 [-- --config <name>] [--force]` | Creates `issues/42754/` from a twbs/bootstrap issue or pull request: its title, summary, version, expected and actual behavior and the code of its reduced test case, cleaned, with its JavaScript inert. Builds fail until the page is reviewed (see [Importing an upstream issue](pages.md#importing-an-upstream-issue)) |
| `npm run check-issues [-- <name>...] [--no-gh]` | Runs every reproduction's `assert.js` in headless Chromium and prints PASS (fixed upstream: step 3 of the upstream workflow, with its commands), FAIL, SKIP or NONE, with each tracking issue's label (see [Assertions](pages.md#assertions)) |
| `npm run save-config <name> [-- "Description"] [--category <id>]` | Saves the working copy (`src/styles/`) as `configs/<name>/`, filed under a category (see [Configs](customizing.md#configs)) |
| `npm run use-config <name>` | Replaces the working copy with `configs/<name>/` |
| `npm run configs-table [-- --check]` | Regenerates the table of configs in `configs/README.md` from their READMEs, or with `--check` fails when it's stale (see [Configs](customizing.md#configs)) |
| `npm run update-bootstrap [-- --to <ref> \| --pr <n>] [--no-diff]` | Moves `node_modules/bootstrap` to the latest `v6-dev` commit, another commit, or an upstream pull request's head, then lists the upstream commits, resyncs the kitchen sink, runs the checks that need no browser, records the sizes, compares the rendering, records what changed and prints a commit message (see [Updating Bootstrap](bootstrap.md#updating-bootstrap)) |
| `npm run record-update -- --from <sha> --to <sha>` | Writes `updates/last-update.json`, what the home page lists and kitchen sink pages mark (see [What changed in the last update](bootstrap.md#what-changed-in-the-last-update)) |
| `npm run sync-kitchen-sink -- ../twbs/bootstrap` | Regenerates `kitchen-sink/` from a Bootstrap checkout's docs (see [Kitchen sink](pages.md#kitchen-sink)) |
| `npm run diff-bootstrap -- <from> <to> [--serve]` | Compares two Bootstrap commits: CSS diff, tokens, sizes and kitchen sink screenshots, or with `--serve` both in the compare view (see [Comparing two commits](bootstrap.md#comparing-two-commits)) |
| `npm run canary-report [-- --only <checks>]` | Runs every check and writes the nightly canary's report to `reports/canary/report.md` (see [Nightly canary](bootstrap.md#nightly-canary)) |
| `npm run status-sweep [-- --since <date>] [--apply]` | Checks the upstream status of the tracking issues, and with `--apply` relabels, closes and comments (see [Weekly status sweep](bootstrap.md#weekly-status-sweep)) |

# Checks and audits

Static checks that compile Bootstrap and read its output. They need no browser, except for the `--render` variants. `npm run update-bootstrap` and the *Configs* workflow run them, and the [nightly canary](bootstrap.md#nightly-canary) runs them all.

## Checking configs

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

It exits with an error when a folder fails to compile, and with `-- --strict` when there is any warning, `@warn` and Sass deprecations included. It honors `BOOTSTRAP_PATH`, like the dev server. `npm run update-bootstrap` runs it against the newly installed commit. [`.github/workflows/configs.yml`](../.github/workflows/configs.yml) runs it on every pull request and every push to `main`, and shows each warning as an annotation.

## Validating HTML

Invalid markup can hide or fake a Bootstrap bug: a `<div>` inside a `<button>`, a duplicate id, an unknown element. `npm run lint:html` validates every page, the home page, `compare.html` and the reproduction template with [html-validate](https://html-validate.org/), the validator Bootstrap uses for its docs. It uses the `html-validate:standard` preset, which checks validity (content models, duplicate ids, attributes) rather than style. Bootstrap's own docs config only checks duplicate ids.

It lists errors by file, so duplicate ids read per page. The kitchen sink has none: each example's ids are the docs' own, and the generator suffixes repeated section headings (`-2`, `-3`). An error in `kitchen-sink/` is an upstream docs bug, since those pages are generated. It gets a tracking issue and an entry in [`scripts/known-html.mjs`](../scripts/known-html.mjs); fix errors in the playground's own pages instead. The lint fails on a new error and on an entry that no longer matches. The *Configs* workflow runs it.

## Checking the dist

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

The normalized CSS and the full diffs go to `reports/dist/`. `npm run update-bootstrap` runs the check after each update, and so does the *Configs* workflow on every pull request, which uploads `reports/dist/` as the *dist-drift* artifact when it fails. When the `dist` line fails, record it as an upstream issue (see [Upstream issues](../CLAUDE.md#upstream-issue-tracking)). When the `pipeline` line fails, update `postcss.config.js` to match Bootstrap's `build/postcss.config.mjs`.

## Auditing tokens

A token that is read but never defined silently drops its declaration. A token that is defined but never read does nothing when you override it. Both are easy to miss and easy to detect. `npm run audit-tokens` compiles every config, reads its `--bs-*` custom properties and reports four kinds of findings, each with the Sass file and line:

| Kind | Meaning |
| --- | --- |
| `undefined` | Read without a fallback and never defined. Usually a bug, like a renamed token |
| `hook` | Read with a fallback and never defined: a customization hook, listed so a new one stands out |
| `unused` | Defined and never read: a scale meant for users, or a dead token |
| `foreign` | Defined only on one component and read on an unrelated selector, which is usually intended composition, like `.combobox-toggle.form-control` |

[`scripts/known-tokens.mjs`](../scripts/known-tokens.mjs) lists the known findings, each with its tracking issue or the reason it is intended. By default the report only shows the others, so it stays empty until something changes:

```
✓ configs/default: 0 new, 276 known
✗ configs/rounded: 1 new, 276 known
  Read without a fallback, never defined (undefined): 1
    --probe-color
      .probe  configs/rounded/_custom.scss:14
```

`-- --all` lists the known findings too. The audit fails on a new finding, and on a known entry that no longer matches anything, so a fix upstream gets noticed. `npm run update-bootstrap` runs it after each update, and the *Configs* workflow on every pull request. Record a new bug as an upstream issue (see [Upstream issues](../CLAUDE.md#upstream-issue-tracking)) and add it to `known-tokens.mjs` with the issue number.

The static audit can't see a token that is read but shadowed, like the hard-coded radius next to `--check-border-radius` ([#4](https://github.com/julien-deramond/bootstrap-test-playground/issues/4)). `npm run audit-tokens -- --render` checks the rendering instead. It starts a dev server, and for each of the ~630 component tokens of `configs/default`:

1. It finds an element that defines the token and contains one that reads it, on the kitchen sink pages first, then the other pages.
2. It overrides the token there with a series of test values (a color, a length, a keyword, `none`…).
3. It compares computed styles, including the `::before`, `::after`, `::backdrop`… that read it, then screenshots.

It takes about four minutes and writes one line per token to `reports/tokens/render.md`: *effective*, *no visible effect*, *not read*, or why it couldn't tell (no example on any page, or a hover or focus state the pages don't show). A token with no visible effect on a page may be masked there by a utility or the page's own CSS, so check the page before filing it upstream.

## Sizes

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

It compares the brotli size with the last entry of [`sizes/history.json`](../sizes/history.json) and flags a change of more than 2%, without failing. Brotli, because it matches byte for byte on every platform, while Node's gzip output varies by up to 0.3% between macOS and the Linux runners on identical files. Gzip is still listed, as a server would send it. `-- --record` adds the current Bootstrap commit to the history (or replaces its entry). `npm run update-bootstrap` records after each update, and so does the [nightly canary](bootstrap.md#nightly-canary), whose report has the table with each file's change. [`/sizes.html`](../sizes.html) shows the latest sizes, their change and each file's history. A config edited between two updates shows up in the next change too.

## Option combinations

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

Options known to do nothing are listed in [`scripts/known-options.mjs`](../scripts/known-options.mjs), with their tracking issue or the reason. The full table is in `reports/matrix/summary.md`, and each combination's CSS is next to it, ready to diff. `npm run update-bootstrap` runs the matrix after each update, and so does the *Configs* workflow.

## Auditing RTL

Bootstrap v6 has no RTL stylesheet. It relies on logical properties (`margin-inline-start`, `inset-inline-end`), so every declaration that still uses the physical left or right either renders the same in both directions by design or is an RTL bug. `npm run audit-rtl` compiles `configs/default` and lists them, each with its Sass file and line:

- physical properties: `left`, `margin-right`, `border-top-left-radius`…
- directional values: `left`/`right` keywords (`background-position: right …`, `to right` gradients), an x offset (`translateX()`, a non-centered `transform-origin`), a rotation, a mirror (`scaleX(-1)`) or a slanted gradient, including in custom properties
- shorthands whose left and right sides differ, and shadows with an x offset

It leaves out what renders the same in both directions: `left: 0` with `right: 0` in the same rule, `left: 50%` with `translateX(-50%)`, and declarations that a `:dir(rtl)` or `[dir=rtl]` rule overrides for the same selector. Known findings are listed in [`scripts/known-rtl.mjs`](../scripts/known-rtl.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches. `npm run update-bootstrap` runs it, and so does the *Configs* workflow.

The static list can't tell a bug from a deliberate choice. `npm run audit-rtl -- --render` looks at the result instead. It starts a dev server, screenshots each of the ~480 kitchen sink examples in LTR and in RTL, mirrors the RTL screenshot and compares it with the LTR one. A docs example should be its own mirror image, so what differs is a lead: a divider on the outer edge, a chevron on the wrong side. Text is made transparent first, since glyphs don't mirror. Some images are meant not to mirror either, like a check mark or a logo.

```
482 kitchen sink examples compared, 54 differ from their mirror image:
     8289 px  /kitchen-sink/forms-range.html#value-bubble
     5643 px  /kitchen-sink/components-avatar.html#stack-with-sizes
     1317 px  /kitchen-sink/components-badge.html#positioned
       36 px  /kitchen-sink/components-button-group.html#dividers
```

It takes under a minute and writes `reports/rtl/render.md`, with one image per example: the LTR screenshot, the mirrored RTL one and their difference in magenta. `--page=range` limits it to matching pages, and `--min-pixels=<n>` sets how many pixels must differ for an example to be listed (10 by default).

## Auditing motion

`$enable-reduced-motion` and `$enable-transitions` promise that motion can be removed, for the reader or for everyone. `npm run audit-motion` checks every transition, animation and smooth scroll of `configs/default`, each with its Sass file and line. Each one is:

- **guarded**: only declared under `@media (prefers-reduced-motion: no-preference)`;
- **stopped**: a `prefers-reduced-motion: reduce` rule sets it to `none`;
- **slowed**: a `reduce` rule only changes a custom property it reads, like a spinner's speed;
- **uncovered**: it moves whatever the reader's setting.

Then it compiles the two motion configs. [`configs/no-transitions`](../configs/no-transitions/) (`$enable-transitions: false`) must have no transition left, and [`configs/no-reduced-motion`](../configs/no-reduced-motion/) (`$enable-reduced-motion: false`) no `prefers-reduced-motion` query. Known findings are listed in [`scripts/known-motion.mjs`](../scripts/known-motion.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches.

`npm run audit-motion -- --render` watches the browser instead, so it also sees motion started by Bootstrap's JavaScript. It opens every kitchen sink page twice: with `prefers-reduced-motion: reduce` emulated, where nothing may move, and with `configs/no-transitions`, where nothing may transition. On each page it records what runs once loaded, then clicks every toggle and focuses every field, and records what `document.getAnimations()` returns after each step. It takes about a minute and a half and writes `reports/motion/render.md`. The `runtime` patterns in `known-motion.mjs` match what it sees.

`npm run update-bootstrap` and the *Configs* workflow run the static audit. The *Console crawl* workflow runs `--render`.

## Auditing cascade layers

Bootstrap declares `@layer colors, config, root, reboot, layout, content, forms, components, custom, helpers, utilities`, and the [customization rules](customizing.md) rely on it: global tokens stay unlayered, component overrides go in `@layer custom`, helpers and utilities win. `npm run audit-layers` maps every rule of `configs/default` to its layer and reports:

- **unlayered** rules, other than the global tokens on `:root`, `:host` and `[data-bs-theme]`. An unlayered rule beats every layer, so neither a utility nor `@layer custom` can override it.
- **undeclared** layers: an `@layer` block missing from the statement is ordered after `utilities`.
- **split** files: a Bootstrap source file whose rules land in more than one layer.
- every **`!important`**, grouped by rule. Across layers `!important` reverses the order: one in `reboot` beats one in `utilities`, and beats an unlayered one too.
- with a `BOOTSTRAP_PATH` checkout, a layer list in Bootstrap's `AGENTS.md` that differs from the statement (npm doesn't ship that file).

Known findings are listed in [`scripts/known-layers.mjs`](../scripts/known-layers.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches.

[`issues/pg-27/`](../issues/pg-27/) checks the rules themselves in the browser. Each check uses an override in that reproduction's own `tokens.css` or `_custom.scss`, the files the rules are about, with a `:where()` selector so only layer order can make it win, and shows a pass or fail marker. `npm run audit-layers -- --render` reads the markers. A check that fails with a `data-issue` is a known upstream bug; one that passes with it may be fixed. `npm run update-bootstrap` and the *Configs* workflow run the static audit, and the *Console crawl* workflow runs `--render`.

## Auditing partial imports

The Sass docs offer two ways in: all of Bootstrap, or "Option B", `root` first and then only the partials a site needs. [`configs/partial/`](../configs/partial/) is Option B as the docs write it. `npm run audit-partials` compiles every partial alone after `root` (`alert`, `forms`, `forms/check`…), leaving out the mixins, the vendored code, the entry points and, in a `BOOTSTRAP_PATH` checkout, Bootstrap's Sass unit tests (`scss/tests/`), and reports:

- **error:** a partial that doesn't compile that way
- **needs:** a partial that reads, without a fallback, tokens that only another partial defines, so leaving that one out drops the declaration. Tokens no partial defines are [`audit-tokens`](#auditing-tokens)' findings.
- **with:** a `@use … with (…)` that doesn't reach its entry point: `config` and `theme` before `root`, `root` with `$root-tokens`, a component with its token map, a folder index with a file's map, `utilities` before `utilities/api`

Its output is the dependency map. Known findings are listed in [`scripts/known-partials.mjs`](../scripts/known-partials.mjs), with their tracking issue or the reason. The audit fails on a new finding and on an entry that no longer matches. `npm run update-bootstrap`, the *Configs* workflow and the canary run it.

## Sass and tokens.css equivalence

Bootstrap's Sass docs offer two ways to change a token: at compile time through `@use "bootstrap/scss/bootstrap" with (…)`, and at runtime with a CSS custom property, which is what a config's `tokens.css` does. They diverge when Sass consumes a value at compile time: a scale folded from `$spacer`, a utility that writes a map's value instead of reading its token, a `$root-tokens` key a loop overwrites, a `null` key that removes a declaration. That's exactly what someone hits when moving a config from one path to the other.

`npm run check-equivalence` makes the same customization both ways. The pairs are in [`scripts/equivalence-pairs.mjs`](../scripts/equivalence-pairs.mjs): a radius step, the spacer and a spacer step, the button and control paddings, the alert paddings, a theme color sub-key and the border width, through their Sass variable or map and, where the docs suggest it, through `$root-tokens`. For each pair:

1. **Static**: it compiles the Sass side and compares the CSS with Bootstrap's defaults. Each change is either one tokens.css makes too, or one only Sass makes, computed or consumed at compile time. It also lists the tokens the Sass side never changes, and the rules that declare a layered token again, like size modifiers, which a `@layer custom` override replaces and Sass doesn't.
2. **Render**: it starts a dev server, opens every kitchen sink page with Bootstrap's defaults, with the Sass side and with the tokens side, screenshots each example in light mode and compares the two sides pixel by pixel. For the first examples that differ, it lists the computed styles that do.

```
✓ alert-padding: equivalent: 0 of 7 examples differ (Sass changes 6, tokens.css 6)
! radius-root-tokens: diverges: 147 of 481 examples differ (Sass changes 0, tokens.css 106)  (#334)
    The Sass side never changes --bs-radius-5: it keeps its default value everywhere.
! spacers: diverges: 94 of 481 examples differ (Sass changes 110, tokens.css 16)  (#332)
    Only the Sass side changes 126 declarations, computed or consumed at compile time:
      - margin-block-end on .mb-3, :where(.space-y-3 > :not(:last-child)) and 10 more (utilities): .5rem → .75rem, 12 declarations
```

*Sass changes* and *tokens.css* count the examples each side changes from the defaults, so a pair that changes nothing on either side shows *no visible effect* rather than a false *equivalent*. All three use the 10 pixel threshold of the other renders, so anti-aliasing doesn't count as a change. The run takes about six minutes and writes `reports/equivalence/report.md`, with an image per example that differs: Sass, tokens.css and their difference in magenta. `--pair=spacer,radius` and `--page=button` narrow it, and `--static` skips the browser and only compares the CSS, in seconds. A page that gives no result within two minutes, as happens when a headless tab stalls on a busy machine, is tried once more in fresh tabs, then skipped and listed in the report.

[`scripts/known-equivalence.mjs`](../scripts/known-equivalence.mjs) lists the pairs known to diverge, with their tracking issue or the reason it's intended, and [`configs/README.md`](../configs/README.md#sass-or-tokenscss) sums them up for whoever writes a config. The check fails on a pair that diverges without an entry, and on an entry whose pair no longer diverges (not with `--page` or a skipped page, which may leave its examples out). Record a new divergence as an upstream issue (see [Upstream issues](../CLAUDE.md#upstream-issue-tracking)) before adding it. To check another customization, add a pair: `sass` is the body of `with (…)`, `tokens` a tokens.css, and `pages` an optional filter on the kitchen sink pages.

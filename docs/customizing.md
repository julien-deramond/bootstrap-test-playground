# Customizing

The styles for the shared pages come from three files in `src/styles/`, the **working copy**. Out of the box they're empty or commented out, so the output is Bootstrap's defaults.

| File | Use it for |
| --- | --- |
| [`main.scss`](../src/styles/main.scss) | **Sass configuration**: swap `@use "bootstrap/scss/bootstrap";` for the commented `with (...)` version (options, `$root-tokens`, `$theme-colors`, component `$*-tokens`) |
| [`_custom.scss`](../src/styles/_custom.scss) | **Custom Sass rules**, in Bootstrap's `custom` cascade layer, with access to Bootstrap's mixins and functions |
| [`tokens.css`](../src/styles/tokens.css) | **Runtime CSS custom properties**, no Sass needed |

In `tokens.css`, write tokens unprefixed like the Sass docs (`--border-radius`) or prefixed like the dist CSS (`--bs-border-radius`). Both end up as `--bs-*`. Where you put an override matters:

- **Global tokens** (`:root`) must stay **unlayered**. Bootstrap outputs its `:root` tokens unlayered, so an override inside `@layer custom { :root { … } }` loses.
- **Component tokens and rules** go in `@layer custom`, after `components` and before `helpers` and `utilities`.

## Configs

Once the working copy holds a good test case, save it as a **config**, a folder in [`configs/`](../configs/) with the same three files:

```sh
npm run save-config rounded-dark -- "Large radii and a dark-first palette"
```

Its `README.md` starts from [the template](../scripts/templates/config/README.md). The first paragraph describes the config, and the toolbar and the home page show it. A `Category:` line then files it under *Shape*, *Color*, *Typography*, *Layout and density*, *Options*, *Sass API and build* or *Themes* (see [`configs/README.md`](../configs/README.md#saved-configs)). Then come *What it stresses*, *Pages to check*, and *Known gaps*, which links the tracking issues. [`configs/README.md`](../configs/README.md#saved-configs) has a table of every config, generated from those READMEs by `npm run configs-table`. `save-config` updates it, and the *Configs* workflow fails when it's stale.

Then:

- **Preview it on any example page** with the toolbar's *Config* list, the *Configs* section at the bottom of the home page (which saves the choice for the example pages, and keeps its own default styles), or `?config=rounded-dark` in the URL. The shared stylesheets are swapped live, and the page doesn't need a reload.
- **Start a reproduction from it**: `npm run new-issue 42928 -- --config rounded-dark`
- **Make it the working copy**: `npm run use-config rounded-dark`. This refuses to run if `src/styles/` has uncommitted changes, unless you pass `-- --force`.

`configs/default/` holds Bootstrap's defaults. Keep it pristine; `npm run use-config default` resets the working copy. `configs/shadcn/` recreates shadcn/ui's default theme (see [Real screens](pages.md#real-screens)). Every `$enable-*` option that changes the CSS has a config that flips it, like `configs/no-rounded/` or `configs/grid-css-only/`. `configs/square/`, `configs/pill/`, `configs/compact/` and `configs/spacious/` push the radius, spacing and control size tokens to their extremes. `configs/gray-warm/`, `configs/gray-cool/`, `configs/hue-shift/`, `configs/mono/`, `configs/brand/` and `configs/dark-first/` do the same with the palette, the theme colors and the color scheme. `configs/web-font/`, `configs/serif/`, `configs/large-type/`, `configs/root-62-5/` and `configs/weights/` do it with fonts, text sizes and weights. `configs/breakpoints-custom/`, `configs/containers-fluid/`, `configs/grid-16/` and `configs/spacers-extended/` change the breakpoints, the containers, the grid and the spacing scale. `configs/utilities-custom/` uses every option of the utility API, and [`pages/utility-api.html`](../pages/utility-api.html) checks each of its utilities. `configs/prefix-x/` and `configs/prefix-none/` compile the custom properties with the `x-` prefix and with none, and [`pages/custom-property-prefix.html`](../pages/custom-property-prefix.html) checks what Bootstrap's JavaScript reads and writes under each. `postcss.config.js` applies `bs-` everywhere, so a stylesheet picks another prefix with a `/*! playground-prefix: "x-" */` comment, which Sass keeps. `configs/color-mode-data/` sets `$color-mode-type: "data"` and uses the `color-mode()` mixin, and `configs/color-modes-custom/` adds three custom color modes, `blue` (the docs' example), `sepia` and `dim`. A config's own `[data-bs-theme="…"]` modes show up in the toolbar's *Color mode* control. [`pages/color-modes.html`](../pages/color-modes.html) checks the mixin with both types, and each mode's `color-scheme` and overlays. `configs/high-contrast/` pushes the tokens toward WCAG AAA and lists what it can't reach. `configs/mixins/` uses every documented Sass mixin and function and checks what the functions return, and [`pages/sass-api.html`](../pages/sass-api.html) shows what it builds. `configs/partial/` is the Sass docs' Option B, root and a few partials, so most pages show unstyled components on purpose (see [Auditing partial imports](audits.md#auditing-partial-imports)). `configs/grid-only/`, `configs/reboot-only/` and `configs/utilities-only/` compile the standalone entry points behind `bootstrap-grid.css`, `bootstrap-reboot.css` and `bootstrap-utilities.css`, each with a `with (…)` override, and [`pages/grid-only.html`](../pages/grid-only.html), [`pages/reboot-only.html`](../pages/reboot-only.html) and [`pages/utilities-only.html`](../pages/utilities-only.html) check what each one covers and leaves out. `configs/no-transitions/` and `configs/no-reduced-motion/` are also used by [Auditing motion](audits.md#auditing-motion). [`configs/README.md`](../configs/README.md#saved-configs) lists them all.

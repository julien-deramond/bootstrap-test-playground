# mixins

Every documented Sass mixin and function, used from `_custom.scss` the way the docs show: a custom `.callout` component, the docs' grid, row-cols and breakpoint examples as written, container queries, and three utilities built with the map functions in `main.scss`. `_custom.scss` also checks what each function returns and fails the build when it changes, so a rename or a changed result upstream fails `npm run check-configs`. [`pages/sass-api.html`](../../pages/sass-api.html) always uses this config.

## What it stresses

The documented API, each from the module that defines it (`bootstrap/scss/mixins` doesn't forward them all, [#219](https://github.com/julien-deramond/bootstrap-test-playground/issues/219)):

| Mixin or function | Docs | Loaded from | Used for |
| --- | --- | --- | --- |
| `defaults()` | [Sass: Defaults](https://getbootstrap.com/docs/6.0/customize/sass/#defaults) | `functions` | The callout's token map, and checked |
| `tokens()` | [Sass: Tokens](https://getbootstrap.com/docs/6.0/customize/sass/#tokens) | `mixins` | The callout's tokens |
| `escape-svg()` | [Sass: Escape SVG](https://getbootstrap.com/docs/6.0/customize/sass/#escape-svg) | `functions` | The callout icon, and checked |
| `map-merge-multiple()`, `negativify-map()` | [Sass: Map helpers](https://getbootstrap.com/docs/6.0/customize/sass/#map-helpers) | `functions` | `.pull-*`, as in the docs, and checked |
| `map-get-nested()` | [Sass: Map helpers](https://getbootstrap.com/docs/6.0/customize/sass/#map-helpers) | `functions` | `.type-*`, and checked |
| `map-get-multiple()` | [Sass: Map helpers](https://getbootstrap.com/docs/6.0/customize/sass/#map-helpers) | `functions` | `.tint-10`, `.tint-30` and `.tint-50`, and checked |
| `theme-color-values()` | [Sass: Theme color values](https://getbootstrap.com/docs/6.0/customize/sass/#theme-color-values) | `theme` | Checked |
| `theme-opacity-values()` | [Sass: Theme opacity values](https://getbootstrap.com/docs/6.0/customize/sass/#theme-opacity-values) | `theme` | `.tint-*`, and checked |
| `generate-theme-classes()` | [Sass: Theme classes](https://getbootstrap.com/docs/6.0/customize/sass/#theme-classes) | `theme` | `.theme-*` again, scoped to `.sass-api-themes` |
| `color-scheme()` | [Sass: Color schemes](https://getbootstrap.com/docs/6.0/customize/sass/#color-schemes) | `mixins` | The dimmed icon in dark mode |
| `mask-icon()` | [Sass: Mask icons](https://getbootstrap.com/docs/6.0/customize/sass/#mask-icons) | `mixins` | The callout icon |
| `color-mode()` | [Color modes: Building with Sass](https://getbootstrap.com/docs/6.0/customize/color-modes/#building-with-sass) | `mixins` | The callout's dashed edge in dark mode |
| `transition()` | [Hover lift](https://getbootstrap.com/docs/6.0/helpers/hover-lift/) | `mixins` | The callout's shadow |
| `visually-hidden()`, `visually-hidden-focusable()` | [Visually hidden](https://getbootstrap.com/docs/6.0/helpers/visually-hidden/) | `mixins` | The callout labels, the skip link |
| `focus-ring()` | [Migration: Sass](https://getbootstrap.com/docs/6.0/guides/migration/#sass) | `mixins/focus-ring` | The callout's focus |
| `make-container()`, `make-row()`, `make-col-ready()`, `make-col()`, `make-col-offset()` | [Grid: Sass mixins](https://getbootstrap.com/docs/6.0/layout/grid/#sass-mixins) | `layout/containers`, `mixins/grid` | The docs' *Example usage* as written, and an offset |
| `row-cols()` | [Grid: Row columns](https://getbootstrap.com/docs/6.0/layout/grid/#row-columns) | `mixins/grid` | The docs' example as written |
| `media-breakpoint-up()`, `-down()`, `-only()`, `-between()` | [Breakpoints: Media queries](https://getbootstrap.com/docs/6.0/layout/breakpoints/#media-queries) | `layout/breakpoints` | The callout's padding, the viewport labels |
| `set-container()`, `container-breakpoint-up()`, `-down()`, `-only()`, `-between()` | [Breakpoints: Container queries](https://getbootstrap.com/docs/6.0/layout/breakpoints/#container-queries) | `layout/breakpoints` | The labels of two named containers |

`border-radius()`, which the callout uses too, isn't documented anywhere.

## Pages to check

- [Sass API](../../pages/sass-api.html), in light and dark, at a few widths for the breakpoint labels and the row-cols example

## Known gaps

- `color-contrast()` and `contrast-ratio()` don't compile for any color, so the config leaves them out: [#218](https://github.com/julien-deramond/bootstrap-test-playground/issues/218).
- `bootstrap/scss/mixins` doesn't forward `focus-ring()`, the grid or the breakpoint mixins, and the docs don't say where to load mixins from: [#219](https://github.com/julien-deramond/bootstrap-test-playground/issues/219).

# color-mode-data

`$color-mode-type: "data"`, with a `color-mode(dark)` rule in `_custom.scss` that dims images and placeholders in dark mode. The option only changes what the `color-mode()` mixin emits, `[data-bs-theme="dark"] img` instead of a `prefers-color-scheme` query: Bootstrap never calls the mixin, so its own CSS is byte for byte the default's. [`pages/color-modes.html`](../../pages/color-modes.html) checks the mixin with both types.

Category: color

## What it stresses

- The `data` type against v6's color modes, which follow the system unless a `data-bs-theme` says otherwise. With the toolbar on *Auto* and the system in dark mode, the page is dark but the images aren't dimmed. On *Dark*, they are.
- Nested modes: `[data-bs-theme="dark"] img` also matches an image in a `data-bs-theme="light"` subtree inside a dark one.
- The mixin inside `@layer custom`, from a partial that loads `bootstrap/scss/mixins` after `main.scss` configured Bootstrap.

## Pages to check

- [Color modes](../../pages/color-modes.html?config=color-mode-data), whose *data* column checks the mixin in four contexts
- [Kitchen sink: Carousel](../../kitchen-sink/components-carousel.html?config=color-mode-data) and [Cards](../../kitchen-sink/components-card.html?config=color-mode-data), with the toolbar on *Auto* and then *Dark*, with the system in dark mode

## Known gaps

- The `color-mode()` mixin can't follow v6's color modes with either type. `data` ignores the system preference and matches through nested modes: [#201](https://github.com/julien-deramond/bootstrap-test-playground/issues/201).

# prefix-none

Unprefixed custom properties, `--border-radius` rather than `--bs-border-radius`. That's what the docs' [npm](https://getbootstrap.com/docs/6.0/guides/npm/) and [webpack](https://getbootstrap.com/docs/6.0/guides/webpack/) guides compile, since their PostCSS setup runs Autoprefixer only. The CSS works on its own, but Bootstrap's JavaScript hard-codes four `--bs-*` names, so the form range, the carousel and nav overflow lose what they read or write. [`pages/custom-property-prefix.html`](../../pages/custom-property-prefix.html) checks each of them.

Category: sass

## What it stresses

- An empty prefix. PostCSS runs for the whole project, so `main.scss` and `tokens.css` start with `/*! playground-prefix: "" */`, which the playground's `postcss.config.js` reads and removes.
- The same JavaScript couplings as [`prefix-x`](../prefix-x/): `--bs-range-fill`, `--bs-carousel-interval`, `--bs-carousel-items`, `--bs-carousel-items-peek` and `--bs-breakpoint-*`.
- Collisions: unprefixed names like `--gap`, `--color` or `--size` are more likely to clash with a project's own custom properties, which is why the docs prefix them.

## Pages to check

- [Custom property prefix](../../pages/custom-property-prefix.html?config=prefix-none), with a pass or fail marker per coupling
- [Kitchen sink: Range](../../kitchen-sink/forms-range.html?config=prefix-none), whose tracks don't fill

## Known gaps

- The range, the carousel and nav overflow use `--bs-*` names in the JavaScript, and the npm and webpack guides don't add the prefix the JavaScript needs: [#196](https://github.com/julien-deramond/bootstrap-test-playground/issues/196).
- The password strength text never takes its level's color, whatever the prefix: [#197](https://github.com/julien-deramond/bootstrap-test-playground/issues/197).
- Playground limits, not Bootstrap's: the toolbar's *Primary* menu sets `--bs-primary-*` tokens, so it has no effect here, and `?css=dist` swaps in the `--bs-` dist, so the prefix no longer applies.

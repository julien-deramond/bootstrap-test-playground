# prefix-x

Custom properties prefixed with `x-` instead of `bs-`, the way the [CSS variables docs](https://getbootstrap.com/docs/6.0/getting-started/css-variables/) say to change it: the `prefix` option of `postcss-prefix-custom-properties`. The CSS works on its own, but Bootstrap's JavaScript hard-codes four `--bs-*` names, so the form range, the carousel and nav overflow lose what they read or write. [`pages/custom-property-prefix.html`](../../pages/custom-property-prefix.html) checks each of them.

## What it stresses

- The prefix option. PostCSS runs for the whole project, so `main.scss` and `tokens.css` start with `/*! playground-prefix: "x-" */`, which the playground's `postcss.config.js` reads and removes. Bootstrap has no Sass `$prefix` anymore.
- The JavaScript's custom properties: `--bs-range-fill` (Range writes it), `--bs-carousel-interval` (Carousel writes it), `--bs-carousel-items` and `--bs-carousel-items-peek` (Carousel reads them to allow `ends: 'loop'`) and `--bs-breakpoint-*` (Nav overflow reads them for `collapseBelow`).
- The docs' own examples: the kitchen sink's inline styles, like `style="--bs-carousel-items: 3"`, don't apply, as in a project that copies them with another prefix.
- `data-bs-*` attributes and the `.bs-popover-*` and `.bs-tooltip-auto` classes keep their names: the option only renames custom properties.

## Pages to check

- [Custom property prefix](../../pages/custom-property-prefix.html?config=prefix-x), with a pass or fail marker per coupling
- [Kitchen sink: Range](../../kitchen-sink/forms-range.html?config=prefix-x), whose tracks don't fill
- [Kitchen sink: Carousel](../../kitchen-sink/components-carousel.html?config=prefix-x), whose indicators fill over 5 seconds whatever the interval

## Known gaps

- The range, the carousel and nav overflow use `--bs-*` names in the JavaScript: [#196](https://github.com/julien-deramond/bootstrap-test-playground/issues/196).
- The password strength text never takes its level's color, whatever the prefix: [#197](https://github.com/julien-deramond/bootstrap-test-playground/issues/197).
- Playground limits, not Bootstrap's: the toolbar's *Primary* menu sets `--bs-primary-*` tokens, so it has no effect here, and `?css=dist` swaps in the `--bs-` dist, so the prefix no longer applies.

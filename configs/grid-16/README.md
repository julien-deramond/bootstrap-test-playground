# grid-16

A 16-column grid with 2rem gutters: `$grid-columns: 16` and `$grid-gutter-x: 2rem`. Markup written for 12 columns keeps working but changes its proportions: `.col-6` is 37.5% wide instead of half, and a row of `.col-4`s leaves a quarter empty. That's expected.

## What it stresses

- The flex grid: `.col-1` to `.col-16` and offsets up to 15, at every breakpoint.
- The CSS grid: `--columns: 16`, `.g-col-1` to `.g-col-16` and `.g-start-1` to `.g-start-15`.
- The gutter: `--gutter-x` of rows, `--gap` of `.grid`, the containers' padding and the card group's margin all read `$grid-gutter-x` and become 2rem. The `.g-*` gutter classes keep the spacer scale.
- `.row-cols-*` and the `grid-cols-*` utilities count their own columns and don't change.

## Pages to check

- [Checkout](../../pages/checkout.html) and [Dashboard](../../pages/dashboard.html), built on `.col-*`
- [Form layout](../../kitchen-sink/forms-layout.html) and [Validation](../../kitchen-sink/forms-validation.html), with columns, gutters and `.g-col-*`
- [Dashboard screen](../../screens/dashboard.html), built on the CSS grid

## Known gaps

None known.

# grid-css-only

`$enable-grid-classes: false`: no flexbox grid (`.row`, `.col-*`, `.offset-*`, gutters), only the CSS grid. Pages built on `.row` stack their columns; that's expected, not a bug.

## What it stresses

- That no component depends on `.row` or `.col-*`, and that the CSS grid still works on its own.
- Containers still set `--gutter-y` for rows, which nothing reads any more (allowlisted in `known-tokens.mjs`).

## Pages to check

- [Starter screens](../../pages/), [Forms layout](../../kitchen-sink/forms-layout.html) and [Card](../../kitchen-sink/components-card.html), which use `.row`, to see the fallback
- [Real screens](../../screens/), which mostly use `.grid` and shouldn't change

## Known gaps

None known.

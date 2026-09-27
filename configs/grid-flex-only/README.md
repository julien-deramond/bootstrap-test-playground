# grid-flex-only

`$enable-cssgrid: false`: no CSS grid (`.grid`, `.g-col-*`, `.g-start-*`), only the flexbox grid. Pages built on `.grid` fall back to stacked blocks; that's expected, not a bug.

## What it stresses

- That nothing outside `.grid` depends on the CSS grid classes, and that the flexbox grid still works on its own.

## Pages to check

- [Screens: Dashboard](../../screens/dashboard.html) and [Validation](../../kitchen-sink/forms-validation.html), which use `.g-col-*`, to see the fallback
- [Starter screens](../../pages/) and [Forms layout](../../kitchen-sink/forms-layout.html), which only use the flexbox grid and shouldn't change

## Known gaps

None known.

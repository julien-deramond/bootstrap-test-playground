# mono

One color, `--mono-base` in `tokens.css`, drives the whole palette at runtime: every hue of `$colors` is that color, and the grays are it with almost no chroma. Use it to see how far Bootstrap's `color-mix()` derivations carry, and change `--bs-mono-base` in the browser's devtools to repaint everything without recompiling.

## What it stresses

- `$colors` set to a `var()` and to relative colors (`oklch(from var(--mono-base) 60% .02 h)`) instead of color values: Bootstrap compiles them without a warning, as it only interpolates them into `color-mix()`.
- Every theme, surface, text and border is a `color-mix()` of `--mono-base`. A scan of every kitchen sink page and screen, in both modes, found no color with another hue.
- The themes can't be told apart by hue any more: that's the point.
- The fixed `contrast` keys: `warning` and `info` keep `--gray-900`, which is 3.36:1 on this mid-lightness base, where white would be 5.22:1. A palette change has to set them too.
- `--mono-base` is read where the color scale is defined, on `:root`. Setting it on an element doesn't repaint that element's subtree.

## Pages to check

- [Button](../../kitchen-sink/components-button.html), [Alert](../../kitchen-sink/components-alert.html) and [Badge](../../kitchen-sink/components-badge.html), for every theme
- [Dashboard](../../pages/dashboard.html) and [Checkout](../../pages/checkout.html), on a full page

## Known gaps

None known.

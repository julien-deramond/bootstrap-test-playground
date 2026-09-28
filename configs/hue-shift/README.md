# hue-shift

Every hue of `$colors` rotated 180°, lightness and chroma kept: blue turns orange, green magenta, yellow blue-violet. What keeps its original hue doesn't read the color scale.

Category: color

## What it stresses

- The 14 hues of `$colors` (`$gray` and `$pewter` stay: `gray-warm` and `gray-cool` cover them), their `025…975` scales, and every theme color built from them.
- The theme maps' fixed `contrast` keys: `warning` and `info` pair with `--gray-900`, the others with `--white`. OKLCH keeps the lightness, so the pairings hold roughly, but WCAG contrast still moves with the hue and the gamut mapping: white on `danger` goes from 4.42:1 to 3.11:1, on `success` from 2.82:1 to 3.79:1. [#183](https://github.com/julien-deramond/bootstrap-test-playground/issues/183) covers the default palette's ratios.
- Bootstrap's CSS has no hard-coded color outside the scale but black and white (shadows, the dialog backdrop, the select caret, the styled button's gradient).

## Pages to check

- [Button](../../kitchen-sink/components-button.html), [Alert](../../kitchen-sink/components-alert.html) and [Badge](../../kitchen-sink/components-badge.html), for every theme
- [Password strength](../../kitchen-sink/forms-password-strength.html), [Range](../../kitchen-sink/forms-range.html) and [Checkbox](../../kitchen-sink/forms-checkbox.html), which read `primary` and the other themes directly
- [Dashboard](../../pages/dashboard.html) and [Marketing: Pricing](../../pages/marketing-pricing.html), on a full page

## Known gaps

None known.

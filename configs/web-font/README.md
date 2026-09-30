# web-font

Inter for text and JetBrains Mono for code, both variable fonts self-hosted in `public/fonts/`, with tabular numbers on the whole page. Use it to find what depends on the system font's metrics: line heights, control heights, icon and text alignment.

Category: typography

## What it stresses

- `--body-font-family` and `--font-mono`, set at runtime in `tokens.css`. Tokens only, so it also applies on top of the prebuilt dist (`?css=dist`).
- Line boxes: Bootstrap's line heights are unitless, so controls, buttons and badges keep their heights with Inter's taller metrics. A comparison of every element's box with `default` on every page found no clipping or overflow, only text that wraps differently because Inter is wider.
- `font-variant-numeric: tabular-nums` on `body`, in the `custom` layer: digits line up in tables, pagination, the datepicker and the OTP input.
- `@font-face` with `font-display: block` in `tokens.css`, Latin and Latin Extended only: other scripts fall back to the system fonts.

## Pages to check

- [Dashboard](../../pages/dashboard.html) and [Marketing: Pricing](../../pages/marketing-pricing.html), for tables and numbers
- [Button](../../kitchen-sink/components-button.html), [Form control](../../kitchen-sink/forms-form-control.html) and [Input group](../../kitchen-sink/forms-input-group.html), for text inside controls
- [Datepicker](../../kitchen-sink/forms-datepicker.html) and [OTP input](../../kitchen-sink/forms-otp-input.html), for tabular numbers

## Known gaps

None known.

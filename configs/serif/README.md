# serif

A serif body stack (`ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`): taller ascenders, a smaller x-height and another baseline than the sans-serif default. Use it to find what's aligned by eye for one font rather than by the line box.

## What it stresses

- `--body-font-family`, set at runtime in `tokens.css`. Tokens only, so it also applies on top of the prebuilt dist (`?css=dist`).
- Vertical alignment on the line box rather than on the glyphs: checks, radios and switches sit exactly where they do in `default` next to their labels (measured on the Checkbox, Radio and Switch pages). Icons in buttons, badges in headings, chips and floating labels are worth a look.
- A comparison of every element's box with `default` on every page found no clipping or overflow. Inline boxes follow the font's metrics (a pixel more or less) and text wraps differently.

## Pages to check

- [Checkbox](../../kitchen-sink/forms-checkbox.html), [Radio](../../kitchen-sink/forms-radio.html) and [Switch](../../kitchen-sink/forms-switch.html), for label alignment
- [Button](../../kitchen-sink/components-button.html) and [Badge](../../kitchen-sink/components-badge.html), for icons and text inside a box
- [Floating labels](../../kitchen-sink/forms-floating-labels.html)
- [Marketing: Product](../../pages/marketing-product.html), for long text

## Known gaps

None known.

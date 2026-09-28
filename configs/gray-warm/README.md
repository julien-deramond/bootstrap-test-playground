# gray-warm

`$gray: oklch(55% .03 60)`: a warm, brownish gray instead of the default blue-gray. Every neutral surface, text and border should turn warm; what stays blue-gray doesn't read the gray scale.

## What it stresses

- `$gray`, tinted and shaded into `--gray-025…975` by `$color-tints` and `$color-shades`.
- What reads the gray scale: `--bg-body` and `bg-1…4`, `--fg-body` and `fg-1…4`, `--border-color` and the border scale, the `secondary` and `inverse` themes, disabled and placeholder colors, table stripes, placeholders.
- A scan of every kitchen sink page and screen, in both modes, found no neutral left with the default hue. Shadows, the dialog backdrop and the select caret are black or white on purpose.

## Pages to check

- [Dashboard](../../pages/dashboard.html) and [Checkout](../../pages/checkout.html), on a full page
- [Form control](../../kitchen-sink/forms-form-control.html) and [Checkbox](../../kitchen-sink/forms-checkbox.html), for borders and disabled states
- [Card](../../kitchen-sink/components-card.html), [List group](../../kitchen-sink/components-list-group.html) and [Placeholder](../../kitchen-sink/components-placeholder.html), for `bg-1…4`
- [Button](../../kitchen-sink/components-button.html), for the `secondary` and `inverse` themes
- Compare with [`gray-cool`](../gray-cool/) side by side

## Known gaps

None known.

# brand

Two theme colors added, `brand` (teal) and `tertiary` (pink), and two removed with `null`, `info` and `secondary`. Use it to check that Bootstrap generates everything for a new theme and that nothing still points to a removed one.

## What it stresses

- Adding themes: `.theme-brand` and `.theme-tertiary`, their `--brand-*` and `--tertiary-*` root tokens, and the theme utilities (`.bg-brand`, `.fg-brand`, `.border-brand`, `.bg-subtle-brand`, `.shadow-brand`, `.underline-brand` and the rest). `brand` uses the `600` step for its `bg`, where Bootstrap's themes use `500`.
- Removing themes with `null`: no `.theme-info`, `.theme-secondary` or `--info-*` and `--secondary-*` token is left. `npm run audit-tokens` lists what still reads them (the known gap below).
- The kitchen sink's `.theme-info` and `.theme-secondary` examples lose their theme and fall back to the default look. That's expected.
- `primary` stays, so the toolbar's *Primary* menu still remaps it.

## Pages to check

- [Password strength](../../kitchen-sink/forms-password-strength.html) and [Radio](../../kitchen-sink/forms-radio.html), the known gap below
- [Button](../../kitchen-sink/components-button.html), [Alert](../../kitchen-sink/components-alert.html) and [Badge](../../kitchen-sink/components-badge.html), where the removed themes' examples lose their colors
- Add `class="theme-brand"` or `class="theme-tertiary"` to an example in the browser's devtools to see the new themes

## Known gaps

- [#182](https://github.com/julien-deramond/bootstrap-test-playground/issues/182): the strength meter's "good" level reads `--info-bg` and loses its color, and disabled radio labels read `--secondary-fg`.

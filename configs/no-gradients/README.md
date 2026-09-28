# no-gradients

`$enable-gradients: false`: range thumbs and active nav pills lose the `var(--gradient)` overlay they get by default. Use it to check that the option removes every gradient it controls, and nothing else.

Category: color

## What it stresses

- The `gradient-bg()` mixin: range thumbs and the active nav pill. Buttons and menu items only lose their `background-image: none` resets.
- Opt-in gradients stay: the `.bg-gradient` utility and `.btn-styled`.
- Functional gradients stay too: the range fill, progress bar stripes and the placeholder wave.

## Pages to check

- [Range](../../kitchen-sink/forms-range.html) and [Nav](../../kitchen-sink/components-nav.html)
- [Button](../../kitchen-sink/components-button.html), for `.btn-styled`

## Known gaps

None known.

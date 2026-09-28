# large-type

18px body text and a type scale one step larger, as for a large-type accessibility preference, with every other size left as it is. Use it to find what clips, overflows or misaligns because it was sized for 16px text.

## What it stresses

- `--body-font-size: 1.125rem` and `$font-sizes`: `xs` to `md` become 14px, 16px and 18px, and the fluid steps grow with them.
- Control heights: `--btn-input-*-min-height` are minimums, so buttons, inputs, selects and pagination grow together with their text (38px → 41px, 32px → 34px, 44px → 45px) and keep matching heights.
- What keeps its size on purpose: avatars size their initials from `--avatar-size`, chips are 28px (`--chip-height`), floating labels keep `--form-floating-height`. The floating label's box is 2px short of its text, which doesn't show.
- Controls next to their labels: checks, radios and switches are placed with a fixed margin, and move off-center (the known gap below).

## Pages to check

- [Checkbox](../../kitchen-sink/forms-checkbox.html), [Radio](../../kitchen-sink/forms-radio.html), [Switch](../../kitchen-sink/forms-switch.html) and [Datepicker](../../kitchen-sink/forms-datepicker.html), the known gaps below
- [Input group](../../kitchen-sink/forms-input-group.html), [Pagination](../../kitchen-sink/components-pagination.html) and [Floating labels](../../kitchen-sink/forms-floating-labels.html), for heights
- [Chips](../../kitchen-sink/forms-chips.html) and [Avatar](../../kitchen-sink/components-avatar.html), which keep their sizes
- [Checkout](../../pages/checkout.html), on a full page

## Known gaps

- [#185](https://github.com/julien-deramond/bootstrap-test-playground/issues/185): the datepicker's days, weekdays and header keep 12px and 16px.
- [#188](https://github.com/julien-deramond/bootstrap-test-playground/issues/188): checks, radios and switches sit 1.5px to 2px above the center of their label (the large size 1.5px below).

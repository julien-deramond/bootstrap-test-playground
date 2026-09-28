# no-rounded

`$enable-rounded: false`: components and form controls lose their `border-radius` declarations, so everything should be square. Use it to find what hard-codes a radius or skips the `border-radius()` mixin.

Category: shape

## What it stresses

- Every `border-radius()` mixin call: buttons, form controls, input groups, cards, alerts, badges, menus, dialogs, drawers, popovers, tooltips, list groups, pagination, progress, range, OTP slots, avatars, chips.
- The `--radius-*` tokens and `.rounded-*` utilities stay on purpose, like the component `--*-border-radius` tokens, which nothing reads any more (allowlisted in `known-tokens.mjs`).
- Radios, switches and spinners stay circles and pills on purpose: that's their shape, and a square radio reads as a checkbox.

## Pages to check

- [Datepicker](../../kitchen-sink/forms-datepicker.html) and [Checkbox](../../kitchen-sink/forms-checkbox.html), the known gaps below
- [Input group](../../kitchen-sink/forms-input-group.html), [Button group](../../kitchen-sink/components-button-group.html) and [OTP input](../../kitchen-sink/forms-otp-input.html), whose joined corners depend on the radius rules
- [Card](../../kitchen-sink/components-card.html) and [List group](../../kitchen-sink/components-list-group.html)

## Known gaps

- [#174](https://github.com/julien-deramond/bootstrap-test-playground/issues/174): the datepicker's day buttons keep `var(--radius-5)`.
- [#4](https://github.com/julien-deramond/bootstrap-test-playground/issues/4): the checkbox keeps its hard-coded `33%`.

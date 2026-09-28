# square

`$radius: 0` and `--radius-pill: 0`: every radius token is 0, so everything should be square. Unlike `no-rounded`, components keep their `border-radius` declarations, so use it to find radii that don't read the tokens.

## What it stresses

- The `$radii` scale: `$radius: 0` sets every `--radius-*` step to 0, and every component that reads one turns square: buttons, form controls, input groups, cards, alerts, badges, menus, dialogs, drawers, popovers, tooltips, list groups, pagination, the datepicker.
- `--radius-pill`, set to 0 in `tokens.css`: chips, the password strength meter and the `.rounded-pill` utilities. Sass can't set it ([#176](https://github.com/julien-deramond/bootstrap-test-playground/issues/176)).
- Radios, switches, spinners, avatars, chip images and stepper steps stay circles and pills on purpose: that's their shape.

## Pages to check

- [Nav](../../kitchen-sink/components-nav.html), [Range](../../kitchen-sink/forms-range.html) and [Checkbox](../../kitchen-sink/forms-checkbox.html), the known gaps below
- [Chips](../../kitchen-sink/forms-chips.html) and [Password strength](../../kitchen-sink/forms-password-strength.html), which read `--radius-pill`
- [Input group](../../kitchen-sink/forms-input-group.html), [Button group](../../kitchen-sink/components-button-group.html) and [Card](../../kitchen-sink/components-card.html)

## Known gaps

- [#176](https://github.com/julien-deramond/bootstrap-test-playground/issues/176): `$root-tokens: (--radius-pill: 0)` is overwritten, so `tokens.css` sets it at runtime.
- [#177](https://github.com/julien-deramond/bootstrap-test-playground/issues/177): nav pills keep `3rem` and ranges `1rem`.
- [#4](https://github.com/julien-deramond/bootstrap-test-playground/issues/4): the checkbox keeps its hard-coded `33%`.

# compact

A dense UI: `$spacer: .75rem`, .875rem body text and 30px controls (26px small, 36px large). Use it to find heights, paddings and icon sizes that ignore `$spacer` and the `--btn-input-*` tokens.

## What it stresses

- `$spacer`: every `--spacer-*` step, gutter, spacing utility and `$sizes` step shrinks by a quarter.
- The `--btn-input-*` tokens: buttons, form controls, selects, input groups, pagination, the combobox and form adorns should all be exactly 30px, 26px or 36px tall.
- `--body-font-size`: text, and what sizes itself in `em`.
- What doesn't scale, on purpose: component paddings (cards, dialogs, toasts, accordions), checks, radios, switches, avatars, badges and floating labels have their own tokens in `rem`, and nav links follow the spacers, not `--btn-input-*`.

## Pages to check

- [Chips](../../kitchen-sink/forms-chips.html), the known gap below
- [Form control](../../kitchen-sink/forms-form-control.html), [Input group](../../kitchen-sink/forms-input-group.html), [Button](../../kitchen-sink/components-button.html) and [Pagination](../../kitchen-sink/components-pagination.html)
- [Form adorn](../../kitchen-sink/forms-form-adorn.html), [Combobox](../../kitchen-sink/forms-combobox.html) and [Datepicker](../../kitchen-sink/forms-datepicker.html), whose icons and toggles sit inside the control
- [Dashboard](../../pages/dashboard.html) and [Checkout](../../pages/checkout.html), for density on a full page

## Known gaps

- [#178](https://github.com/julien-deramond/bootstrap-test-playground/issues/178): the chip input stays 54px tall with 28px chips.

# spacious

A roomy UI: `$spacer: 1.5rem`, 1.125rem body text, 3rem grid gutters and 48px controls (40px small, 56px large). Use it to find heights, paddings and icon sizes that ignore `$spacer` and the `--btn-input-*` tokens.

Category: layout

## What it stresses

- `$spacer`: every `--spacer-*` step, gutter, spacing utility and `$sizes` step grows by half.
- `$grid-gutter-x: 3rem`: rows and columns get twice the default gutter.
- The `--btn-input-*` tokens: buttons, form controls, selects, input groups, pagination, the combobox and form adorns should all be exactly 48px, 40px or 56px tall.
- `--body-font-size`: text, and what sizes itself in `em`. Checks, radios and switches stay 20px next to the larger labels.
- What doesn't scale, on purpose: component paddings (cards, dialogs, toasts, accordions), checks, radios, switches, avatars, badges and floating labels have their own tokens in `rem`, and nav links follow the spacers, not `--btn-input-*`.

## Pages to check

- [Chips](../../kitchen-sink/forms-chips.html), the known gap below
- [Form control](../../kitchen-sink/forms-form-control.html), [Input group](../../kitchen-sink/forms-input-group.html), [Button](../../kitchen-sink/components-button.html) and [Pagination](../../kitchen-sink/components-pagination.html)
- [Checkbox](../../kitchen-sink/forms-checkbox.html) and [Field](../../kitchen-sink/forms-field.html), where controls line up with larger labels
- [Marketing: product](../../pages/marketing-product.html) and [Dashboard](../../pages/dashboard.html), for the wider gutters on a full page

## Known gaps

- [#178](https://github.com/julien-deramond/bootstrap-test-playground/issues/178): the chip input stays 54px tall with 28px chips.

# no-shadows

`$enable-shadows: false`: components lose their `box-shadow` declarations, so nothing should cast a shadow but focus rings and opt-in utilities. Use it to find shadows that skip the `box-shadow()` mixin.

Category: options

## What it stresses

- Every `box-shadow()` mixin call: cards, menus, dialogs, drawers, popovers, form controls, range, progress, thumbnails, the buttons' active state and `.hover-lift`.
- Focus rings, the `.shadow-*` utilities and `.btn-styled` keep their shadows on purpose: they opt in, or they're not decoration.
- Box shadows that draw borders or backgrounds stay too: table cell backgrounds, the tabs' and the open accordion header's bottom border.
- The component `--*-box-shadow` tokens stay, and nothing reads them any more (allowlisted in `known-tokens.mjs`).

## Pages to check

- [Toasts](../../kitchen-sink/components-toasts.html), [Switch](../../kitchen-sink/forms-switch.html) and [Datepicker](../../kitchen-sink/forms-datepicker.html), the known gaps below
- [Menu](../../kitchen-sink/components-menu.html), [Dialog](../../kitchen-sink/components-dialog.html), [Drawer](../../kitchen-sink/components-drawer.html) and [Popover](../../kitchen-sink/components-popover.html)
- [Button](../../kitchen-sink/components-button.html), to compare `.btn-styled` with the other variants

## Known gaps

- [#173](https://github.com/julien-deramond/bootstrap-test-playground/issues/173): toasts, the datepicker popup and switches keep their shadows.

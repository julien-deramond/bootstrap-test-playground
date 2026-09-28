# root-62-5

`html { font-size: 62.5% }`, the classic 1rem = 10px trick, with every global `rem` value Bootstrap exposes scaled by 1.6 to get its default look back. What's still 62.5% too small sizes itself with its own `rem` value, and a site using the trick has to override it component by component.

Category: typography

## What it stresses

- The global knobs, all ×1.6: `--body-font-size`, `$font-sizes` (fluid steps included), `$spacer`, `$radius`, `$grid-gutter-x` and the `--btn-input-*` tokens. Text, spacing, radii, buttons, inputs, selects, pagination and the grid are back to their default sizes.
- What stays at 62.5%, found by comparing every element's box with `default` on every page. Each has its own `rem` tokens, so this is what the trick costs rather than a bug: checks, radios and switches, avatars and avatar stacks, spinners, progress bars and the password strength meter, close buttons, carousel controls and indicators, chip images and dismiss buttons, breadcrumb items, the stepper, the reboot's `legend`, the datepicker and floating labels.
- Floating labels break the most: the control keeps `--form-floating-height` (39.5px) while its text is back to 16px, so the label is clipped.
- `px` values don't move, so they're right: tooltips, popovers, toasts, dialogs, drawers and breakpoints.

## Pages to check

- [Floating labels](../../kitchen-sink/forms-floating-labels.html) and [Sign-in](../../pages/sign-in.html), where labels are clipped
- [Checkbox](../../kitchen-sink/forms-checkbox.html), [Switch](../../kitchen-sink/forms-switch.html), [Avatar](../../kitchen-sink/components-avatar.html) and [Progress](../../kitchen-sink/components-progress.html), for what stays small
- [Datepicker](../../kitchen-sink/forms-datepicker.html), whose calendar stays small, font sizes included ([#185](https://github.com/julien-deramond/bootstrap-test-playground/issues/185))
- [Button](../../kitchen-sink/components-button.html) and [Form control](../../kitchen-sink/forms-form-control.html), which the global tokens bring back

## Known gaps

- [#185](https://github.com/julien-deramond/bootstrap-test-playground/issues/185): the datepicker's font sizes can't be restored with a token.

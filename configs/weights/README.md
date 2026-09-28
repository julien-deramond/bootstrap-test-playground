# weights

A custom `$font-weights` map: `semibold` removed with `null`, `black` (900) added, and `medium` at 550, a weight only variable fonts have. Use it to find components that hard-code a weight, and what breaks when a weight they read is removed.

## What it stresses

- Adding a weight: `--font-weight-black` and `.fw-black` exist. The `.fw-*` utilities output the raw value, so the token isn't read by Bootstrap.
- Changing a weight: `medium: 550` reaches headings, avatars, the navbar brand and `.fw-medium`, but not what hard-codes `500` or `600` (the first known gap). A font without variable weights rounds 550 to 500 or 600.
- Removing a weight: `.fw-semibold` is gone, and what reads `--font-weight-semibold` falls back to the inherited weight. `npm run audit-tokens` lists it (the second known gap).

## Pages to check

- [Badge](../../kitchen-sink/components-badge.html), [Alert](../../kitchen-sink/components-alert.html) (links) and [Menu](../../kitchen-sink/components-menu.html) (selected items), which read `semibold`
- [Stepper](../../kitchen-sink/components-stepper.html), [Datepicker](../../kitchen-sink/forms-datepicker.html) and [OTP input](../../kitchen-sink/forms-otp-input.html), which hard-code their weights

## Known gaps

- [#186](https://github.com/julien-deramond/bootstrap-test-playground/issues/186): the stepper, datepicker, OTP input and prose hard-code `400`, `500` and `600`.
- [#187](https://github.com/julien-deramond/bootstrap-test-playground/issues/187): badges, alert links, selected menu items and stacked table labels read `--font-weight-semibold` without a fallback.

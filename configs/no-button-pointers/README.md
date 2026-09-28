# no-button-pointers

`$enable-button-pointers: false`: buttons keep the default arrow cursor instead of `cursor: pointer`. Nothing changes in screenshots; hover buttons to check it.

Category: options

## What it stresses

- Reboot's `cursor: pointer` on `button` and `[type=button|reset|submit]`, and the one on `.btn`. Close buttons are `<button>`s, so they lose it too.
- Controls that set `cursor: pointer` themselves keep it on purpose: menu items, chips, accordion headers, carousel indicators, `summary`, range and the datepicker's buttons.

## Pages to check

- [Button](../../kitchen-sink/components-button.html) and [Close button](../../kitchen-sink/components-close-button.html)
- [Menu](../../kitchen-sink/components-menu.html) and [Accordion](../../kitchen-sink/components-accordion.html), which keep the pointer

## Known gaps

None known.

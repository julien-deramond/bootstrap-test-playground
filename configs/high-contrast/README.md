# high-contrast

Toward WCAG AAA, as accessibility teams customize Bootstrap: black and white body text, every text token at 7:1 or more, 2px borders at 3:1, a 4px focus ring in the text color with a 2px offset, darker theme fills, solid disabled controls and no translucent borders. All 152 token pairings it sets reach AAA in both modes, against 75 below AAA with the defaults. What still falls short is hard-coded in Bootstrap.

## What it stresses

- **The global tokens and theme maps:**
  - `$border-width`, and `$root-tokens` for the border, link, code, focus ring and disabled tokens.
  - `$theme-bgs`, `$theme-fgs` and `$theme-borders`.
  - `$theme-colors`, with every sub-map written out. Solid fills use the `700` or `800` step with white text, or the `400` step with black text for `warning` and `info`.
- **Measured pairings.** For each theme, in light and dark:
  - Text at 7:1: `fg-body` to `fg-4` on `bg-body` to `bg-3`, the link and code colors, `contrast` on `bg`, `fg` on `bg-body`, and `fg-emphasis` on `bg-subtle` and `bg-muted`.
  - Borders and focus rings at 3:1 on `bg-body`.
  - Colors are resolved in the browser and gamut-mapped to sRGB.
- **Component tokens the global ones don't reach:** the button's disabled opacity, the close button's opacities, the chip's dismiss button, the tooltip's opacity, the floating label's mix and the dark navbar's colors.
- **What the config can't reach:**
  - Hard-coded translucent text: menu item descriptions and the combobox placeholder at 65% of `currentcolor`, and the datepicker's days outside the month at `opacity: .5`. The two 65% cases only reach 7:1 because the body text is pure black. The days fall below even AA's 4.5:1: 4.00:1 in light mode (3.37:1 with the defaults).
  - Disabled switches, chips and the combobox toggle, which hard-code `opacity: .65` (`.4` for an unchecked switch) instead of reading `--control-disabled-opacity`.
  - Decorative translucency, which contrast rules don't cover: the switch's shadows, the striped progress bar, the button group divider (`opacity: .25`), and the underlines of `.icon-link` and prose links.
- **Left alone on purpose:** the opt-in translucent variants (`.card-translucent`, `.menu-translucent`, `.drawer-translucent`, `.navbar-translucent`), the opacity utilities (`.opacity-50`, `.fg-50` and the like), and backdrops.

## Pages to check

- [Kitchen sink: Button](../../kitchen-sink/components-button.html?config=high-contrast), every variant and the disabled ones
- [Checkout](../../pages/checkout.html?config=high-contrast), for borders and the focus ring (tab through the fields)
- [Kitchen sink: Menu](../../kitchen-sink/components-menu.html?config=high-contrast), [Combobox](../../kitchen-sink/forms-combobox.html?config=high-contrast) and [Datepicker](../../kitchen-sink/forms-datepicker.html?config=high-contrast), for the translucent text
- [Kitchen sink: Switch](../../kitchen-sink/forms-switch.html?config=high-contrast) and [Chips](../../kitchen-sink/forms-chips.html?config=high-contrast), for the disabled opacity

## Known gaps

- Menu item descriptions, the combobox placeholder and datepicker days outside the month hard-code translucent text: [#208](https://github.com/julien-deramond/bootstrap-test-playground/issues/208).
- Disabled switches, chips and the combobox toggle ignore `--control-disabled-opacity`: [#209](https://github.com/julien-deramond/bootstrap-test-playground/issues/209).
- `--form-floating-label-opacity: .65` isn't a valid `color-mix()` percentage, so floating labels ignore it (this config sets `100%`): [#210](https://github.com/julien-deramond/bootstrap-test-playground/issues/210).
- The default palette's contrast, which this config replaces: [#183](https://github.com/julien-deramond/bootstrap-test-playground/issues/183).

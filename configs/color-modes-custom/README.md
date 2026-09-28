# color-modes-custom

Three custom color modes in `tokens.css`, next to light and dark: `blue`, the docs' example copied as is, `sepia`, a light mode on warm paper, and `dim`, a low-contrast dark mode. The toolbar offers them next to *Auto*, *Light* and *Dark* while this config is on, and `?theme=sepia` works on any page. [`pages/color-modes.html`](../../pages/color-modes.html) checks that each one sets `color-scheme` and reaches every overlay.

## What it stresses

- `color-scheme`. `sepia` and `dim` set it, so the `light-dark()` tokens they don't override, like theme colors, resolve to their light or dark value whatever the system prefers. `blue` doesn't, as in the docs: on a dark system, its cards and form controls turn dark on the blue page.
- A dark mode that isn't `dark`: `dim` also has to raise `--shadow-strength`, which `light-dark()` can't switch, and anything keyed to `[data-bs-theme="dark"]` misses it, like the select caret.
- Overlays: menus, tooltips, popovers, dialogs, drawers and toasts inherit the mode from `<html>`. The datepicker's calendar sets its own `color-scheme` and only follows a `data-bs-theme` that was there when it initialized.
- The docs' token names: `blue` sets `--bs-btn-focus-border-color` and `--bs-btn-focus-box-shadow`, which nothing reads (`npm run audit-tokens`).
- Tokens only: it also applies on top of the prebuilt dist (`?css=dist`).

## Pages to check

- [Color modes](../../pages/color-modes.html?config=color-modes-custom), with a pass or fail marker per mode and overlay
- [Kitchen sink: Cards](../../kitchen-sink/components-card.html?config=color-modes-custom&theme=blue), with the system in dark mode
- [Kitchen sink: Form control](../../kitchen-sink/forms-form-control.html?config=color-modes-custom&theme=dim) and [Datepicker](../../kitchen-sink/forms-datepicker.html?config=color-modes-custom&theme=dim)

## Known gaps

- The docs' `blue` mode doesn't set `color-scheme`, and sets two button tokens that nothing reads: [#202](https://github.com/julien-deramond/bootstrap-test-playground/issues/202).
- The datepicker's calendar keeps `color-scheme: light dark` when the mode is set after it initialized, as the toolbar does: [#181](https://github.com/julien-deramond/bootstrap-test-playground/issues/181).
- The select caret stays dark in `dim`, since only `[data-bs-theme="dark"]` switches it: [#180](https://github.com/julien-deramond/bootstrap-test-playground/issues/180).

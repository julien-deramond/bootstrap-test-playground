# dark-first

Dark by default: without `data-bs-theme`, the page is `color-scheme: dark` whatever the OS prefers, and `data-bs-theme="light"` is the way back to light. Use it with the OS in light mode to find what follows the OS or the `data-bs-theme` attribute instead of the page's color scheme.

## What it stresses

- Every `light-dark()` pair, which should pick its dark side on the whole page with the toolbar on **Auto**.
- `--shadow-strength`, which can't use `light-dark()`: Bootstrap sets it in a `prefers-color-scheme` query, so `tokens.css` sets its dark value too.
- What's keyed on `[data-bs-theme="dark"]` or on the OS preference: the select caret and the datepicker, the known gaps below. The opt-in `dark:` utility variants also follow the OS preference; [#34](https://github.com/julien-deramond/bootstrap-test-playground/issues/34) covers them.
- Tokens only, so it also applies on top of the prebuilt dist (`?css=dist`).

## Pages to check

Set the OS (or the browser's emulated `prefers-color-scheme`) to **light** and the toolbar to **Auto**.

- [Form control](../../kitchen-sink/forms-form-control.html) and [Datepicker](../../kitchen-sink/forms-datepicker.html), the known gaps below
- [Dialog](../../kitchen-sink/components-dialog.html), [Menu](../../kitchen-sink/components-menu.html) and [Toasts](../../kitchen-sink/components-toasts.html), for shadows
- [Dashboard](../../pages/dashboard.html) and [Checkout](../../pages/checkout.html), on a full page

## Known gaps

- [#180](https://github.com/julien-deramond/bootstrap-test-playground/issues/180): the select caret stays black, as it's only switched under `[data-bs-theme="dark"]`.
- [#181](https://github.com/julien-deramond/bootstrap-test-playground/issues/181): the datepicker's calendar is white: its own `color-scheme: light dark` follows the OS.

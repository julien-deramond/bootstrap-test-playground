# utilities-custom

Every option of the utility API: new utilities with `state`, `child-selector`, `variables` and a property map, default ones made `responsive`, `print` and `dark:`, `float` disabled with `enabled: false` and `object-fit` removed with `null`. Changing a default utility means reading its definition, so `main.scss` merges into `$utilities` before it loads Bootstrap instead of passing it through `with (...)`. [`pages/utility-api.html`](../../pages/utility-api.html) always uses this config and checks each utility.

## What it stresses

- The two ways of merging from the docs. It modifies the defaults with `map.merge()` after loading `bootstrap/scss/config` and `bootstrap/scss/utilities`, all in one file, so no extra partial is needed.
- `state: hover focus` (`.hover:cursor-grab`, `.focus:cursor-not-allowed`), `responsive` and `print` on `opacity` (`.md:opacity-75`, `.print:opacity-50`), and `dark` on `bg-color` (`.dark:bg-primary`).
- `child-selector` (`.striped`, odd children, zero specificity), `variables` as a list (`.text-shadow-*` sets `--text-shadow`) and as a map (`.ring-*` sets `--ring-width: 3px`).
- `enabled: false` and `null`: `.float-*` and `.object-fit-*` are gone. No playground page uses them outside the Utility API page.
- A utility that sets global tokens, `.radius-sm` and `.radius-lg` on `--radius-5` and `--radius-7`. The utility API registers them as non-inheriting, so buttons and cards lose their radius on every page that uses this config.
- No utility uses `!important`, since `important` stays off by default.

## Pages to check

- [Utility API](../../pages/utility-api.html), with a pass or fail marker per utility
- [Kitchen sink: Card](../../kitchen-sink/components-card.html) and [Buttons](../../kitchen-sink/components-button.html), where the radii disappear

## Known gaps

- `dark:` variants follow the system preference only. They ignore `data-bs-theme`, so a page or subtree forced into the other mode gets the wrong variant: [#193](https://github.com/julien-deramond/bootstrap-test-playground/issues/193).
- The utility API registers `--radius-5` and `--radius-7` with `inherits: false`, so they stop inheriting from `:root` everywhere, and `.radius-lg` doesn't reach its subtree: [#194](https://github.com/julien-deramond/bootstrap-test-playground/issues/194).

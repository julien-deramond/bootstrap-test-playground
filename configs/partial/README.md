# partial

The Sass docs' "Option B: Include parts of Bootstrap", as written, plus the menu: `root`, then `content`, `layout`, `forms`, `buttons`, `alert`, `card`, `menu`, `helpers` and `utilities/api`. Every other component is left out, so most pages show it unstyled. That's expected. `npm run audit-partials` compiles every partial alone after `root` and maps what each one needs from the others.

Category: sass

## What it stresses

- **Option B as the docs write it.** It compiles, but `forms` reads the tooltip's tokens for validation tooltips and the range's value bubble, which reuse the `.tooltip` markup, and the example leaves `tooltip` out.
- **The dependency map**, from `npm run audit-partials`. Beyond tokens no partial defines, what a partial reads without a fallback from another one:

  | Partial | Needs | Why |
  | --- | --- | --- |
  | `forms` (`forms/validation`, `forms/form-range`) | `tooltip` | Validation tooltips and the range bubble are `.tooltip` elements |
  | `card` | `nav` | `.card-header-tabs` is a nav |
  | `buttons`, `badge`, `utilities/api` | `helpers` (`helpers/theme-colors`) | Theme colors come from a `.theme-*` class |
  | `buttons/button-group` | `buttons/button` | Loaded together by `buttons` |
  | `forms/combobox`, `forms/floating-labels` | `forms/form-control` | Loaded together by `forms` |

  Every partial compiles alone after `root`.
- **`with (…)` on the entry points,** which the same script checks: `config` and `theme` before `root`, `root` with `$root-tokens`, a component with its token map, `buttons` with `$button-tokens`, `utilities` before `utilities/api`. All six reach the CSS. Configuring `config` after `root`, or passing a config option to `root`, fails, as Sass modules do.
- **The global tokens** of the left-out components stay in `:root` (`--z-dialog`, `--z-tooltip`, `--box-shadow-xl`…), since `root` defines them all.

## Pages to check

- [Kitchen sink: Validation](../../kitchen-sink/forms-validation.html?config=partial), whose tooltips lose the tooltip styles
- [Kitchen sink: Range](../../kitchen-sink/forms-range.html?config=partial), with its value bubble
- [Kitchen sink: Buttons](../../kitchen-sink/components-button.html?config=partial) and [Cards](../../kitchen-sink/components-card.html?config=partial), which stay styled

## Known gaps

- The docs' Option B leaves `tooltip` out, which `forms` needs, and doesn't document the dependencies between partials: [#216](https://github.com/julien-deramond/bootstrap-test-playground/issues/216).

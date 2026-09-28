# spacers-extended

Spacers up to 20 (8rem) and negative spacers down to -12 (-3rem), merged over the defaults. Use it to check that new keys reach every utility and token built from the scale.

## What it stresses

- `$spacers` 13 to 20: `m-*`, `p-*`, `gap-*`, the grid's `.g-*`, `.gx-*` and `.gy-*` gutters (`$gutters` defaults to `$spacers`), their responsive variants, and the `--spacer-13` to `--spacer-20` tokens.
- `$negative-spacers` -3 to -12: only `ms-*` and `me-*` read them (`.ms--12`, `.me--3`), as the margin docs say. They get no tokens, like the defaults.
- There's no `$enable-negative-margins`: the docs still list it, but `_config.scss` doesn't declare it, and the negative margins are always generated ([#130](https://github.com/julien-deramond/bootstrap-test-playground/issues/130)).
- Nothing changes on the pages, since they don't use the new keys: the CSS is where to look.

## Pages to check

- [Dashboard screen](../../screens/dashboard.html), which uses negative margins
- [Checkout](../../pages/checkout.html), with gutters from the scale

## Known gaps

None known.

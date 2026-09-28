# reboot-only

`scss/bootstrap-reboot.scss` alone, the entry point behind `dist/css/bootstrap-reboot.css`: root (every global token, the color modes and the layer order) and the reboot, with no layout, components, helpers or utilities. `with (…)` passes `$root-tokens` and `$reboot-mark-tokens`. Most pages look unstyled with it; that's expected. `pages/reboot-only.html` always uses this config.

Category: sass

## What it stresses

- **`with (…)` on the entry point.** It forwards `root` and `content/reboot`, so it takes `$root-tokens` and the reboot's token maps (`$type-tokens`, `$reboot-kbd-tokens`, `$reboot-mark-tokens`). Options such as `$enable-smooth-scroll` go on `config`, loaded first.
- **The reboot on its own**: native elements, forms and tables, the color modes through `data-bs-theme`, and the `reboot` cascade layer.
- **Root without the components.** Every global token is defined and most aren't read, which `known-tokens.mjs` allows for this config. The hooks that the `.theme-*` helpers and the shadow utilities set (`--theme-fg`, `--sc`…) fall back to their defaults.

## Pages to check

- [Entry points: reboot](../../pages/reboot-only.html), which checks each point above and shows every native element
- [Forms: checkout](../../pages/checkout.html?config=reboot-only), whose native form elements keep the reboot's styles

## Known gaps

None known.

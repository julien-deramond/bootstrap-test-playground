# utilities-only

`scss/bootstrap-utilities.scss` alone, the entry point behind `dist/css/bootstrap-utilities.css`: root (every global token, the color modes and the layer order), the helpers and the utilities, with no reboot, layout or components. `with (…)` passes `$root-tokens` and a new `cursor` utility. Most pages look unstyled with it; that's expected. `pages/utilities-only.html` always uses this config.

Category: sass

## What it stresses

- **`with (…)` on the entry point.** It forwards `root` and `utilities`, so it takes `$root-tokens` and `$utilities`, like `bootstrap/scss/bootstrap`: new groups are added, and a group with an existing key replaces it.
- **Every token the utilities read is defined**, since the entry point loads `root`. The utility API docs' *utility-only build*, `utilities` then `utilities/api`, leaves `root` out and reads 129 tokens nothing defines ([#237](https://github.com/julien-deramond/bootstrap-test-playground/issues/237)).
- **The helpers without the components**: `.theme-*`, `.visually-hidden`, ratios, in the `helpers` layer before `utilities`.

## Pages to check

- [Entry points: utilities](../../pages/utilities-only.html), which checks each point above
- [Utilities: utility API](../../pages/utility-api.html), whose config loads the whole of Bootstrap, to compare

## Known gaps

None known.

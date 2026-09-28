# grid-only

`scss/bootstrap-grid.scss` alone, the entry point behind `dist/css/bootstrap-grid.css`: containers, the grid and the layout utilities, with no root tokens and no reboot. `$grid-gutter-x: 2rem` is set on `config`, and `with ($utilities: …)` removes the padding utilities. Most pages look unstyled with it; that's expected. `pages/grid-only.html` always uses this config.

Category: sass

## What it stresses

- **The grid without the reboot.** Nothing sets `box-sizing: border-box`, and the grid build lost the `box-sizing` it had on columns in v5, so columns with gutters wrap ([#238](https://github.com/julien-deramond/bootstrap-test-playground/issues/238)).
- **`with (…)` on the entry point.** It only forwards `utilities`, so it takes `$utilities`: a listed group can be changed or removed (`null`), but a new group is dropped, since the entry point keeps only the groups it lists. Grid options such as `$grid-gutter-x`, `$grid-columns` or `$breakpoints` go on `config`, loaded first.
- **The list of utilities it keeps.** It still names the `negative-margin*` groups v6 removed (`.ms--1` comes from `margin-start` now), and leaves out `justify-self` ([#236](https://github.com/julien-deramond/bootstrap-test-playground/issues/236)).
- **No global tokens.** The grid reads only its own tokens (`--gutter-x`, `--columns`…), and defines `--breakpoint-*` on `:root` for Bootstrap's JavaScript. `npm run audit-tokens` finds nothing undefined.

## Pages to check

- [Entry points: grid](../../pages/grid-only.html), which checks each point above
- [Kitchen sink: Forms layout](../../kitchen-sink/forms-layout.html?config=grid-only), whose `.row` examples wrap for the same reason

## Known gaps

- Columns aren't `border-box` without the reboot, so they wrap: [#238](https://github.com/julien-deramond/bootstrap-test-playground/issues/238).
- The grid build leaves out `.justify-self-*`: [#236](https://github.com/julien-deramond/bootstrap-test-playground/issues/236).

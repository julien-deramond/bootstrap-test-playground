# shadcn

shadcn/ui's default look (new-york style, neutral base color): near-black primary, neutral grays, .625rem radius, Geist, 36px controls, flat buttons and outer focus rings. Use it with the screens ported from shadcn/ui to compare them with the originals.

Category: themes

Everything is Bootstrap configuration in `main.scss` (`$theme-colors`, `$theme-bgs`, `$theme-fgs`, `$theme-borders`, `$root-tokens` and component `$*-tokens`), with shadcn/ui's variable names in the comments. `_custom.scss` only holds what tokens can't express: focus ring placement, button shadows and hover colors. Geist loads from Google Fonts in `tokens.css`.

## What it stresses

- A full re-theme in Sass: a near-black `primary`, neutral grays (`$gray`), and `$theme-colors`, `$theme-bgs`, `$theme-fgs` and `$theme-borders` rewritten
- `$radius: .625rem`, and `$root-tokens` for the Geist font stacks and the 36px controls of the `--btn-input-*` tokens
- Component token maps for buttons, form controls, checks, radios, switches, cards, badges, menus, popovers, tooltips and dialogs
- The `custom` layer for what tokens can't express (see below)

## Pages to check

- [Real screens](../../screens/): [Dashboard](../../screens/dashboard.html), [Tasks](../../screens/tasks.html), [Cards](../../screens/cards.html), [Playground](../../screens/playground.html) and [Authentication](../../screens/authentication.html), next to the shadcn/ui originals credited in their toolbar
- [Buttons](../../kitchen-sink/components-button.html), [Checkbox](../../kitchen-sink/forms-checkbox.html) and [Form control](../../kitchen-sink/forms-form-control.html)

## Known gaps

- [#4](https://github.com/julien-deramond/bootstrap-test-playground/issues/4): the checkbox ignores `--check-border-radius`, so `_custom.scss` sets its radius again.
- No token places the focus ring outside the border: `_custom.scss` sets `--focus-ring-offset: 0` on buttons, checks, radios and form controls.
- No token adds a shadow to solid and outline buttons, or makes a hover lighten rather than darken.

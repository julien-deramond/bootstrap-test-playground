# shadcn

shadcn/ui's default look (new-york style, neutral base color): near-black primary, neutral grays, .625rem radius, Geist, 36px controls, flat buttons and outer focus rings. Use it with the screens ported from shadcn/ui to compare them with the originals.

Everything is Bootstrap configuration in `main.scss` (`$theme-colors`, `$theme-bgs`, `$theme-fgs`, `$theme-borders`, `$root-tokens` and component `$*-tokens`), with shadcn/ui's variable names in the comments. `_custom.scss` only holds what tokens can't express: focus ring placement, button shadows and hover colors. Geist loads from Google Fonts in `tokens.css`.

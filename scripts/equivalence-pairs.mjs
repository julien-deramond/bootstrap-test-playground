// The customizations `npm run check-equivalence` makes twice: at compile time,
// through `@use "bootstrap/scss/bootstrap" with (…)`, and at runtime, in
// tokens.css. Bootstrap's Sass docs ("Token defaults") present the two paths as
// interchangeable, so each pair is what someone moving from one path to the
// other would write: the Sass variable or map that generates a token, and the
// same token overridden in CSS.
//
// - `sass`: the body of `with (…)`.
// - `tokens`: a tokens.css, unprefixed like configs/*/tokens.css. Global tokens
//   stay unlayered on `:root`, component tokens go in `@layer custom` on the
//   selectors Bootstrap declares them on (see docs/customizing.md).
// - `pages`: optional, the kitchen sink pages to render, as a filter on their
//   URL. Every page by default.
//
// A pair whose two paths render differently needs an entry in
// scripts/known-equivalence.mjs.
export default [
  {
    name: 'radius',
    description: 'One step of the radius scale, through `$radii`',
    sass: '$radii: (5: .25rem)',
    tokens: ':root { --radius-5: .25rem; }'
  },
  {
    name: 'radius-root-tokens',
    description: 'The same step, through `$root-tokens`',
    sass: '$root-tokens: (--radius-5: .25rem)',
    tokens: ':root { --radius-5: .25rem; }'
  },
  {
    name: 'spacer',
    description: 'The base spacer, which the spacing scale derives from',
    sass: '$spacer: .75rem',
    tokens: ':root { --spacer: .75rem; }'
  },
  {
    name: 'spacers',
    description: 'One step of the spacing scale, through `$spacers`',
    sass: '$spacers: (3: .75rem)',
    tokens: ':root { --spacer-3: .75rem; }'
  },
  {
    name: 'btn-input-padding',
    description: 'The paddings shared by buttons and form controls',
    sass: '$root-tokens: (--btn-input-padding-x: 1.25rem, --btn-input-padding-y: .5rem)',
    tokens: ':root { --btn-input-padding-x: 1.25rem; --btn-input-padding-y: .5rem; }'
  },
  {
    name: 'button-padding',
    description: 'The button paddings, through `$button-tokens`',
    sass: '$button-tokens: (--btn-padding-x: 1.25rem, --btn-padding-y: .5rem)',
    // The selectors `$button-tokens` is emitted on: variant buttons like
    // `.btn-solid` don't carry `.btn`.
    tokens: '@layer custom { .btn, .btn-link, .btn-icon, .btn-solid, .btn-outline, .btn-subtle, .btn-text { --btn-padding-x: 1.25rem; --btn-padding-y: .5rem; } }'
  },
  {
    name: 'alert-padding',
    description: 'The alert paddings, through `$alert-tokens`',
    sass: '$alert-tokens: (--alert-padding-x: 2rem, --alert-padding-y: 1.5rem)',
    tokens: '@layer custom { .alert { --alert-padding-x: 2rem; --alert-padding-y: 1.5rem; } }',
    pages: 'components-alert'
  },
  {
    name: 'theme-color-subkey',
    description: 'One sub-key of a theme color, `primary`’s `bg`, through `$theme-colors`',
    // The merge is one level deep, so the whole sub-map is passed, as the docs
    // say: only "bg" differs from Bootstrap's own `primary` in scss/_theme.scss.
    sass: `$theme-colors: (
      "primary": (
        "base": var(--blue-500),
        "fg": light-dark(var(--blue-600), var(--blue-400)),
        "fg-emphasis": light-dark(var(--blue-800), var(--blue-200)),
        "bg": var(--teal-600),
        "bg-subtle": light-dark(var(--blue-100), var(--blue-900)),
        "bg-muted": light-dark(var(--blue-200), var(--blue-800)),
        "border": light-dark(var(--blue-300), var(--blue-600)),
        "focus-ring": light-dark(color-mix(in oklch, var(--blue-500) 50%, var(--bg-body)), color-mix(in oklch, var(--blue-500) 75%, var(--bg-body))),
        "contrast": var(--white)
      )
    )`,
    tokens: ':root { --primary-bg: var(--teal-600); }'
  },
  {
    name: 'theme-color-subkey-root-tokens',
    description: 'The same sub-key, through `$root-tokens`',
    sass: '$root-tokens: (--primary-bg: var(--teal-600))',
    tokens: ':root { --primary-bg: var(--teal-600); }'
  },
  {
    name: 'border-width',
    description: 'The global border width',
    sass: '$border-width: 2px',
    tokens: ':root { --border-width: 2px; }'
  }
]

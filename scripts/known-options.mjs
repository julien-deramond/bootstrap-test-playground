// Options that scripts/compile-matrix.mjs finds have no effect on the CSS,
// with their tracking issue (an upstream bug) or the reason it's intended.
// Options are named like the matrix does, without `$enable-`.
//
// When an upstream fix lands, remove its entry: the matrix fails on an entry
// that no longer matches (see "Upstream issue tracking" in CLAUDE.md).
export default [
  { option: 'deprecation-messages', reason: 'only silences Sass deprecation warnings, and the default build uses nothing deprecated' },
  { option: 'color-mode-type', reason: 'only changes the output of the color-mode() mixin, which Bootstrap’s own CSS doesn’t use since light-dark() handles dark mode' }
]

// Pairs of scripts/equivalence-pairs.mjs whose Sass and tokens.css sides
// render differently, as `npm run check-equivalence` finds them: tracked as an
// upstream bug (`issue`, a tracking issue in this repository) or intended
// (`reason`). configs/README.md sums them up for whoever writes a config.
//
// When an upstream fix lands, remove its entry: the check fails on an entry
// whose pair no longer diverges (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // The utilities and gutters write the values of $spacers and $radii.
  { pair: 'radius', issue: 332 },
  { pair: 'spacers', issue: 332 },

  // --spacer-* are computed from $spacer, not from --spacer.
  { pair: 'spacer', issue: 333 },

  // The generation loops of _root.scss overwrite what $root-tokens sets.
  { pair: 'radius-root-tokens', issue: 334 },
  { pair: 'theme-color-subkey-root-tokens', issue: 334 },

  { pair: 'button-padding', reason: 'a runtime override on the base classes, in `@layer custom`, also replaces what the size modifiers (`.btn-sm`) set in the components layer, while `$button-tokens` only changes the default' }
]

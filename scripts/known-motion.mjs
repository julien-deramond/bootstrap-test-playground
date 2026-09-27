// Findings of scripts/audit-motion.mjs that are known: tracked as an upstream
// bug (`issue`, a tracking issue in this repository) or intended (`reason`).
// Each entry matches one static kind and findings whose selector contains
// `selector` (or matches it, for a RegExp). `runtime` matches what the
// `--render` run sees, like `animation spinner-border on span.spinner-border`.
//
// When an upstream fix lands, remove its entries: the audit fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  // Moves whatever the reader's setting

  { kind: 'uncovered', selector: '.otp-slot-active', runtime: /^animation otp-caret-blink /, issue: 144 },
  { kind: 'uncovered', selector: '.spinner-rotate', runtime: /^animation spinner-border on \S*\.spinner-rotate/, issue: 145 },

  // Slowed, not stopped

  {
    kind: 'slowed',
    selector: '.spinner-grow, .spinner-border',
    runtime: /^animation spinner-(border|grow) on \S*\.spinner-(border|grow)/,
    reason: 'a spinner is the loading indicator: reduced motion slows it to 1.5s rather than hiding the state'
  },

  // Left by $enable-reduced-motion: false

  { kind: 'query', selector: /^\.accordion-item$|^\.collapse$|^\.carousel-/, issue: 146 }
]

// Fixed when Bootstrap's stylesheet has `@media (forced-colors…)` rules: the
// issue asks for a few, so that states drawn with a background stay visible.
// Forced colors are emulated to report what they do to a checked checkbox.
export const environment = { forcedColors: 'active' }

function forcedColorsRules() {
  let count = 0
  const walk = rules => {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule && /forced-colors/.test(rule.conditionText)) {
        count++
      }

      if (rule.cssRules) {
        walk(rule.cssRules)
      }
    }
  }

  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules)
    } catch {
      // A stylesheet from another origin: not Bootstrap's.
    }
  }

  return count
}

export async function assert() {
  const count = forcedColorsRules()
  const active = window.matchMedia('(forced-colors: active)').matches
  const on = getComputedStyle(document.getElementById('forcedCheckOn'))
  const off = getComputedStyle(document.getElementById('forcedCheckOff'))
  const differ = ['backgroundImage', 'backgroundColor', 'outlineStyle', 'borderStyle', 'boxShadow', 'forcedColorAdjust'].filter(property => on[property] !== off[property])
  return {
    pass: count > 0,
    details: `${count} @media (forced-colors) rule(s) in the stylesheets; forced colors ${active ? 'active' : 'off'}, checked and unchecked differ in ${differ.join(', ') || 'nothing'}`
  }
}

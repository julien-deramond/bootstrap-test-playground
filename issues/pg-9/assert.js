// Fixed when the range track no longer reads a token nobody declares: either
// `--bs-range-track-box-shadow` resolves to a value on the range (the shadow is
// restored in `$range-tokens`), or no stylesheet rule reads it any more (the
// `box-shadow()` call is removed from the track).
const reads = (rules, name) => [...rules].some(rule =>
  (rule.style ? rule.style.cssText.includes(`var(${name}`) : false) ||
  (rule.cssRules ? reads(rule.cssRules, name) : false))

export async function assert() {
  const range = getComputedStyle(document.querySelector('[data-playground-repro] .form-range-input'))
  const name = '--bs-range-track-box-shadow'
  const shadow = range.getPropertyValue(name).trim()
  const stillRead = [...document.styleSheets].some(sheet => reads(sheet.cssRules, name))
  return {
    pass: Boolean(shadow) || !stillRead,
    details: `${name}: ${shadow || '(undefined)'}, still read by a rule: ${stillRead ? 'yes' : 'no'}`
  }
}

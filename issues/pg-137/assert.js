// Fixed when, for each marker, the RTL position is the mirror image of the LTR
// one: the distance from the marker's center to the box's inline-start edge is
// the same in both directions (within 1px).
//
// LTR reference: the first `[dir="ltr"]` block of this page, with the same
// styles. In RTL the inline-start edge is the right edge of the box.
const markers = ['start-100', 'start-0-x', 'end-0-x']

const offsetFromStart = (scope, name, rtl) => {
  const box = scope.querySelector('[data-box]').getBoundingClientRect()
  const rect = scope.querySelector(`[data-marker="${name}"]`).getBoundingClientRect()
  const center = rect.left + (rect.width / 2)
  return rtl ? box.right - center : center - box.left
}

export function assert() {
  const ltr = document.querySelector('[dir="ltr"]:has([data-box])')
  const rtl = document.querySelector('[dir="rtl"]:has([data-box])')
  if (!ltr || !rtl) {return { pass: null, details: 'LTR or RTL block not found' }}

  const results = markers.map(name => {
    const expected = offsetFromStart(ltr, name, false)
    const actual = offsetFromStart(rtl, name, true)
    return {
      name, expected, actual, diff: actual - expected
    }
  })
  return {
    pass: results.every(({ diff }) => Math.abs(diff) <= 1),
    details: results.map(({ name, expected, actual, diff }) => `${name}: ${actual.toFixed(1)}px from the start edge in RTL, ${expected.toFixed(1)}px in LTR (off by ${diff.toFixed(1)}px)`).join('; ')
  }
}

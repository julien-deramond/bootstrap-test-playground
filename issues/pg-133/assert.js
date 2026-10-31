// Fixed when, in RTL, the filled part of the track ends at the thumb and the
// value bubble is centered on it. The thumb sits `fill` of the way from the
// right edge, so the expected center is derived from the input's box and the
// thumb width, as the bubble's own `left` calculation does in LTR.
//
// `getComputedStyle()` can't read the track's pseudo-element, so the fill's
// direction comes from the last rule that paints the gradient and whose
// selector, minus the pseudo-element, matches the input; a rule outside a
// cascade layer beats one inside, as in the browser.
const pseudoElement = /::-(webkit-slider-runnable-track|moz-range-track)/
const fillDirection = input => {
  let direction
  let unlayered = false
  const walk = (rules, parent, layered) => {
    for (const rule of rules) {
      if (rule.selectorText === undefined) {
        if (rule.cssRules) {walk(rule.cssRules, parent, layered || rule.constructor.name === 'CSSLayerBlockRule')}
        continue
      }

      const selector = parent ? rule.selectorText.replaceAll('&', `:is(${parent})`) : rule.selectorText
      const image = rule.style.backgroundImage
      if (pseudoElement.test(selector) && image.includes('gradient') && image.includes('range-fill')) {
        try {
          if (input.matches(selector.replace(pseudoElement, '')) && (!layered || !unlayered)) {
            unlayered ||= !layered
            direction = /linear-gradient\(\s*(to \w+|[\d.]+deg)/.exec(image)?.[1]
          }
        } catch {}
      }

      if (rule.cssRules) {walk(rule.cssRules, selector, layered)}
    }
  }

  for (const sheet of document.styleSheets) {
    try {walk(sheet.cssRules, '', false)} catch {}
  }

  return direction
}

export async function assert() {
  const range = document.querySelector('[data-playground-repro] .form-range')
  const input = range.querySelector('.form-range-input')
  const bubble = range.querySelector('.form-range-bubble')
  if (!bubble) {
    return { pass: null, details: 'the value bubble was not created' }
  }

  const probe = document.createElement('div')
  probe.style.cssText = 'position: absolute; visibility: hidden; width: var(--bs-range-thumb-width)'
  range.append(probe)
  const thumbWidth = probe.getBoundingClientRect().width
  probe.remove()

  const fill = (input.value - input.min) / (input.max - input.min)
  const box = input.getBoundingClientRect()
  const rtl = getComputedStyle(input).direction === 'rtl'
  const offset = (thumbWidth / 2) + (fill * (box.width - thumbWidth))
  const thumbCenter = rtl ? box.right - offset : box.left + offset

  const bubbleBox = bubble.getBoundingClientRect()
  const bubbleOff = (bubbleBox.left + (bubbleBox.width / 2)) - thumbCenter

  // The gradient paints the fill from its first stop: `to left` starts at the right edge.
  const direction = fillDirection(input)
  const fillOk = direction === 'to left' || direction === '270deg'

  return {
    pass: rtl && fillOk && Math.abs(bubbleOff) <= 1,
    details: `${rtl ? 'RTL' : 'not RTL'}, fill gradient ${direction ?? 'none'} (expected to left), bubble center ${bubbleOff.toFixed(1)}px from the thumb center (expected within 1px)`
  }
}

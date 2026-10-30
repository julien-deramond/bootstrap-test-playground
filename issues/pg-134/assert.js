// Fixed when, in every RTL select, the chevron (the select's background image)
// sits on the inline-end side, the left edge, and the LTR reference keeps it on
// the right.
//
// `background-position-x` computes to `calc(100% - 12px)` for `right .75rem`
// and to `12px` for `left .75rem`: a percentage of 100% means the right edge.
const side = (select) => {
  const x = getComputedStyle(select).backgroundPositionX.trim()
  const anchored = /^calc\(100%/.test(x) || x === '100%' || x === 'right'
  return { x, side: anchored ? 'right' : 'left' }
}

export function assert() {
  const reference = document.querySelector('[data-case="ltr"] select')
  const selects = [...document.querySelectorAll('[data-case="rtl"] select')]
  if (!reference || !selects.length) return { pass: null, details: 'LTR reference or RTL selects not found' }

  const ltr = side(reference)
  const results = selects.map((select) => ({ id: select.id, ...side(select) }))
  return {
    pass: ltr.side === 'right' && results.every(({ side }) => side === 'left'),
    details: `LTR chevron on the ${ltr.side} (${ltr.x}); RTL: ${results.map(({ id, side, x }) => `${id} on the ${side} (${x})`).join(', ')}`
  }
}

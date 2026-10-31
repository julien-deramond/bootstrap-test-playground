// The vertical center of each control minus the vertical center of its label's
// first line, in px, for a checkbox, a radio and a switch at three sizes.
// A positive number means the control sits below the center of the line.
const NAMES = { check: 'checkbox', radio: 'radio', switch: 'switch' }
const SIZES = { sm: 'small', md: 'default', lg: 'large' }

export function measureOffsets(root = document) {
  return [...root.querySelectorAll('#controls .form-field')].map(field => {
    const input = field.querySelector('input')
    const label = field.querySelector('label')
    // A switch's box is its wrapper; a checkbox's and a radio's is the input.
    const control = input.closest('.switch') ?? input
    const text = document.createTreeWalker(label, NodeFilter.SHOW_TEXT).nextNode()
    const range = document.createRange()
    range.selectNodeContents(text)
    const line = range.getClientRects()[0]
    const box = control.getBoundingClientRect()
    const kind = input.matches('[switch]') ? 'switch' : (input.type === 'radio' ? 'radio' : 'check')
    const size = /-(sm|lg)\b/.test(`${control.className} ${input.className}`) ?
      RegExp.$1 :
      'md'
    const offset = (box.top + box.height / 2) - (line.top + line.height / 2)
    return { name: `${NAMES[kind]} ${SIZES[size]}`, offset }
  })
}

export function format(results) {
  return results.map(({ name, offset }) => `${name} ${offset > 0 ? '+' : ''}${offset.toFixed(1)}px`).join(', ')
}

// Fixed when the caret of a select (`select.form-control` and
// `.form-control-caret`) follows the color scheme its control is rendered in:
// a light stroke where the computed `color-scheme` is dark, a dark one where it
// is light. Four cases: the OS (emulated dark here, no attribute), the
// `.color-scheme-dark` utility, a wrapper whose `color-scheme` is dark by
// default, and a `data-bs-theme="light"` subtree of a dark page (the inverse:
// today a white caret on a light control). The `data-bs-theme="dark"` block is
// the reference and passes today. Today the first three cases and the nested
// one fail: the stroke is `#00000080` (or `#ffffff80` in the nested one) whatever
// the scheme.
export const environment = { colorScheme: 'dark' }

const ready = () => new Promise(resolve => {
  const check = () => (document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

// The stroke is encoded in the data-URI of the background image. A fix that
// draws the caret with a mask has no stroke: its `background-color` is the
// caret color, so the luminance is read from there.
const caretColor = style => {
  const image = decodeURIComponent(style.backgroundImage)
  const stroke = image.match(/stroke='([^']+)'/)?.[1]
  if (stroke) {
    const hex = stroke.replace('#', '')
    return { source: `stroke ${stroke}`, rgb: [0, 2, 4].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) }
  }

  const mask = style.maskImage || style.webkitMaskImage
  if (mask && mask !== 'none') {
    const rgb = style.backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number)
    return { source: `mask ${style.backgroundColor}`, rgb }
  }

  return null
}

// Resolves `light dark` (the default on :root) with the media query.
const scheme = element => {
  const value = getComputedStyle(element).colorScheme
  if (value.includes('dark') && !value.includes('light')) {return 'dark'}
  if (value.includes('light') && !value.includes('dark')) {return 'light'}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export async function assert() {
  await ready()
  const cases = [...document.querySelectorAll('[data-case]')].flatMap(block => {
    return [...block.querySelectorAll('select.form-control, .form-control-caret')].map(element => {
      const style = getComputedStyle(element)
      const caret = caretColor(style)
      const expected = scheme(element)
      const luminance = caret ? (0.2126 * caret.rgb[0] + 0.7152 * caret.rgb[1] + 0.0722 * caret.rgb[2]) / 255 : null
      const light = luminance !== null && luminance > 0.5
      return {
        name: `${block.dataset.case} ${element.matches('select') ? 'select' : 'caret'}`,
        pass: luminance !== null && light === (expected === 'dark'),
        text: `${block.dataset.case} ${element.matches('select') ? 'select' : 'caret'} (${expected}): ${caret ? caret.source : 'no caret'}`
      }
    })
  })

  return {
    pass: cases.length === 10 && cases.every(item => item.pass),
    details: cases.map(item => `${item.text}${item.pass ? ' ok' : ' wrong'}`).join('; ')
  }
}

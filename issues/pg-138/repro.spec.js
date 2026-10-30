// Fixed when a floated label lines up with the start of the input's text in
// RTL as it does in LTR: the distance from the field's inline start edge to the
// label text equals the same distance for the input text, within 1px. Today
// `.form-floating > label` scales from `transform-origin: 0 0` and nudges with
// `translateX(.15rem)`, both physical, so in RTL the label lands 27px to 31px
// from the inline start instead of 16px (35px to 38px on this page).
import { test } from '../../tests/issues/fixtures.js'

test('the floated label lines up with the input text in RTL', async ({ page, repro }) => {
  await repro.open()

  const measure = direction => page.evaluate(dir => {
    const group = document.querySelector(`[data-playground-repro] [data-direction="${dir}"]`)
    const results = {}
    for (const [name, selector] of [['email', 'input'], ['comments', 'textarea']]) {
      const field = group.querySelectorAll('.form-floating')[name === 'email' ? 0 : 1]
      const control = field.querySelector(selector)
      const label = field.querySelector('label')
      const box = field.getBoundingClientRect()
      const style = getComputedStyle(control)
      const range = document.createRange()
      range.selectNodeContents(label)
      const text = range.getBoundingClientRect()
      const rtl = dir === 'rtl'
      const controlBox = control.getBoundingClientRect()
      const inputStart = rtl
        ? box.right - (controlBox.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight))
        : controlBox.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft) - box.left
      const labelStart = rtl ? box.right - text.right : text.left - box.left
      results[name] = { label: Math.round(labelStart * 10) / 10, input: Math.round(inputStart * 10) / 10 }
    }
    return results
  }, direction)

  const ltr = await measure('ltr')
  const rtl = await measure('rtl')
  const aligned = ({ label, input }) => Math.abs(label - input) <= 1
  const pass = [...Object.values(ltr), ...Object.values(rtl)].every(aligned)
  const show = result => Object.entries(result).map(([name, { label, input }]) => `${name} label ${label}px, text ${input}px`).join('; ')
  repro.verdict(pass, `LTR: ${show(ltr)}. RTL: ${show(rtl)}`)
})

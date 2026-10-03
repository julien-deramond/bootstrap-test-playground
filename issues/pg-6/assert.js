// Fixed when both combobox toggles fit their 200px field and the long
// selected value ends with an ellipsis.
const until = (condition, ms = 3000) => new Promise(resolve => {
  const started = Date.now()
  const check = () => (condition() || Date.now() - started > ms ? resolve(condition()) : setTimeout(check, 50))
  check()
})

export async function assert() {
  const [plain, minWidth] = document.querySelector('[data-playground-repro]').querySelectorAll('.combobox-toggle')
  const value = plain.querySelector('.combobox-value')
  // The combobox renders the selected option once it's initialized.
  const rendered = await until(() => /United Kingdom/.test(value.textContent))
  const width = element => Math.round(element.getBoundingClientRect().width)
  const fits = toggle => width(toggle) <= width(toggle.parentElement) + 1
  const style = getComputedStyle(value)
  const ellipsis = style.textOverflow === 'ellipsis' && style.overflowX !== 'visible'
  return {
    pass: rendered && fits(plain) && fits(minWidth) && ellipsis,
    details: `${rendered ? '' : 'the selected value never rendered; '}toggle ${width(plain)}px in a ${width(plain.parentElement)}px field, ` +
      `with min-width: 0 ${width(minWidth)}px; value text-overflow: ${style.textOverflow}, overflow: ${style.overflowX}`
  }
}

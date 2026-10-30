// Fixed when both combobox toggles fit their 200px field and the long
// selected value ends with an ellipsis. text-overflow only paints on a block
// container, so the ellipsis must sit on a non-flex/grid .combobox-value or
// on a child of it (a min-width fix alone leaves the text clipped, no ellipsis).
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
  const clips = element => {
    const computed = getComputedStyle(element)
    return computed.textOverflow === 'ellipsis' && computed.overflowX !== 'visible'
  }
  const isBlockContainer = !/(flex|grid)$/.test(style.display)
  const childEllipsis = [...value.children].some(child => clips(child) && !/(flex|grid)$/.test(getComputedStyle(child).display))
  const ellipsis = (clips(value) && isBlockContainer) || childEllipsis
  return {
    pass: rendered && fits(plain) && fits(minWidth) && ellipsis,
    details: `${rendered ? '' : 'the selected value never rendered; '}toggle ${width(plain)}px in a ${width(plain.parentElement)}px field, ` +
      `with min-width: 0 ${width(minWidth)}px; value text-overflow: ${style.textOverflow}, overflow: ${style.overflowX}, display: ${style.display}`
  }
}

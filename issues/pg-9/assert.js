// Fixed when the tokens the nav link and the range track read are declared:
// `--bs-nav-link-font-weight` and `--bs-range-track-box-shadow` resolve to a
// value on the elements that use them.
export async function assert() {
  const block = document.querySelector('[data-playground-repro]')
  const link = getComputedStyle(block.querySelector('.nav-link'))
  const range = getComputedStyle(block.querySelector('.form-range-input'))
  const token = (style, name) => style.getPropertyValue(name).trim()
  const weight = token(link, '--bs-nav-link-font-weight')
  const shadow = token(range, '--bs-range-track-box-shadow')
  return {
    pass: Boolean(weight && shadow),
    details: `--bs-nav-link-font-weight: ${weight || '(undefined)'}, nav link font-weight: ${link.fontWeight}; --bs-range-track-box-shadow: ${shadow || '(undefined)'}`
  }
}

// Fixed when a chip inside bold text keeps the normal weight (400) its rule
// means, instead of inheriting because the fallback token is gone.
export async function assert() {
  const style = getComputedStyle(document.querySelector('[data-playground-repro] .chip'))
  const token = style.getPropertyValue('--bs-font-weight-base').trim()
  return {
    pass: style.fontWeight === '400',
    details: `--bs-font-weight-base: ${token || '(undefined)'}, font-weight: ${style.fontWeight}`
  }
}

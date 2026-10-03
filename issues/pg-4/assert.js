// Fixed when `.check` reads `--check-border-radius`: tokens.css sets it to 0,
// so a square checkbox.
export async function assert() {
  const style = getComputedStyle(document.querySelector('[data-playground-repro] .check'))
  const token = style.getPropertyValue('--bs-check-border-radius').trim()
  return {
    pass: style.borderRadius === '0px',
    details: `--bs-check-border-radius: ${token || '(undefined)'}, border-radius: ${style.borderRadius}`
  }
}

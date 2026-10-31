// Fixed when every `.bg-2 .dark:bg-primary` box has the background of its own
// color mode, whatever the system prefers: `.bg-primary` where the nearest
// `data-bs-theme` is dark, `.bg-2` where it is light. Each case brings both
// plain references in the same subtree, so the expectation doesn't depend on
// the system. Today the box follows `prefers-color-scheme` only, so some cases
// fail on any system.
const ready = () => new Promise(resolve => {
  const check = () => (document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

const background = element => getComputedStyle(element).backgroundColor

export async function measure() {
  await ready()
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const cases = [...document.querySelectorAll('[data-case]')].map(element => {
    const { mode } = element.dataset
    const actual = background(element.querySelector('[data-box]'))
    const expected = background(element.querySelector(mode === 'dark' ? '[data-ref-dark]' : '[data-ref-light]'))
    return {
      name: element.dataset.case, mode, actual, expected, pass: actual === expected
    }
  })
  const details = `system ${system}: ${cases.map(item => `${item.name} (${item.mode}) ${item.pass ? 'ok' : `${item.actual}, expected ${item.expected}`}`).join('; ')}`
  return { cases, details }
}

export async function assert() {
  const { cases, details } = await measure()
  return { pass: cases.length > 0 && cases.every(item => item.pass), details }
}

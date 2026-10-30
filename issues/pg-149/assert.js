// Fixed when .fade and .collapse sit in a cascade layer: a utility wins over
// them (`utilities` is the last layer) and an override in `@layer custom` wins
// over their own tokens (`custom` comes after `components`). Three cases, all
// of which have to behave:
// - .collapse.d-block is displayed as a block,
// - .fade.opacity-100 is opaque,
// - --transition-collapse-duration set in `@layer custom` is 1s.
export const environment = { viewport: { width: 1280, height: 800 }, colorScheme: 'light' }

const ready = () => new Promise(resolve => {
  const check = () => (document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

export async function measure() {
  await ready()
  const collapse = getComputedStyle(document.getElementById('case-collapse-utility'))
  const fade = getComputedStyle(document.getElementById('case-fade-utility'))
  const token = getComputedStyle(document.getElementById('case-collapse-token')).getPropertyValue('--bs-transition-collapse-duration').trim()
  const results = {
    collapse: { pass: collapse.display === 'block', value: collapse.display },
    fade: { pass: fade.opacity === '1', value: fade.opacity },
    token: { pass: token === '1s', value: token }
  }
  return {
    results,
    pass: Object.values(results).every(result => result.pass),
    details: `.collapse.d-block display: ${results.collapse.value} (expected block); .fade.opacity-100 opacity: ${results.fade.value} (expected 1); custom-layer collapse duration: ${results.token.value} (expected 1s)`
  }
}

export async function assert() {
  const { pass, details } = await measure()
  return { pass, details }
}

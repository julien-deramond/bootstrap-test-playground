// Fixed when Bootstrap's JavaScript follows the prefix the styles were built
// with (here `--x-`): the page's four cases (range fill, carousel interval,
// carousel loop fallback, nav overflow breakpoint) all pass. It checks the
// behavior, not how a fix gets there (a global `prefix` option or a documented
// `bs-` requirement for the JavaScript).
const cases = ['range', 'carousel-interval', 'carousel-loop', 'nav-overflow']

export async function assert() {
  const html = document.documentElement
  for (let i = 0; i < 100 && html.dataset.prefixCases !== 'done'; i++) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  if (html.dataset.prefixCases !== 'done') {
    return { pass: null, details: 'the cases never ran' }
  }

  const results = cases.map(name => [name, document.querySelector(`[data-prefix-case="${name}"]`)?.dataset.result ?? 'missing'])
  const prefix = document.getElementById('prefix-detected').textContent
  return {
    pass: results.every(([, result]) => result === 'pass'),
    details: `${prefix}: ${results.map(([name, result]) => `${name} ${result}`).join(', ')}`
  }
}

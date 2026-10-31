// Fixed when every generated token passed in main.scss's $root-tokens computes
// to the value passed: --bs-radius-5 .25rem, --bs-primary-bg the same as
// --bs-teal-600, --bs-bg-body #f8f9fa and --bs-font-size-md 1.25rem. Today
// scss/_root.scss merges $root-tokens first and its loops (radii, theme
// colors, backgrounds, font sizes) write their keys after, so the defaults
// win. --bs-spacer is a hand-written key: the control that shows the merge
// itself works. If it isn't 1.5rem, the page itself is broken.
const root = () => getComputedStyle(document.documentElement)
const read = token => root().getPropertyValue(token).trim().toLowerCase()
const rem = value => (/^\.?\d/.test(value) ? String(Number.parseFloat(value)) + value.replace(/^[\d.]+/, '') : value)

export const expectations = [
  { token: '--bs-radius-5', passed: '.25rem', read: () => read('--bs-radius-5'), matches: value => rem(value) === '0.25rem' },
  { token: '--bs-primary-bg', passed: 'var(--teal-600)', read: () => read('--bs-primary-bg'), matches: value => value !== '' && value === read('--bs-teal-600') },
  { token: '--bs-bg-body', passed: '#f8f9fa', read: () => read('--bs-bg-body'), matches: value => value === '#f8f9fa' },
  { token: '--bs-font-size-md', passed: '1.25rem', read: () => read('--bs-font-size-md'), matches: value => rem(value) === '1.25rem' }
]

export function assert() {
  const control = read('--bs-spacer')
  const results = expectations.map(({ token, read: get, matches }) => {
    const actual = get()
    return { token, actual, ok: matches(actual) }
  })
  const details = results.map(({ token, actual, ok }) => `${token}: ${ok ? 'ok' : 'default kept'} (${actual || 'unset'})`).join('; ')
  if (rem(control) !== '1.5rem') return { pass: null, details: `control --bs-spacer is ${control || 'unset'}, expected 1.5rem: the page itself is broken` }
  return { pass: results.every(({ ok }) => ok), details: `${details}; control --bs-spacer: ${control}` }
}

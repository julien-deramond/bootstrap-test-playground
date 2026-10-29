// Fixed when every day button of the datepicker is square with `$enable-rounded: false`.
// The page compiles Bootstrap with that option, so each `[data-vc-date-btn]` should
// compute `border-radius: 0px`, whatever its state: today, hovered, or the first, middle
// or last day of a selected range.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function assert() {
  const root = document.querySelector('[data-playground-repro]')

  // Wait for the inline datepickers to render.
  const rendered = () => [...root.querySelectorAll('[data-bs-toggle="datepicker"]')].every(picker => picker.querySelector('[data-vc-date-btn]'))
  for (let i = 0; i < 50 && !rendered(); i++) {
    await wait(100)
  }

  if (!rendered()) {
    return { pass: null, details: 'The inline datepickers did not render' }
  }

  // Hover a day, which the calendar marks `data-vc-date-hover`.
  const hovered = root.querySelectorAll('[data-repro-hover] [data-vc-date][data-vc-date-month="current"] [data-vc-date-btn]')[17]
  hovered.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  hovered.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }))
  await wait(100)

  const states = {
    today: '[data-vc-date-today] [data-vc-date-btn]',
    'range start': '[data-vc-date-selected="first"] [data-vc-date-btn], [data-vc-date-selected="first-and-last"] [data-vc-date-btn]',
    'range middle': '[data-vc-date-selected="middle"] [data-vc-date-btn]',
    'range end': '[data-vc-date-selected="last"] [data-vc-date-btn], [data-vc-date-selected="first-and-last"] [data-vc-date-btn]',
    hover: '[data-vc-date-hover] [data-vc-date-btn]',
    'other day': '[data-vc-date]:not([data-vc-date-today], [data-vc-date-selected]) [data-vc-date-btn]'
  }
  const radius = button => getComputedStyle(button).borderRadius

  const all = [...root.querySelectorAll('[data-vc-date-btn]')]
  const rounded = all.filter(button => radius(button) !== '0px')
  const seen = Object.entries(states)
    .map(([name, selector]) => {
      const buttons = [...root.querySelectorAll(selector)]
      return `${name}: ${buttons.length ? [...new Set(buttons.map(radius))].join('/') : 'not rendered'}`
    })
    .join('; ')

  return {
    pass: rounded.length === 0,
    details: `${rounded.length} of ${all.length} day buttons are rounded (${seen})`
  }
}

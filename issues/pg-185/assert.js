// Fixed when the calendar's text follows `--datepicker-font-size`: the month and
// year buttons, the weekdays and the days all get larger when the token does.
// Today each of them sets its own `font-size` in `rem` (1rem for the month and
// year buttons, .75rem for the weekdays and days), so only the container's
// size changes and the type scale (`large-type` on this page) never reaches them.
// The playground compiles Bootstrap with the `--bs-` prefix.
const TOKEN = '--bs-datepicker-font-size'
const PARTS = {
  'month button': '[data-vc="month"]',
  'year button': '[data-vc="year"]',
  weekday: '[data-vc-week-day]',
  day: '[data-vc-date-btn]'
}

const size = (calendar, selector) => {
  const element = calendar.querySelector(selector)
  return element ? Number.parseFloat(getComputedStyle(element).fontSize) : Number.NaN
}

const measure = calendar => Object.fromEntries(Object.entries(PARTS).map(([name, selector]) => [name, size(calendar, selector)]))

export async function assert() {
  const { Datepicker } = window.bootstrap
  const input = document.getElementById('datepicker-token')
  const picker = Datepicker.getOrCreateInstance(input)
  await picker.show()

  const calendar = picker._calendar?.context?.mainElement
  if (!calendar) {
    return { pass: false, details: 'the calendar did not open, nothing to measure' }
  }

  const before = measure(calendar)
  const tokenBefore = getComputedStyle(calendar).fontSize
  calendar.style.setProperty(TOKEN, '2rem')
  const after = measure(calendar)
  const tokenAfter = getComputedStyle(calendar).fontSize
  calendar.style.removeProperty(TOKEN)
  picker.hide()

  const stuck = Object.keys(PARTS).filter(name => !(after[name] > before[name]))
  const px = sizes => Object.entries(sizes).map(([name, value]) => `${name} ${value}px`).join(', ')

  return {
    pass: stuck.length === 0,
    details: `container ${tokenBefore} -> ${tokenAfter} when ${TOKEN} goes to 2rem; text before: ${px(before)}; after: ${px(after)}${stuck.length ? `; unchanged: ${stuck.join(', ')}` : ''}`
  }
}

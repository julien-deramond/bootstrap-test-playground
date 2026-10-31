// Fixed when the stepper, datepicker, OTP input and prose read the weight tokens.
// main.scss maps normal, medium and semibold to 450, 550 and 650, values no
// component hard-codes, so a number of 400, 500 or 600 means the token isn't read.
const EXPECTED = { normal: '450', medium: '550', semibold: '650' }

const checks = [
  ['stepper number', 'semibold', '.stepper-item', '::before'],
  ['datepicker header month', 'semibold', '[data-vc="month"]'],
  ['datepicker header year', 'semibold', '[data-vc="year"]'],
  ['datepicker weekday', 'semibold', '[data-vc-week-day]'],
  ['datepicker day', 'normal', '[data-vc-date]:not([data-vc-date-today]) [data-vc-date-btn]'],
  ['datepicker today', 'semibold', '[data-vc-date-today] [data-vc-date-btn]'],
  ['OTP slot', 'medium', '.otp-slot'],
  ['prose heading', 'medium', '.prose h2'],
  ['prose heading code', 'semibold', '.prose h2 code'],
  ['prose dt', 'medium', '.prose dt']
]

// The datepicker month and year grids only exist once their view is open, and
// the calendar redraws when it changes view: measure each as soon as it shows.
async function measureGrids(root, measure) {
  for (const [name, button, cell] of [
    ['month', '[data-vc="month"]', '[data-vc-months-month]'],
    ['year', '[data-vc="year"]', '[data-vc-years-year]']
  ]) {
    root.querySelector(button)?.click()
    await new Promise(resolve => setTimeout(resolve, 200))
    measure(`datepicker ${name} grid`, 'semibold', root.querySelector(cell))
  }
}

export async function assert() {
  const root = document.querySelector('[data-playground-repro]')

  // Wait for the inline datepicker to render.
  for (let i = 0; i < 50 && !root.querySelector('[data-vc-date-btn]'); i++) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const results = []
  const measure = (label, token, element, pseudo) => {
    if (!element) {
      results.push({
        label, token, weight: 'missing', ok: false
      })
      return
    }

    const weight = getComputedStyle(element, pseudo).fontWeight
    results.push({
      label, token, weight, ok: weight === EXPECTED[token]
    })
  }

  for (const [label, token, selector, pseudo] of checks) {
    measure(label, token, root.querySelector(selector), pseudo)
  }

  // The grids replace the days, so they are measured last.
  if (!root.querySelector('[data-vc-date-btn]')) {
    return { pass: null, details: 'The inline datepicker did not render' }
  }

  await measureGrids(root, measure)

  const details = results.map(({ label, weight, token }) => `${label}: ${weight} (${token} is ${EXPECTED[token]})`).join('; ')
  return { pass: results.every(result => result.ok), details }
}

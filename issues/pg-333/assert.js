// Fixed when every --spacer-N follows --spacer at runtime. The page overrides
// `:root { --bs-spacer: .75rem; }` after Bootstrap; each of the twelve boxes has
// `padding: var(--bs-spacer-N)`, so its computed padding is the token's value in
// pixels. It must equal the step's factor times the computed --bs-spacer.
// Tokens only, never the .p-* utilities: those follow #332, not this issue.
const FACTORS = [.25, .375, .5, .75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3]
const TOLERANCE = .01

const px = value => Number.parseFloat(value)
const round = value => Math.round(value * 100) / 100

export function measure() {
  const spacer = px(getComputedStyle(document.getElementById('spacerProbe')).paddingLeft)
  const steps = FACTORS.map((factor, index) => {
    const step = index + 1
    const actual = px(getComputedStyle(document.getElementById(`spacerBox${step}`)).paddingLeft)
    const expected = factor * spacer
    return { step, actual, expected, ok: Math.abs(actual - expected) <= TOLERANCE }
  })
  const failing = steps.filter(({ ok }) => !ok)
  const list = (failing.length ? failing : steps)
    .map(({ step, actual, expected }) => `--spacer-${step} ${round(actual)}px (expected ${round(expected)}px)`)
    .join(', ')

  return {
    pass: steps.every(({ ok }) => ok),
    details: `--spacer is ${round(spacer)}px; ${failing.length ? `${failing.length} of 12 steps off: ` : 'all 12 steps match: '}${list}`
  }
}

export async function assert() {
  return measure()
}

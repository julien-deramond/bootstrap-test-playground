// Fixed when a focused chip shows a focus ring: an outline or a box shadow
// once `:focus-visible` matches. Bootstrap's Chips makes chips focusable.
const until = (condition, ms = 3000) => new Promise(resolve => {
  const started = Date.now()
  const check = () => (condition() || Date.now() - started > ms ? resolve(condition()) : setTimeout(check, 50))
  check()
})

export async function assert() {
  const chip = document.querySelector('[data-playground-repro] .chip')
  await until(() => chip.hasAttribute('tabindex'))
  chip.focus()
  const focused = document.activeElement === chip
  const visible = chip.matches(':focus-visible')
  // Computed styles are live: read them before the blur.
  const { outlineStyle, outlineWidth, boxShadow } = getComputedStyle(chip)
  const ring = (outlineStyle !== 'none' && Number.parseFloat(outlineWidth) > 0) || boxShadow !== 'none'
  chip.blur()
  const details = `${focused ? 'focused' : 'not focusable'}, :focus-visible ${visible ? 'matches' : 'doesn\'t match'}, outline: ${outlineWidth} ${outlineStyle}, box-shadow: ${boxShadow}`
  if (focused && !visible) {
    return { pass: null, details: `${details}: a scripted focus isn't focus-visible here` }
  }

  return { pass: focused && ring, details }
}

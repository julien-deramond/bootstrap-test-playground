// Fixed when the floating label's color is a mix of the text color and
// transparent (alpha about .65), and `--bs-form-floating-label-opacity` changes
// it: today `color-mix()` gets `.65`, not a percentage, so the declaration is
// invalid and the label inherits its parent's color.
export async function assert() {
  const block = document.querySelector('[data-playground-repro]')
  const label = block.querySelector('#floating-default label')
  const custom = block.querySelector('#floating-custom label')
  const alpha = color => {
    const m = color.match(/\/\s*([\d.]+)(%?)\s*\)/)
    if (!m) {return 1}
    return m[2] ? Number(m[1]) / 100 : Number(m[1])
  }

  const { color } = getComputedStyle(label)
  const parent = getComputedStyle(label.parentElement).color
  const customColor = getComputedStyle(custom).color
  const a = alpha(color)
  const c = alpha(customColor)
  return {
    pass: color !== parent && Math.abs(a - 0.65) < 0.05 && Math.abs(c - 0.3) < 0.05,
    details: `label color: ${color} (alpha ${a}), parent: ${parent}; with the token at 30%: ${customColor} (alpha ${c})`
  }
}

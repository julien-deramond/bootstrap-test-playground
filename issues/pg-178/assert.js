// Fixed when the chip input is as tall as the other controls of its size, in
// every row (default tokens, then the `compact` and `spacious` values of the
// --btn-input-* tokens), and its chips fit inside it. Today its padding and its
// ghost input's min-height are fixed in rem, so it is 54px tall in all of them.
const CASES = ['default', 'compact', 'spacious']

const height = element => element.getBoundingClientRect().height

export function assert() {
  const rows = CASES.map(name => {
    const row = document.querySelector(`[data-case="${name}"]`)
    const control = height(row.querySelector('.form-control'))
    const input = row.querySelector('.chip-input')
    const inputHeight = height(input)
    const chips = [...input.querySelectorAll('.chip')]
    const chipsFit = chips.every(chip => height(chip) <= inputHeight)
    return { name, control, button: height(row.querySelector('.btn-solid')), chipInput: inputHeight, chip: height(chips[0]), chipsFit }
  })

  const round = value => Math.round(value * 100) / 100
  const pass = rows.every(row => Math.abs(row.chipInput - row.control) < 0.5 && row.chipsFit)
  return {
    pass,
    details: rows.map(row => `${row.name}: .form-control ${round(row.control)}px, .btn ${round(row.button)}px, .chip-input ${round(row.chipInput)}px, .chip ${round(row.chip)}px${row.chipsFit ? '' : ' (taller than the input)'}`).join('; ')
  }
}

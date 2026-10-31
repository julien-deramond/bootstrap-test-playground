// Fixed when the selected day of a datepicker inside `.theme-success` is colored
// like a solid button of that theme (`--theme-bg`, `--theme-contrast`), instead
// of the primary pair it reads today. Outside a theme it stays primary.
export async function assert() {
  const host = document.querySelector('[data-playground-repro]')
  const day = scope => scope.querySelector('[data-vc-date-selected] [data-vc-date-btn]')
  const plain = day(host.querySelector('[data-test="plain"]'))
  const themed = host.querySelector('[data-test="themed"]')
  const selected = day(themed)
  const button = themed.querySelector('.btn-solid')
  if (!plain || !selected || !button) {
    return { pass: null, details: 'no selected day found: the datepickers did not render' }
  }

  const color = element => getComputedStyle(element).backgroundColor
  const [dayBg, buttonBg, plainBg] = [color(selected), color(button), color(plain)]
  return {
    pass: dayBg === buttonBg && plainBg !== buttonBg,
    details: `themed selected day ${dayBg}, themed button ${buttonBg}, unthemed selected day ${plainBg}`
  }
}

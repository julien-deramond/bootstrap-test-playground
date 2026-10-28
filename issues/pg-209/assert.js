// Fixed when every disabled control follows `--control-disabled-opacity`, set to
// 1 by the high-contrast config: today the disabled checked switch, the
// unchecked switch indicator, the chip and the combobox toggle hard-code .65 or
// .4. The check and the chip input already read the token. The button, which
// has its own token, is left out.
export async function assert() {
  const block = document.querySelector('[data-playground-repro]')
  const token = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bs-control-disabled-opacity'))
  const expected = Number.isNaN(token) ? 1 : token
  const opacity = (selector, pseudo) => Number.parseFloat(getComputedStyle(block.querySelector(selector), pseudo).opacity)

  const checks = {
    'switch, checked': opacity('.switch:has(#switchCheckedDisabled)', null),
    'switch, unchecked indicator': opacity('.switch:has(#switchDisabled)', '::before'),
    chip: opacity('#chipDisabled', null),
    'combobox toggle': opacity('#comboboxDisabled', null),
    'check (control)': opacity('#checkDisabled', null),
    'chip input (control)': opacity('#chipInputDisabled > .chip', null)
  }
  const wrong = Object.entries(checks).filter(([, value]) => Math.abs(value - expected) > 0.01)

  return {
    pass: wrong.length === 0,
    details: wrong.length ?
      `token is ${expected}, but ${wrong.map(([name, value]) => `${name} is ${value}`).join(', ')}` :
      `every disabled control has opacity ${expected}`
  }
}

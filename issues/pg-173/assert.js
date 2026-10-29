// Fixed when `$enable-shadows: false` (this page's `no-shadows` config) leaves
// no shadow on the toast, the datepicker's calendar, the switch and the
// switch's thumb: their computed `box-shadow` is `none`. Today `_toasts.scss`
// and `_datepicker.scss` declare `box-shadow: var(--…-box-shadow)` and
// `forms/_switch.scss` hard-codes two shadows, none of them through the
// `box-shadow()` mixin that honours the option. The card, which does use the
// mixin, is the control: it must be `none`, or the page isn't built on the
// right config.
const shadow = (element, pseudo) => getComputedStyle(element, pseudo).boxShadow

export async function assert() {
  const { Datepicker } = window.bootstrap
  const picker = Datepicker.getOrCreateInstance(document.getElementById('datepicker-shadow'))
  await picker.show()

  const calendar = picker._calendar?.context?.mainElement
  if (!calendar) {
    return { pass: false, details: 'the calendar did not open, nothing to measure' }
  }

  const control = shadow(document.getElementById('card-control'))
  const targets = {
    '.toast': shadow(document.querySelector('.toast')),
    '[data-vc=calendar]': shadow(calendar),
    '.switch': shadow(document.querySelector('.switch')),
    '.switch::before': shadow(document.querySelector('.switch'), '::before')
  }
  picker.hide()

  if (control !== 'none') {
    return { pass: false, details: `the control (.card) has a shadow, so this page isn't on the no-shadows config: ${control}` }
  }

  const shadowed = Object.entries(targets).filter(([, value]) => value !== 'none')
  const list = Object.entries(targets).map(([name, value]) => `${name} ${value}`).join('; ')
  return {
    pass: shadowed.length === 0,
    details: `.card (control) none; ${list}${shadowed.length ? `; with a shadow: ${shadowed.map(([name]) => name).join(', ')}` : ''}`
  }
}

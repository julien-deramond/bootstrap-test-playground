// Fixed when the spacing, gap, gutter and rounded utilities follow a runtime
// override of the tokens they are built from. tokens.css sets --bs-spacer-3 to
// .75rem and --bs-radius-5 to .25rem (Bootstrap's defaults are .5rem for both).
// Each case is compared with a control that reads the token directly, so the
// check holds whatever the override: .p-3 padding, .gap-3 gap, the padding of a
// .row.g-3 column (half of --bs-gutter-x) and the border radius of .rounded
// and .rounded-5. .rounded-top already follows --bs-radius-5 and is listed as
// the case that works. Negative spacers have no token of their own and stay out.
const style = id => getComputedStyle(document.getElementById(id))

const column = id => getComputedStyle(document.getElementById(id).firstElementChild).paddingLeft

const rounded = id => style(id).borderTopLeftRadius

// A probe resolves a var() to the pixels the browser computes for it.
const resolve = token => {
  const probe = document.createElement('div')
  probe.style.cssText = `position: absolute; visibility: hidden; width: var(${token})`
  document.body.append(probe)
  const { width } = getComputedStyle(probe)
  probe.remove()
  return width
}

export function cases() {
  const list = [
    {
      name: '.p-3', property: 'padding', actual: style('case-p').paddingTop, expected: style('control-p').paddingTop
    },
    {
      name: '.gap-3', property: 'gap', actual: style('case-gap').columnGap, expected: style('control-gap').columnGap
    },
    {
      name: '.row.g-3 > *', property: 'padding-inline', actual: column('case-row'), expected: column('control-row')
    },
    {
      name: '.rounded', property: 'border-radius', actual: rounded('case-rounded'), expected: style('control-radius').borderTopLeftRadius
    },
    {
      name: '.rounded-5', property: 'border-radius', actual: rounded('case-rounded-5'), expected: style('control-radius').borderTopLeftRadius
    },
    {
      name: '.rounded-top', property: 'border-radius (top)', actual: rounded('case-rounded-top'), expected: style('control-radius').borderTopLeftRadius
    }
  ]
  return list.map(item => ({ ...item, ok: item.actual === item.expected }))
}

export function assert() {
  const results = cases()
  const controls = [
    ['control .p-3', style('control-p').paddingTop, resolve('--bs-spacer-3')],
    ['control radius', style('control-radius').borderTopLeftRadius, resolve('--bs-radius-5')]
  ]
  const broken = controls.find(([, got, want]) => got !== want)
  if (broken) {return { pass: null, details: `${broken[0]} is ${broken[1]}, expected ${broken[2]}: the page itself is broken` }}
  const failing = results.filter(({ ok }) => !ok)
  const details = failing.length === 0 ?
    'every utility follows its token' :
    failing.map(({ name, property, actual, expected }) => `${name} ${property}: ${actual}, token gives ${expected}`).join('; ')
  return { pass: failing.length === 0, details }
}

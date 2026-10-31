// Fixed when, in RTL, the previous and next arrows are mirrored compared with
// LTR and the ends of the selected range are rounded on the outer side of the
// range: the first day on its right, the last day on its left.
//
// The arrows are `::before` pseudo-elements, read with
// `getComputedStyle(arrow, '::before')`. The LTR reference is a datepicker
// created on the fly outside any RTL ancestor, so the comparison doesn't hard
// code the rotation.
const arrowTransform = (root, name) => {
  const arrow = root.querySelector(`[data-vc-arrow="${name}"]`)
  return arrow ? getComputedStyle(arrow, '::before').transform : null
}

const dayRadii = (root, position) => {
  const button = root.querySelector(`[data-vc-date-selected="${position}"] [data-vc-date-btn]`)
  if (!button) {return null}
  const style = getComputedStyle(button)
  return {
    left: Number.parseFloat(style.borderTopLeftRadius) + Number.parseFloat(style.borderBottomLeftRadius),
    right: Number.parseFloat(style.borderTopRightRadius) + Number.parseFloat(style.borderBottomRightRadius)
  }
}

const waitFor = async (check, timeout = 3000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const value = check()
    if (value) {return value}
    await new Promise(resolve => {setTimeout(resolve, 50)})
  }

  return null
}

export async function assert() {
  const rtl = await waitFor(() => {
    const el = document.querySelector('[dir="rtl"] [data-vc="calendar"]')
    return el?.querySelector('[data-vc-date-selected="last"]') ? el : null
  })
  if (!rtl) {return { pass: null, details: 'no RTL datepicker with a selected range rendered' }}

  // LTR reference, in the same page and with the same styles
  const host = document.createElement('div')
  host.dir = 'ltr'
  host.setAttribute('data-playground-chrome', '')
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:20rem'
  host.innerHTML = '<div data-bs-toggle="datepicker" data-bs-inline="true"></div>'
  document.body.append(host)
  new window.bootstrap.Datepicker(host.firstElementChild)
  const ltr = await waitFor(() => host.querySelector('[data-vc="calendar"]'))
  const ltrPrev = ltr && arrowTransform(ltr, 'prev')
  const ltrNext = ltr && arrowTransform(ltr, 'next')
  host.remove()
  if (!ltrPrev || !ltrNext) {return { pass: null, details: 'could not render the LTR reference' }}

  const prev = arrowTransform(rtl, 'prev')
  const next = arrowTransform(rtl, 'next')
  const first = dayRadii(rtl, 'first')
  const last = dayRadii(rtl, 'last')
  if (!prev || !next || !first || !last) {return { pass: null, details: 'arrows or range ends not found' }}

  const mirrored = prev !== ltrPrev && next !== ltrNext
  // First day: radius on the right (the start of a RTL range), none on the left
  const corners = first.right > 0 && first.left === 0 && last.left > 0 && last.right === 0
  return {
    pass: mirrored && corners,
    details: `prev ${prev} (LTR ${ltrPrev}), next ${next} (LTR ${ltrNext}); first day radius left ${first.left}px / right ${first.right}px, last day left ${last.left}px / right ${last.right}px`
  }
}

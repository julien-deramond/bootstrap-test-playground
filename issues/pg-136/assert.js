// Fixed when, in both directions, every pair of neighboring avatars overlaps by
// the same amount (--bs-avatar-size * --bs-avatar-stack-spacing, a negative gap) and
// no avatar sticks out of the container that wraps the stack (the first and the
// last avatar sit flush with its edges). Within 1px.
//
// The container is an inline-block, so it is as wide as the stack's layout box:
// an avatar whose margin pulls it outside shows as an overflow.
const measure = scope => {
  const stack = scope.querySelector('.avatar-stack')
  const box = scope.querySelector('[data-box]').getBoundingClientRect()
  const avatars = [...stack.querySelectorAll('.avatar')]
    .map(avatar => avatar.getBoundingClientRect())
    .sort((a, b) => a.left - b.left)
  const style = getComputedStyle(stack.querySelector('.avatar'))
  const size = Number.parseFloat(style.width)
  const spacing = Number.parseFloat(style.getPropertyValue('--bs-avatar-stack-spacing'))
  const gaps = avatars.slice(1).map((rect, i) => rect.left - avatars[i].right)
  return {
    expectedGap: size * spacing,
    gaps,
    // Positive: the avatar sticks out of the container on that side
    overflowLeft: box.left - avatars[0].left,
    overflowRight: avatars.at(-1).right - box.right
  }
}

export function assert() {
  const ltr = document.querySelector('[dir="ltr"]:has([data-box])')
  const rtl = document.querySelector('[dir="rtl"]:has([data-box])')
  if (!ltr || !rtl) {return { pass: null, details: 'LTR or RTL block not found' }}

  const results = Object.entries({ LTR: measure(ltr), RTL: measure(rtl) }).map(([dir, m]) => {
    const gapsOk = m.gaps.every(gap => Math.abs(gap - m.expectedGap) <= 1)
    const flush = Math.abs(m.overflowLeft) <= 1 && Math.abs(m.overflowRight) <= 1
    return {
      pass: gapsOk && flush,
      details: `${dir}: gaps ${m.gaps.map(gap => gap.toFixed(1)).join(', ')}px (expected ${m.expectedGap.toFixed(1)}px), overflow ${m.overflowLeft.toFixed(1)}px left and ${m.overflowRight.toFixed(1)}px right`
    }
  })
  return {
    pass: results.every(({ pass }) => pass),
    details: results.map(({ details }) => details).join('; ')
  }
}

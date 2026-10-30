// Fixed when the trailing icon of a hovered .icon-link.icon-link-hover moves
// toward the inline end: left (a negative x translation) in RTL. Today the
// nudge is translate3d(.25em, 0, 0) whatever the direction, so in RTL the icon
// moves right, into the text. In LTR it must keep moving right by .25em.
import { test } from '../../tests/issues/fixtures.js'

async function hoveredTranslateX(page, repro, params) {
  await repro.open(params)

  const link = page.locator('[data-playground-repro] .icon-link-hover').first()
  await link.hover({ timeout: 30_000 })

  return link.locator('> .bi').evaluate(icon => {
    const { transform } = getComputedStyle(icon)
    return transform === 'none' ? 0 : new DOMMatrix(transform).m41
  })
}

test('the icon link nudge moves away from the text in RTL', async ({ page, repro }) => {
  const ltr = await hoveredTranslateX(page, repro, 'dir=ltr')
  const rtl = await hoveredTranslateX(page, repro, 'dir=rtl')

  // Guard: LTR must move right, or the measure is wrong, not the bug.
  if (!(ltr > 0)) {
    throw new Error(`LTR hover translated by ${ltr}px, expected a positive x translation`)
  }

  repro.verdict(rtl < 0, `hover x translation: LTR ${ltr}px, RTL ${rtl}px`)
})

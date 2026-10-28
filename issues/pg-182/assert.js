// Fixed when the "good" level of the strength meter is filled with a real
// color, and a disabled radio's label looks like a disabled checkbox's.
const transparent = color => color === 'rgba(0, 0, 0, 0)' || color === 'transparent'

export async function assert() {
  const root = document.querySelector('[data-playground-repro]')
  const meter = root.querySelector('.strength')
  const segment = meter.querySelector('.strength-segment')
  // The meter evaluates its password once it's initialized.
  const started = Date.now()
  while (!segment.classList.contains('active') && Date.now() - started < 3000) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Let the segments' color transition end before reading their colors.
  await Promise.all(meter.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})))

  const level = meter.dataset.bsStrength
  const segmentColor = getComputedStyle(segment).backgroundColor
  const radioLabel = getComputedStyle(root.querySelector('label[for="radio182"]')).color
  const checkLabel = getComputedStyle(root.querySelector('label[for="check182"]')).color
  const bodyColor = getComputedStyle(document.body).color

  const meterFilled = level === 'good' && !transparent(segmentColor)
  const radioDimmed = radioLabel !== bodyColor && radioLabel === checkLabel
  return {
    pass: meterFilled && radioDimmed,
    details: `meter level: ${level}, filled segment: ${segmentColor}; disabled radio label: ${radioLabel}, disabled checkbox label: ${checkLabel}, body: ${bodyColor}`
  }
}

// Fixed when `.spinner-rotate` slows down under reduced motion like
// `.spinner-border` and `.spinner-grow`, which get a 1.5s animation. Reduced
// motion is emulated so that the media query applies.
export const environment = { reducedMotion: 'reduce' }

export async function assert() {
  const duration = id => getComputedStyle(document.querySelector(id)).animationDuration
  const border = duration('.spinner-border')
  const rotate = duration('#spinnerRotate')
  const active = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!active) {
    return { pass: null, details: 'reduced motion is not active here: can\'t tell' }
  }

  return {
    pass: rotate === '1.5s',
    details: `animation-duration: .spinner-rotate ${rotate}, .spinner-border ${border}`
  }
}

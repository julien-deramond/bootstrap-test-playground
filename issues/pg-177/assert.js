// Fixed when everything pill-shaped follows `--radius-pill`, which this page
// sets to 0 (the `square` config): the nav pills' container and links, and the
// range's track and thumb. The track and thumb are pseudo-elements that
// getComputedStyle can't read from the page, so their tokens are measured
// instead, on a probe that uses each token as a width. The chip, which already
// reads `--radius-pill`, is the control. Today the nav pills measure 48px and
// the range tokens 16px. The switch is left out: whether it follows
// `--radius-pill` is upstream's call.
const ready = () => new Promise(resolve => {
  const check = () => (document.readyState === 'complete' ? resolve() : setTimeout(check, 50))
  check()
})

// A token's value in pixels: a length used as the width of a probe.
const resolveToken = (element, token) => {
  const probe = document.createElement('div')
  probe.style.cssText = `position: absolute; visibility: hidden; width: var(${token}, 0px)`
  element.append(probe)
  const { width } = probe.getBoundingClientRect()
  probe.remove()
  return width
}

export async function assert() {
  await ready()
  const root = document.querySelector('[data-playground-repro]')
  const chip = root.querySelector('.chip')
  const nav = root.querySelector('.nav-pills')
  const link = root.querySelector('.nav-pills .nav-link')
  const range = root.querySelector('.form-range')

  const control = Number.parseFloat(getComputedStyle(chip).borderTopLeftRadius)
  const cases = [
    ['nav pills', Number.parseFloat(getComputedStyle(nav).borderTopLeftRadius)],
    ['nav pills link', Number.parseFloat(getComputedStyle(link).borderTopLeftRadius)],
    ['range track', resolveToken(range, '--bs-range-track-border-radius')],
    ['range thumb', resolveToken(range, '--bs-range-thumb-border-radius')]
  ].map(([name, radius]) => ({ name, radius, pass: radius === 0 }))

  return {
    // A chip that is not square means the page does not set --radius-pill: 0, so nothing can be told.
    pass: control === 0 && cases.every(item => item.pass),
    details: `${cases.map(item => `${item.name} ${item.radius}px`).join('; ')}; chip control ${control}px${control === 0 ? '' : ' (the page does not set --radius-pill: 0)'}`
  }
}

// Fixed when the components that start from a `load` listener on `window` have an
// instance after Bootstrap is imported once the page has loaded, without any
// `getOrCreateInstance()` call. This page imports Bootstrap 100 ms after
// `window.load` and nothing replays the event. The chip input and the range are
// controls: their data APIs run once the document is parsed, so they already work.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function assert() {
  const { bootstrap } = window
  const root = document.querySelector('[data-playground-repro]')
  const components = [
    {
      name: 'carousel', element: '[data-bs-autoplay="true"]', Component: bootstrap.Carousel, expected: true
    },
    {
      name: 'scrollspy', element: '[data-bs-spy="scroll"]', Component: bootstrap.ScrollSpy, expected: true
    },
    {
      name: 'chips (control)', element: '[data-bs-chips]', Component: bootstrap.Chips, expected: false
    },
    {
      name: 'range (control)', element: '.form-range', Component: bootstrap.Range, expected: false
    }
  ]
  const inert = () => components.filter(({ element, Component }) => !Component.getInstance(root.querySelector(element)))

  // A fix runs the callbacks when Bootstrap is imported, so a short wait is enough.
  for (let i = 0; i < 10 && inert().length > 0; i++) {
    await wait(50)
  }

  const missing = inert()
  const failing = missing.filter(({ expected }) => expected)
  const controls = missing.filter(({ expected }) => !expected)

  if (controls.length > 0) {
    return { pass: null, details: `A control has no instance either (${controls.map(({ name }) => name).join(', ')}), so the late import may not have worked` }
  }

  return {
    pass: failing.length === 0,
    details: failing.length > 0 ? `Inert without getOrCreateInstance(): ${failing.map(({ name }) => name).join(', ')}` : 'carousel and scrollspy have an instance'
  }
}

// Fixed when a `data-bs-config` whose JSON contains a `%` is read like any
// other: the Scrollspy keeps topMargin "20%" and smoothScroll true. Today
// normalizeData() runs decodeURIComponent() before JSON.parse(), the lone `%`
// makes it throw, and the whole attribute is ignored, so the defaults ("12%"
// and false) stay.
export async function assert() {
  const stage = document.getElementById('stage') ?? document.body
  const { ScrollSpy } = window.bootstrap

  const make = attribute => {
    const element = document.createElement('div')
    element.setAttribute(attribute.name, attribute.value)
    stage.append(element)
    return ScrollSpy.getOrCreateInstance(element)
  }

  const viaConfig = make({ name: 'data-bs-config', value: '{"topMargin":"20%","smoothScroll":true}' })
  const viaOption = make({ name: 'data-bs-top-margin', value: '20%' })

  const topMargin = viaConfig._config.topMargin
  const smoothScroll = viaConfig._config.smoothScroll
  const control = viaOption._config.topMargin

  viaConfig.dispose()
  viaOption.dispose()
  stage.replaceChildren()

  return {
    pass: topMargin === '20%' && smoothScroll === true,
    details: `data-bs-config: topMargin ${JSON.stringify(topMargin)}, smoothScroll ${smoothScroll}; control data-bs-top-margin="20%": topMargin ${JSON.stringify(control)}`
  }
}

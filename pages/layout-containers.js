// pages/layout-containers.html: prints the measured width of each container
// and wrapper, and keeps it up to date while the window or a resizable
// wrapper changes size. <html> loses data-playground-busy once every width is
// written, so screenshots wait for it.
//
// A container's width is its border box, in CSS pixels, rounded to the pixel.

const html = document.documentElement

const widthOf = element => `${Math.round(element.getBoundingClientRect().width)}px`

const targets = [
  ...[...document.querySelectorAll('[data-container]')].map(element => ({
    element, output: element.querySelector('[data-width]')
  })),
  ...[...document.querySelectorAll('[data-width-of]')].map(output => ({
    element: document.querySelector(output.dataset.widthOf), output
  }))
]

const update = () => {
  for (const { element, output } of targets) {
    output.textContent = widthOf(element)
  }
}

const observer = new ResizeObserver(update)
for (const { element } of targets) {
  observer.observe(element)
}

update()
delete html.dataset.playgroundBusy

// Fixed when the footer of a dialog taller than the viewport can be reached:
// inside the dialog's box and within the viewport, by scrolling the dialog or
// its body (which then clips the footer, on purpose), or by scrolling the page
// when the dialog moves with it. A short viewport, so that the dialog is
// taller than it.
export const environment = { viewport: { width: 1280, height: 600 } }

const once = (element, type, act) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${type} didn't fire`)), 5000)
  element.addEventListener(type, () => {
    clearTimeout(timer)
    resolve()
  }, { once: true })
  act()
})

export async function assert() {
  const dialog = document.getElementById('longDialog')
  const instance = window.bootstrap.Dialog.getOrCreateInstance(dialog)
  await once(dialog, 'shown.bs.dialog', () => instance.show())
  const box = dialog.getBoundingClientRect()
  const footer = dialog.querySelector('.dialog-footer').getBoundingClientRect()
  const body = dialog.querySelector('.dialog-body')
  const spills = Math.round(footer.bottom - box.bottom)
  const hidden = Math.round(footer.bottom - window.innerHeight)
  const scrollable = element => {
    const { overflowY } = getComputedStyle(element)
    return ['auto', 'scroll'].includes(overflowY) && element.scrollHeight > element.clientHeight + 1
  }

  const scrollsInside = scrollable(dialog) || scrollable(body)
  const scrollsWithPage = getComputedStyle(dialog).position !== 'fixed' && document.scrollingElement.scrollHeight > window.innerHeight + 1
  await once(dialog, 'hidden.bs.dialog', () => instance.hide())
  return {
    pass: scrollsInside || (spills <= 0 && (hidden <= 0 || scrollsWithPage)),
    details: `${spills > 0 ? `the footer ends ${spills}px below the dialog's box` : 'the footer is inside the dialog\'s box'}, ` +
      `${hidden > 0 ? `${hidden}px below a ${window.innerHeight}px viewport` : 'within the viewport'}; ` +
      `${scrollsInside ? 'the dialog scrolls' : scrollsWithPage ? 'the page scrolls with the dialog' : 'nothing scrolls to it'}`
  }
}

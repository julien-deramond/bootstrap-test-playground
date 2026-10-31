// Fixed when the badge, the alert link, the selected menu item and the label of
// the stacked table cell are each heavier than the text around them, with the
// `weights` config (`$font-weights: (semibold: null)`). Today all four inherit
// their parent's weight. The control reads --font-weight-bold, which still
// exists, and proves the token system works on this page.
const weight = (element, pseudo) => Number(getComputedStyle(element, pseudo).fontWeight)

export async function assert() {
  const root = document.querySelector('[data-playground-repro]')
  const control = root.querySelector('[data-control]')
  const cases = [
    ['badge', root.querySelector('.badge'), null],
    ['alert link', root.querySelector('.alert-link'), null],
    ['selected menu item', root.querySelector('.menu-item.selected'), null],
    ['stacked table label', root.querySelector('td[data-cell]'), '::before']
  ].map(([name, element, pseudo]) => {
    // The stacked label is the cell's ::before, so its surrounding text is the cell itself.
    const around = pseudo ? element : element.parentElement
    const actual = weight(element, pseudo)
    const inherited = weight(around)
    return {
      name, actual, inherited, pass: actual > inherited
    }
  })
  const controlWeight = weight(control)
  const controlInherited = weight(control.parentElement)
  return {
    pass: cases.every(item => item.pass),
    details: `${cases.map(item => `${item.name} ${item.actual} in ${item.inherited}${item.pass ? '' : ' (inherited)'}`).join('; ')}; ` +
      `control ${controlWeight} in ${controlInherited}${controlWeight > controlInherited ? '' : ' (the token system is broken on this page)'}`
  }
}

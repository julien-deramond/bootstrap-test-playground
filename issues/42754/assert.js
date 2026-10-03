// Fixed when the start and end sheets sit flush with their edge of the
// viewport, as the bottom sheet sits flush with the bottom. Their height is
// reported, not asserted: the fix caps it on large screens, as the bottom
// sheet's width is. `npm run check-issues` runs this in the page once
// Bootstrap is loaded.
const once = (element, type, act) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${type} didn't fire`)), 5000)
  element.addEventListener(type, () => {
    clearTimeout(timer)
    resolve()
  }, { once: true })
  act()
})

export async function assert() {
  const { Drawer } = window.bootstrap
  const measured = []
  for (const [id, edge] of [['sheetStart', 'left'], ['sheetEnd', 'right']]) {
    const sheet = document.getElementById(id)
    const drawer = Drawer.getOrCreateInstance(sheet)
    await once(sheet, 'shown.bs.drawer', () => drawer.show())
    const rect = sheet.getBoundingClientRect()
    const gap = Math.round(edge === 'left' ? rect.left : document.documentElement.clientWidth - rect.right)
    const height = Math.round(rect.height)
    await once(sheet, 'hidden.bs.drawer', () => drawer.hide())
    measured.push({ id, edge, gap, height })
  }

  const full = Math.round(window.innerHeight)
  return {
    pass: measured.every(({ gap }) => Math.abs(gap) <= 1),
    details: measured.map(({ id, edge, gap, height }) => `#${id} ${gap}px from the ${edge} edge, ${height}px tall in a ${full}px viewport`).join('; ')
  }
}

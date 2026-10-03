// Fixed when a page that doesn't scroll keeps no empty strip for a scrollbar:
// Bootstrap no longer sets `scrollbar-gutter: stable` on `:root`, or sets it
// so that nothing is reserved. Overlay scrollbars take no room, so this can
// only tell with classic scrollbars (Linux, Windows), as `npm run
// check-issues` runs in CI. A tall viewport, so that the page doesn't scroll.
export const environment = { viewport: { width: 1280, height: 2400 } }

export async function assert() {
  const root = document.documentElement
  const gutter = getComputedStyle(root).scrollbarGutter
  if (root.scrollHeight > root.clientHeight) {
    return { pass: null, details: `the page scrolls at ${window.innerWidth}×${window.innerHeight}: can't tell` }
  }

  // How wide a scrollbar is here: 0 with overlay scrollbars.
  const probe = document.createElement('div')
  probe.style.cssText = 'position: absolute; top: -1000px; width: 100px; height: 100px; overflow: scroll'
  document.body.append(probe)
  const scrollbar = probe.offsetWidth - probe.clientWidth
  probe.remove()

  const reserved = window.innerWidth - root.clientWidth
  if (!gutter.includes('stable')) {
    return { pass: true, details: `scrollbar-gutter: ${gutter}, ${reserved}px reserved` }
  }

  if (scrollbar === 0) {
    return { pass: null, details: `overlay scrollbars here (0px wide), so the gutter can't show; scrollbar-gutter: ${gutter}` }
  }

  return { pass: reserved === 0, details: `${reserved}px reserved for a ${scrollbar}px scrollbar on a page that doesn't scroll; scrollbar-gutter: ${gutter}` }
}

// What the playground's keyboard shortcuts share, so they never take a key
// from the page under test: the toolbar's Alt+Shift letters (toolbar.js) and
// the page switcher's Ctrl+K (palette.js).
//
// A shortcut leaves the key alone while focus is in a text field of the page:
// Alt+Shift letters type characters on some layouts (Option+Shift on macOS),
// Ctrl+K deletes to the end of the line in macOS text fields, and a tester
// typing in a Bootstrap combobox, datepicker or textarea must see what
// Bootstrap does with each key. The playground's own fields, the switcher's
// search and the panel's filter, keep the shortcuts. So does a key that a
// component already handled (`defaultPrevented`), or one that's part of an IME
// composition.
import { PLAYGROUND_HOSTS } from './tab-order.js'

// Every <input> but the ones that take no text.
const TEXT_FIELD = 'textarea, input:not([type="button"], [type="checkbox"], [type="color"], [type="file"], [type="hidden"], [type="image"], [type="radio"], [type="range"], [type="reset"], [type="submit"])'

export function leftToPage(event) {
  if (event.defaultPrevented || event.isComposing) {
    return true
  }

  // The element that has focus, inside open shadow roots too.
  const [target] = event.composedPath()
  if (!(target instanceof Element)) {
    return false
  }

  const root = target.getRootNode()
  if (root instanceof ShadowRoot && PLAYGROUND_HOSTS.includes(root.host.id)) {
    return false
  }

  return target.isContentEditable || target.matches(TEXT_FIELD)
}

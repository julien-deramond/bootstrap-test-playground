// Fixed when `$enable-reduced-motion: false` leaves no `prefers-reduced-motion`
// query in the compiled CSS: the option says motion ignores the reader's setting.
// The page's stylesheets are walked, nested rules and cascade layers included.
const queries = []

const walk = (rules) => {
  for (const rule of rules) {
    if (rule.media && /prefers-reduced-motion/.test(rule.media.mediaText)) {
      const selectors = Array.from(rule.cssRules, (inner) => inner.selectorText || inner.cssText.slice(0, 40))
      queries.push(`(${rule.media.mediaText.replace(/^\(|\)$/g, '')}) ${selectors.join(', ')}`)
    }

    if (rule.cssRules) {
      walk(rule.cssRules)
    }
  }
}

export async function assert() {
  queries.length = 0
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules)
    } catch {
      // A cross-origin sheet can't be read; this page only has its own.
    }
  }

  return {
    pass: queries.length === 0,
    details: queries.length ? `${queries.length} prefers-reduced-motion queries left: ${queries.join(' | ')}` : 'no prefers-reduced-motion query left'
  }
}

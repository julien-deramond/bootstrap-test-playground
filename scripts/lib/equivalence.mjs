// The static half of `npm run check-equivalence`: what a Sass `with (…)`
// override changes in the compiled CSS, compared with what the same override
// in tokens.css can reach at runtime. See scripts/check-equivalence.mjs.

// Sass writes `0.5rem` where tokens.css may say `.5rem`.
const normalizeValue = value => value.replace(/\s+/g, ' ').trim().replace(/(^|[^\w.])(-?)0+(\.\d)/g, '$1$2$3')

// Every declaration of a stylesheet, keyed by where it is: its at-rules
// (`@layer components > @media (width >= 576px)`), its selector and its
// property. A property repeated in the same rule keeps its last value, like
// the cascade.
export function declarations(root) {
  const map = new Map()
  root.walkDecls(decl => {
    const context = []
    let parent = decl.parent
    while (parent && parent.type !== 'root') {
      if (parent.type === 'atrule') {
        context.unshift(`@${parent.name} ${parent.params}`.trim())
      }

      parent = parent.parent
    }

    const selector = decl.parent.type === 'rule' ? decl.parent.selector.replace(/\s+/g, ' ') : ''
    const entry = { context: context.join(' > '), selector, prop: decl.prop, value: normalizeValue(decl.value) }
    map.set(`${entry.context}|${selector}|${decl.prop}`, entry)
  })
  return map
}

const selectorsOf = selector => selector.split(/\s*,\s*/)

// Only layers: a declaration under a media query or a `@supports` only
// applies sometimes, so a token set unconditionally doesn't match it.
const unconditional = context => context.split(' > ').every(part => !part || part.startsWith('@layer '))

// Compares the Sass side's CSS with Bootstrap's default CSS, and sorts each
// difference by what the tokens side does about it:
// - `covered`: tokens.css sets the same token to the same value on one of the
//   rule's selectors, so the runtime path reaches it too;
// - `compileTime`: every other change, a value Sass computed or consumed
//   (a scale derived from `$spacer`, a utility's literal value, a declaration
//   a `null` key removed), which tokens.css doesn't touch;
// - `unreached`: a token tokens.css sets that Sass leaves at its default
//   everywhere, so the Sass override doesn't reach it;
// - `redeclared`: for a token tokens.css sets in a layer, the other rules of
//   the default CSS that declare it, like size modifiers. The override, in a
//   later layer, replaces their values on the elements both match, while the
//   Sass override leaves them as they are. (A `:root` override is shadowed by
//   them on both sides alike.)
export function compareStatic({ defaults, sass, tokens }) {
  const changes = []
  for (const [key, entry] of sass) {
    const before = defaults.get(key)
    if (!before) {
      changes.push({ ...entry, kind: 'added' })
    } else if (before.value !== entry.value) {
      changes.push({ ...entry, kind: 'changed', from: before.value })
    }
  }

  for (const [key, entry] of defaults) {
    if (!sass.has(key)) {
      changes.push({ ...entry, kind: 'removed', from: entry.value, value: undefined })
    }
  }

  const set = [...tokens.values()]
  const covers = (token, change) => token.prop === change.prop && token.value === change.value &&
    unconditional(change.context) && selectorsOf(change.selector).some(selector => selectorsOf(token.selector).includes(selector))

  const covered = changes.filter(change => set.some(token => covers(token, change)))
  const compileTime = changes.filter(change => !covered.includes(change))
  const unreached = set.filter(token => !changes.some(change => change.prop === token.prop))
  const redeclared = set.filter(token => token.context.startsWith('@layer ')).flatMap(token => [...defaults.values()]
    .filter(entry => entry.prop === token.prop && !selectorsOf(entry.selector).some(selector => selectorsOf(token.selector).includes(selector)))
    .map(entry => ({ ...entry, token: token.prop })))

  return { changes, covered, compileTime, unreached, redeclared }
}

// Groups compile-time changes for the report: by layer, kind and property,
// so 72 spacing utilities read as one line.
export function groupChanges(changes) {
  const groups = new Map()
  for (const change of changes) {
    const layer = change.context.match(/@layer ([\w-]+)/)?.[1] ?? 'unlayered'
    const key = `${layer}|${change.kind}|${change.prop}`
    groups.set(key, [...(groups.get(key) ?? []), change])
  }

  return [...groups.values()]
    .map(list => ({ layer: list[0].context.match(/@layer ([\w-]+)/)?.[1] ?? 'unlayered', kind: list[0].kind, prop: list[0].prop, list }))
    .sort((a, b) => b.list.length - a.list.length || a.prop.localeCompare(b.prop))
}

// Bootstrap's class and token names, for searching pages by class
// (`btn-subtle`) or token (`--alert-padding-x`). Read from Bootstrap's
// compiled `dist/css/bootstrap.css`, which check-dist keeps in step with the
// Sass. Used by vite.config.js for `virtual:playground-pages`.
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { root } from './configs.mjs'

const CLASS = /\.(-?[_a-zA-Z][\w-]*)/g
// Functional pseudo-classes, like `:not(.x)`, whose classes aren't the subject.
const FUNCTIONAL_PSEUDO = /:[\w-]+\((?:[^()]|\([^()]*\))*\)/g

// `classes`: every class a selector names. `tokens`: each `--bs-*` custom
// property declared on a class (named without `--bs-`), with the classes whose
// rules declare it, like `alert-padding-x` → ['alert'].
export function readBootstrapIndex(bootstrapDir = path.join(root, 'node_modules/bootstrap')) {
  const file = path.join(bootstrapDir, 'dist/css/bootstrap.css')
  const classes = new Set()
  const tokens = new Map()
  if (!fs.existsSync(file)) {
    return { classes, tokens }
  }

  postcss.parse(fs.readFileSync(file, 'utf8')).walkRules(rule => {
    for (const selector of rule.selectors) {
      for (const [, name] of selector.matchAll(CLASS)) {
        classes.add(name)
      }
    }

    // The selector's subject: the classes of its last compound.
    const subjects = new Set(rule.selectors.flatMap(selector =>
      [...selector.replace(FUNCTIONAL_PSEUDO, '').split(/\s*[\s>+~]\s*/).at(-1).matchAll(CLASS)].map(([, name]) => name)))
    if (subjects.size === 0) {
      return
    }

    rule.walkDecls(/^--bs-/, decl => {
      const name = decl.prop.slice('--bs-'.length)
      tokens.set(name, new Set([...(tokens.get(name) ?? []), ...subjects]))
    })
  })

  return { classes, tokens }
}

// Removes each element carrying `data-playground-chrome`, with its content:
// the playground's own navigation and headings aren't the markup under test.
function withoutChrome(html) {
  const open = /<([a-z][\w-]*)\b[^>]*\bdata-playground-chrome\b[^>]*>/gi
  let result = ''
  let index = 0
  let match
  while ((match = open.exec(html))) {
    const tag = match[1].toLowerCase()
    const same = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi')
    same.lastIndex = open.lastIndex
    let depth = 1
    let inner
    while (depth > 0 && (inner = same.exec(html))) {
      depth += inner[1] ? -1 : 1
    }

    result += html.slice(index, match.index)
    index = inner ? same.lastIndex : html.length
    open.lastIndex = index
  }

  return result + html.slice(index)
}

// The Bootstrap classes a page's markup uses: `[name, count, section]`, where
// `section` is the id of the first example heading (`<h2 id>`) above its first
// use, if any. Most used first.
export function pageClasses(html, bootstrapClasses) {
  const body = withoutChrome((html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ''))
  // Headings are chrome, so their positions come from the full page, matched by id.
  const headings = [...html.matchAll(/<h2[^>]*\bid="([^"]+)"/gi)].map(([, id]) => id)
  const found = new Map()
  let section
  for (const [tag] of body.matchAll(/<[a-z][^>]*>/gi)) {
    // A section starts at its heading, or at its <section aria-labelledby>
    // when the heading is chrome.
    const id = tag.match(/^<h2\b[^>]*\bid="([^"]+)"/i)?.[1] ?? tag.match(/\baria-labelledby="([^"]+)"/)?.[1]
    if (id && headings.includes(id)) {
      section = id
    }

    for (const name of tag.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? []) {
      if (bootstrapClasses.has(name)) {
        const entry = found.get(name) ?? [name, 0, section]
        entry[1]++
        found.set(name, entry)
      }
    }
  }

  return [...found.values()].sort((a, b) => b[1] - a[1]).map(([name, count, id]) => (id ? [name, count, id] : [name, count]))
}

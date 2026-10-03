// The list of pages found by vite.config.js (see `virtual:playground-pages`),
// with the search shared by the home page and the page switcher. Besides
// words, it takes class names (`btn-subtle`, `.btn-subtle`) and tokens
// (`--alert-padding-x`, `--bs-alert-padding-x`), matched against the Bootstrap
// classes each page's markup uses.
import groups, { tokens } from 'virtual:playground-pages'
import { STATUSES } from './repro-status.js'

const RECENT_KEY = 'bootstrap-playground-recent'
const RECENT_MAX = 8

export { groups }

export const pages = groups.flatMap(group => group.pages.map(page => ({ ...page, group: group.dir, groupLabel: group.label })))

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const words = value => normalize(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const indexed = new Map(pages.map(page => [page, {
  title: normalize(page.title),
  titleWords: words(page.title),
  tags: page.tags,
  sections: page.sections.map(section => ({ ...section, words: words(section.title), text: normalize(section.title) })),
  // A reproduction is found by its status ("reported") and its issues' numbers.
  other: normalize([page.groupLabel, page.url, page.description, page.source?.label ?? '',
    STATUSES[page.repro?.status]?.text ?? '', page.repro?.upstream ?? '', page.repro?.tracking.replace(/^.*#/, '#') ?? ''].join(' ')),
  classes: new Map(page.classes.map(([name, count, section]) => [name, { count, section }]))
}]))

const allClasses = new Set(pages.flatMap(page => page.classes.map(([name]) => name)))

// A query term naming classes: a token (`--alert-padding-x`, or the start of
// one) stands for the classes declaring it, a class name (`.btn-subtle`, or
// `btn-sub` while typing) for itself or the classes it starts. `undefined` when
// the term names none: it's then searched as words. A plain word can be a
// class too (`btn`), but only matches as one when it doesn't as a word.
function codeTerm(term) {
  if (term.startsWith('--')) {
    const name = term.replace(/^--(bs-)?/, '').toLowerCase()
    const owners = tokens[name] ?? (name.length >= 3 ?
      [...new Set(Object.keys(tokens).filter(token => token.startsWith(name)).flatMap(token => tokens[token]))] :
      [])
    return owners.length > 0 ? { label: `--${name}`, kind: 'token', classes: owners } : undefined
  }

  const name = term.replace(/^\./, '')
  if (!term.startsWith('.') && !name.includes('-')) {
    return undefined
  }

  if (allClasses.has(name)) {
    return { label: `.${name}`, kind: 'class', classes: [name], exact: true }
  }

  const started = name.length >= 3 ? [...allClasses].filter(existing => existing.startsWith(name)) : []
  return started.length > 0 ? { label: `.${name}`, kind: 'class', classes: started } : undefined
}

// How much a page uses a code term's classes: `{ score, section, classes }`,
// or undefined. More uses rank higher, so a component's own kitchen sink page
// usually comes first.
function scoreCode(code, entry) {
  const used = code.classes.filter(name => entry.classes.has(name))
  if (used.length === 0) {
    return undefined
  }

  const count = used.reduce((sum, name) => sum + entry.classes.get(name).count, 0)
  // The first class in the page's order of use with a section.
  const section = used.map(name => entry.classes.get(name).section).find(Boolean)
  return { score: (code.exact || code.kind === 'token' ? 30 : 15) + Math.min(count, 30), section, classes: used }
}

// True when the letters of `token` appear in order in `text` ("dlg" → "dialog").
const isSubsequence = (token, text) => {
  let index = 0
  for (const char of text) {
    if (char === token[index]) {
      index++
    }
  }

  return index === token.length
}

function scoreToken(token, entry) {
  let score = 0
  if (entry.title === token) {
    score = 100
  } else if (entry.title.startsWith(token)) {
    score = 80
  } else if (entry.titleWords.some(word => word.startsWith(token))) {
    score = 60
  } else if (entry.title.includes(token)) {
    score = 40
  }

  if (entry.tags.includes(token)) {
    score = Math.max(score, 50)
  } else if (entry.tags.some(tag => tag.startsWith(token))) {
    score = Math.max(score, 30)
  }

  if (score === 0 && entry.sections.some(section => section.words.some(word => word.startsWith(token)))) {
    score = 20
  }

  if (score === 0 && entry.other.includes(token)) {
    score = 10
  }

  if (score === 0 && token.length > 2 && isSubsequence(token, entry.title)) {
    score = 5
  }

  return score
}

// The example heading that best matches the tokens the title doesn't cover.
function bestSection(tokens, entry) {
  const missing = tokens.filter(token => !entry.title.includes(token))
  if (missing.length === 0) {
    return undefined
  }

  let best
  let bestHits = 0
  for (const section of entry.sections) {
    const hits = missing.filter(token => section.words.some(word => word.startsWith(token)) || section.text.includes(token)).length
    if (hits > bestHits) {
      best = section
      bestHits = hits
    }
  }

  return best && { id: best.id, title: best.title }
}

// The query's class and token terms, and the words of the rest.
function parseQuery(query) {
  const codes = []
  const plain = []
  for (const term of query.trim().split(/\s+/).filter(Boolean)) {
    const code = codeTerm(term)
    if (code) {
      codes.push(code)
    } else {
      plain.push(term)
    }
  }

  return { codes, plain, tokens: plain.flatMap(words) }
}

// The query without its class and token terms, for highlighting results.
export const queryText = query => parseQuery(query).plain.join(' ')

// Every query term must match somewhere. Returns `{ page, score, section,
// matches }`, best first; `section` is the example heading that matched, if
// any, and `matches` the classes and tokens found, like
// `[{ label: '--alert-padding-x', kind: 'token', classes: ['alert'] }]`.
export function search(query, list = pages) {
  const { codes, tokens } = parseQuery(query)

  if (tokens.length === 0 && codes.length === 0) {
    return list.map(page => ({ page, score: 0 }))
  }

  const results = []
  for (const page of list) {
    const entry = indexed.get(page)
    let score = 0
    let codeSection
    const matches = []
    for (const token of tokens) {
      // A word that names a class used here, like `btn`, when nothing else matches.
      const tokenScore = scoreToken(token, entry) || (entry.classes.has(token) ? 8 : 0)
      if (tokenScore === 0) {
        score = 0
        break
      }

      if (!scoreToken(token, entry)) {
        matches.push({ label: `.${token}`, kind: 'class', classes: [token] })
        codeSection ??= entry.classes.get(token).section
      }

      score += tokenScore
    }

    for (const code of tokens.length > 0 && score === 0 ? [] : codes) {
      const found = scoreCode(code, entry)
      if (!found) {
        score = 0
        break
      }

      score += found.score
      codeSection ??= found.section
      matches.push({ ...code, classes: found.classes })
    }

    if (score > 0) {
      const sectionId = bestSection(tokens, entry)?.id ?? codeSection
      const section = entry.sections.find(({ id }) => id === sectionId)
      results.push({ page, score, section: section && { id: section.id, title: section.title }, matches })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

export const resultUrl = ({ page, section }) => (section ? `${page.url}#${section.id}` : page.url)

export function readRecent() {
  try {
    const urls = JSON.parse(localStorage.getItem(RECENT_KEY)) ?? []
    return urls.map(url => pages.find(page => page.url === url)).filter(Boolean)
  } catch {
    return []
  }
}

export function recordVisit(url) {
  if (!pages.some(page => page.url === url)) {
    return
  }

  try {
    const urls = (JSON.parse(localStorage.getItem(RECENT_KEY)) ?? []).filter(existing => existing !== url)
    localStorage.setItem(RECENT_KEY, JSON.stringify([url, ...urls].slice(0, RECENT_MAX)))
  } catch {}
}

// Previous and next pages in the same group, for the toolbar.
export function siblings(url) {
  const group = groups.find(({ pages }) => pages.some(page => page.url === url))
  if (!group) {
    return {}
  }

  const index = group.pages.findIndex(page => page.url === url)
  return { group, previous: group.pages[index - 1], next: group.pages[index + 1] }
}

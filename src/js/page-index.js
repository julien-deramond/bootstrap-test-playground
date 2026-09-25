// The list of pages found by vite.config.js (see `virtual:playground-pages`),
// with the search shared by the home page and the page switcher.
import groups from 'virtual:playground-pages'

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
  other: normalize([page.groupLabel, page.url, page.description, page.source?.label ?? ''].join(' '))
}]))

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

// Every query word must match somewhere. Returns `{ page, score, section }`,
// best first; `section` is the example heading that matched, if any.
export function search(query, list = pages) {
  const tokens = words(query)
  if (tokens.length === 0) {
    return list.map(page => ({ page, score: 0 }))
  }

  const results = []
  for (const page of list) {
    const entry = indexed.get(page)
    let score = 0
    for (const token of tokens) {
      const tokenScore = scoreToken(token, entry)
      if (tokenScore === 0) {
        score = 0
        break
      }

      score += tokenScore
    }

    if (score > 0) {
      results.push({ page, score, section: bestSection(tokens, entry) })
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

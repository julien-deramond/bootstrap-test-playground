// The upstream status of each reproduction, which its page declares in
// `<meta name="playground-upstream" content="twbs/bootstrap#42754"
// data-status="reported" data-tracking="julien-deramond/bootstrap-test-playground#303">`,
// and keeps in line with its tracking issue's label (see "Upstream issue
// tracking" in CLAUDE.md):
//
//   upstream           → unreported
//   upstream-reported  → reported
//   upstream-fixed     → fixed
//
// An empty `content` takes the twbs/bootstrap item of the tracking issue's
// first "Reported upstream" comment. A reference already there stays: the page
// may name a pull request rather than the issue on purpose.
//
// Shared by check-issues and the status sweep, which update the pages, and by
// scripts/lib/pages.mjs, which reads them for the home page. Node built-ins
// only: the sweep's workflow runs without npm install.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const issuesDir = path.join(root, 'issues')

export const LABEL_STATUS = { upstream: 'unreported', 'upstream-reported': 'reported', 'upstream-fixed': 'fixed' }
export const UPSTREAM_LABELS = Object.keys(LABEL_STATUS)
export const STATUSES = Object.values(LABEL_STATUS)

const UPSTREAM = 'twbs/bootstrap'
const UPSTREAM_REF = new RegExp(String.raw`(?:${UPSTREAM}#|github\.com/${UPSTREAM}/(?:issues|pull)/)(\d+)`, 'g')

// The twbs/bootstrap items an issue's "Reported upstream" comments link to,
// in the order of the comments.
export const reportedRefs = comments => [...new Set(comments
  .filter(comment => /reported upstream/i.test(comment.body))
  .flatMap(comment => [...comment.body.matchAll(UPSTREAM_REF)].map(match => Number(match[1]))))]

const META = /<meta name="playground-upstream"[^>]*>/
const attribute = (tag, name) => tag.match(new RegExp(String.raw`\s${name}="([^"]*)"`))?.[1]

// `{ upstream, status, tracking }` from a page's HTML, or undefined without the tag.
export function readMeta(html) {
  const tag = html.match(META)?.[0]
  return tag && {
    upstream: (attribute(tag, 'content') ?? '').trim(),
    status: attribute(tag, 'data-status') ?? '',
    tracking: (attribute(tag, 'data-tracking') ?? '').trim()
  }
}

// The page with the tag's `content` and `data-status` set.
function writeMeta(html, { upstream, status }) {
  return html.replace(META, tag => {
    for (const [name, value] of [['content', upstream], ['data-status', status]]) {
      if (value === undefined) {
        continue
      }

      tag = attribute(tag, name) === undefined ?
        tag.replace(/\s*\/?>$/, end => ` ${name}="${value}"${end}`) :
        tag.replace(new RegExp(String.raw`(\s${name}=")[^"]*"`), `$1${value}"`)
    }

    return tag
  })
}

// The reproductions: issues/<name>/ with an index.html.
export function listReproductions() {
  return fs.existsSync(issuesDir) ?
    fs.readdirSync(issuesDir).filter(name => fs.existsSync(path.join(issuesDir, name, 'index.html')))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) :
    []
}

export const readReproductionMeta = name => readMeta(fs.readFileSync(path.join(issuesDir, name, 'index.html'), 'utf8'))

// Whether a page needs its tracking issue's comments: an empty `content` to fill.
export const needsRefs = (meta, label) => !meta.upstream && ['upstream-reported', 'upstream-fixed'].includes(label)

// Brings issues/<name>/index.html in line with its tracking issue: `label`, its
// upstream label, and `refs`, its reportedRefs(). Returns the changes, like
// `['data-status: unreported → reported']`, and writes them when `write`.
export function syncReproduction(name, { label, refs = [] }, { write = true } = {}) {
  const file = path.join(issuesDir, name, 'index.html')
  const html = fs.readFileSync(file, 'utf8')
  const meta = readMeta(html)
  const status = LABEL_STATUS[label]
  if (!meta || !status) {
    return []
  }

  const next = {}
  const changes = []
  if (meta.status !== status) {
    next.status = status
    changes.push(`data-status: ${meta.status || '(none)'} → ${status}`)
  }

  if (needsRefs(meta, label) && refs.length > 0) {
    next.upstream = `${UPSTREAM}#${refs[0]}`
    changes.push(`content: → ${next.upstream}`)
  }

  if (changes.length > 0 && write) {
    fs.writeFileSync(file, writeMeta(html, next))
  }

  return changes
}

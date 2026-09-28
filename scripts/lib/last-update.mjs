// The record of the last Bootstrap update, updates/last-update.json: which
// commits it spans and which kitchen sink examples it changed. The home page
// lists it, and kitchen sink pages mark the changed sections (src/js/).
// Written by `npm run update-bootstrap` and the nightly canary, and committed
// with the update, so the deployed playground has it too.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'
import { collectPages } from './pages.mjs'

export const LAST_UPDATE_FILE = path.join(root, 'updates/last-update.json')

// sync-kitchen-sink indents each section by six spaces; an example can hold a
// <section> of its own, deeper.
const SECTION = /<section class="bd-kitchen-sink-section" aria-labelledby="([^"]+)">([\s\S]*?)\n {6}<\/section>/g

// `id` → the section's example markup, without its playground heading.
const sections = html => new Map([...html.matchAll(SECTION)].map(([, id, body]) => [id, body.replace(/<h2\b[\s\S]*?<\/h2>/, '').trim()]))

// Kitchen sink sections whose markup differs from `base` (a git ref): the
// docs examples the sync added or changed. `[{ url, id, markup: 'added' | 'changed' }]`.
export function markupChanges(base = 'HEAD') {
  const changes = []
  for (const file of fs.readdirSync(path.join(root, 'kitchen-sink')).filter(name => name.endsWith('.html')).sort()) {
    const relative = `kitchen-sink/${file}`
    const before = spawnSync('git', ['show', `${base}:${relative}`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
    const old = sections(before.status === 0 ? before.stdout : '')
    for (const [id, body] of sections(fs.readFileSync(path.join(root, relative), 'utf8'))) {
      if (old.get(id) !== body) {
        changes.push({ url: `/${relative}`, id, markup: old.has(id) ? 'changed' : 'added' })
      }
    }
  }

  return changes
}

// Examples that render differently, from diff-bootstrap's report for the same
// two commits: `[{ url, id, pixels }]`, or `null` when there's no report.
export function renderChanges(from, to) {
  const file = path.join(root, 'reports/diff', `${from.slice(0, 7)}-${to.slice(0, 7)}`, 'changes.json')
  if (!fs.existsSync(file)) {
    return null
  }

  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  return report.screens ? report.shots.map(({ url, id, pixels }) => ({ url, id, pixels })) : null
}

// Writes updates/last-update.json. `commits` comes from upstreamCommits().
export function writeLastUpdate({ from, to, pr, commits, base = 'HEAD' }) {
  const rendering = renderChanges(from, to)
  const titles = new Map(collectPages('/').find(({ dir }) => dir === 'kitchen-sink').pages
    .flatMap(({ url, title, sections: list }) => list.map(section => [`${url}#${section.id}`, { page: title, example: section.title }])))

  const order = new Map([...titles.keys()].map((key, index) => [key, index]))

  const examples = new Map()
  for (const change of [...markupChanges(base), ...(rendering ?? [])]) {
    const key = `${change.url}#${change.id}`
    examples.set(key, { url: change.url, id: change.id, ...titles.get(key), ...examples.get(key), ...change })
  }

  const record = {
    date: new Date().toISOString(),
    from,
    to,
    ...(pr ? { pr } : {}),
    commits: commits?.map(({ sha, subject }) => ({ sha, subject })) ?? null,
    // Whether diff-bootstrap compared the screenshots: without it, only markup changes are listed.
    rendering: rendering !== null,
    // In page order, then section order.
    examples: [...examples.values()].sort((a, b) => (order.get(`${a.url}#${a.id}`) ?? Infinity) - (order.get(`${b.url}#${b.id}`) ?? Infinity))
  }

  fs.mkdirSync(path.dirname(LAST_UPDATE_FILE), { recursive: true })
  fs.writeFileSync(LAST_UPDATE_FILE, `${JSON.stringify(record, null, 2)}\n`)
  return record
}

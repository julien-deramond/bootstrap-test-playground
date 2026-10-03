// Every page of the playground, read from the HTML files themselves. Shared by
// vite.config.js (build entries, `virtual:playground-pages`) and the Playwright
// suites in tests/.
import fs from 'node:fs'
import path from 'node:path'
import { pageClasses } from './class-index.mjs'
import { root } from './configs.mjs'
import { STATUSES, readMeta } from './repro-status.mjs'

// Folders scanned for pages. Every `.html` file inside becomes a Vite entry.
export const PAGE_GROUPS = [
  { dir: 'pages', label: 'Starter screens', description: 'Bootstrap’s own examples, adapted to v6.' },
  { dir: 'screens', label: 'Real screens', description: 'Application screens ported from shadcn/ui and rebuilt with v6 components.' },
  // Tagged with their docs section (components, forms), from the file name.
  { dir: 'kitchen-sink', label: 'Kitchen sink', description: 'Every live example from the docs, one page per component or form control.', tags: file => [path.basename(file).split('-')[0]] },
  { dir: 'issues', label: 'Issue reproductions', description: 'Isolated reproductions. Each one compiles its own copy of Bootstrap.' }
]

// Group names that page titles repeat, like "Kitchen sink: Button".
const TITLE_PREFIX = /^(?:kitchen sink|screens):\s*/i
const TITLE_SUFFIX = /:\s*issue reproduction$/i

export function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

const decodeEntities = value => value
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" })[name])

const plainText = html => decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()

// Metadata shown and searched on the home page and in the page switcher:
// - <title>, without the group prefix
// - <meta name="description">, or the header's lead paragraph (`.fs-lg`)
// - <meta name="playground-tags" content="forms, auth">
// - <meta name="playground-source">, see the toolbar
// - <meta name="playground-upstream">, a reproduction's upstream status, its
//   upstream issue and its tracking issue (see repro-status.mjs)
// - every <h2 id="…">, so a search can jump straight to an example
// - the "Docs source" link of kitchen sink pages
// - with `bootstrapClasses`, the Bootstrap classes its markup uses (see class-index.mjs)
function readPage(file, bootstrapClasses) {
  const html = fs.readFileSync(file, 'utf8')
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? ''
  const meta = name => head.match(new RegExp(`<meta name="${name}"[^>]*>`, 'i'))?.[0]
  const attribute = (tag, name) => tag?.match(new RegExp(`${name}="([^"]*)"`))?.[1]

  const title = plainText(head.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '') || path.basename(file, '.html')
  const lead = html.match(/<p class="[^"]*\bfs-lg\b[^"]*">([\s\S]*?)<\/p>/i)?.[1]
  const sourceTag = meta('playground-source')
  const docs = html.match(/<a href="([^"]*)">Docs source<\/a>/)?.[1]
  const upstream = readMeta(head)

  return {
    title: title.replace(TITLE_PREFIX, '').replace(TITLE_SUFFIX, ''),
    description: decodeEntities(attribute(meta('description'), 'content') ?? '') || (lead ? plainText(lead) : ''),
    tags: [...new Set((attribute(meta('playground-tags'), 'content') ?? '').split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))],
    source: sourceTag ? { label: decodeEntities(attribute(sourceTag, 'content')), url: attribute(sourceTag, 'data-url') } : undefined,
    sections: [...html.matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi)].map(([, id, heading]) => ({ id, title: plainText(heading) })),
    ...(docs ? { docs } : {}),
    ...(upstream ? { repro: { status: STATUSES.includes(upstream.status) ? upstream.status : '', upstream: upstream.upstream, tracking: upstream.tracking } } : {}),
    ...(bootstrapClasses ? { classes: pageClasses(html, bootstrapClasses) } : {})
  }
}

export function collectPages(base, { bootstrapClasses } = {}) {
  return PAGE_GROUPS.map(({ dir, label, description, tags }) => ({
    label,
    dir,
    description,
    pages: findHtmlFiles(path.join(root, dir)).map(file => {
      const url = base + path.relative(root, file).split(path.sep).join('/')
      const page = readPage(file, bootstrapClasses)
      return { url: url.replace(/index\.html$/, ''), ...page, tags: [...new Set([...page.tags, ...(tags?.(file) ?? [])])] }
    })
  }))
}

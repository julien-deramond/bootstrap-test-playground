import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { listConfigs } from './scripts/lib/configs.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))

// Folders scanned for pages. Every `.html` file inside becomes a Vite entry.
const PAGE_GROUPS = [
  { dir: 'pages', label: 'Starter screens', description: 'Bootstrap’s own examples, adapted to v6.' },
  { dir: 'screens', label: 'Real screens', description: 'Application screens ported from shadcn/ui and rebuilt with v6 components.' },
  // Tagged with their docs section (components, forms), from the file name.
  { dir: 'kitchen-sink', label: 'Kitchen sink', description: 'Every live example from the docs, one page per component or form control.', tags: file => [path.basename(file).split('-')[0]] },
  { dir: 'issues', label: 'Issue reproductions', description: 'Isolated reproductions. Each one compiles its own copy of Bootstrap.' }
]

// Group names that page titles repeat, like "Kitchen sink: Button".
const TITLE_PREFIX = /^(?:kitchen sink|screens):\s*/i
const TITLE_SUFFIX = /:\s*issue reproduction$/i

function findHtmlFiles(dir) {
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
// - every <h2 id="…">, so a search can jump straight to an example
function readPage(file) {
  const html = fs.readFileSync(file, 'utf8')
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? ''
  const meta = name => head.match(new RegExp(`<meta name="${name}"[^>]*>`, 'i'))?.[0]
  const attribute = (tag, name) => tag?.match(new RegExp(`${name}="([^"]*)"`))?.[1]

  const title = plainText(head.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '') || path.basename(file, '.html')
  const lead = html.match(/<p class="[^"]*\bfs-lg\b[^"]*">([\s\S]*?)<\/p>/i)?.[1]
  const sourceTag = meta('playground-source')

  return {
    title: title.replace(TITLE_PREFIX, '').replace(TITLE_SUFFIX, ''),
    description: decodeEntities(attribute(meta('description'), 'content') ?? '') || (lead ? plainText(lead) : ''),
    tags: [...new Set((attribute(meta('playground-tags'), 'content') ?? '').split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))],
    source: sourceTag ? { label: decodeEntities(attribute(sourceTag, 'content')), url: attribute(sourceTag, 'data-url') } : undefined,
    sections: [...html.matchAll(/<h2[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi)].map(([, id, heading]) => ({ id, title: plainText(heading) }))
  }
}

function collectPages() {
  return PAGE_GROUPS.map(({ dir, label, description, tags }) => ({
    label,
    dir,
    description,
    pages: findHtmlFiles(path.join(root, dir)).map(file => {
      const url = '/' + path.relative(root, file).split(path.sep).join('/')
      const page = readPage(file)
      return { url: url.replace(/index\.html$/, ''), ...page, tags: [...new Set([...page.tags, ...(tags?.(file) ?? [])])] }
    })
  }))
}

// Where Bootstrap comes from: the `v6-dev` branch installed from GitHub in
// node_modules (default), or a local checkout when BOOTSTRAP_PATH is set.
function bootstrapSource(env) {
  if (env.BOOTSTRAP_PATH) {
    const dir = path.resolve(root, env.BOOTSTRAP_PATH)
    if (!fs.existsSync(path.join(dir, 'scss/bootstrap.scss'))) {
      throw new Error(`BOOTSTRAP_PATH="${env.BOOTSTRAP_PATH}" does not point to a Bootstrap checkout (${dir})`)
    }

    return { dir, label: `local checkout: ${dir}` }
  }

  let label = 'node_modules/bootstrap'
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
    const resolved = lock.packages?.['node_modules/bootstrap']?.resolved ?? ''
    const sha = resolved.split('#')[1]
    if (sha) {
      label = `twbs/bootstrap#v6-dev @ ${sha.slice(0, 9)}`
    }
  } catch {}

  return { dir: null, label }
}

// Exposes two virtual modules:
// - `virtual:playground-pages`: every page, for the home and compare pages
// - `virtual:playground-configs`: every saved config in configs/, with the URLs
//   of its compiled `main.scss` and `tokens.css` (hashed assets in builds)
function playgroundData() {
  const modules = {
    'virtual:playground-pages': () => `export default ${JSON.stringify(collectPages())}`,
    'virtual:playground-configs': () => {
      const configs = listConfigs()
      const imports = configs.map(({ name }, index) => [
        `import main${index} from '/configs/${name}/main.scss?url'`,
        `import tokens${index} from '/configs/${name}/tokens.css?url'`
      ].join('\n')).join('\n')
      const entries = configs.map(({ name, description }, index) =>
        `{ name: ${JSON.stringify(name)}, description: ${JSON.stringify(description)}, main: main${index}, tokens: tokens${index} }`)
      return `${imports}\nexport default [${entries.join(', ')}]`
    }
  }

  return {
    name: 'playground-data',
    resolveId: source => (source in modules ? '\0' + source : null),
    load: id => (id.startsWith('\0') ? modules[id.slice(1)]?.() ?? null : null),
    configureServer(server) {
      const invalidate = () => {
        for (const id of Object.keys(modules)) {
          const mod = server.moduleGraph.getModuleById('\0' + id)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
        }
      }

      // Reload when pages or configs are added, renamed or removed.
      const refresh = file => {
        const relative = path.relative(root, file)
        if (!file.endsWith('.html') && !relative.startsWith('configs')) {
          return
        }

        invalidate()
        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('unlinkDir', refresh)
      server.watcher.on('change', file => {
        if (file.endsWith('README.md') && path.relative(root, file).startsWith('configs')) {
          refresh(file)
        } else if (file.endsWith('.html')) {
          // A page's title, description or tags may have changed. The next
          // load picks them up; the edited page reloads on its own.
          invalidate()
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const bootstrap = bootstrapSource(env)

  // Same floors as Bootstrap's `.browserslistrc`. Lower targets make Lightning
  // CSS rewrite `light-dark()` during minification, which breaks `data-bs-theme`.
  const cssTarget = ['chrome130', 'edge130', 'firefox132', 'safari18']

  const input = {
    main: path.join(root, 'index.html'),
    compare: path.join(root, 'compare.html'),
    ...Object.fromEntries(PAGE_GROUPS.flatMap(({ dir }) =>
      findHtmlFiles(path.join(root, dir)).map(file => [path.relative(root, file).replace(/\.html$/, ''), file])
    ))
  }

  return {
    appType: 'mpa',
    define: {
      __BOOTSTRAP_SOURCE__: JSON.stringify(bootstrap.label)
    },
    resolve: {
      alias: bootstrap.dir ?
        [
          { find: /^bootstrap$/, replacement: path.join(bootstrap.dir, 'js/dist/index.js') },
          { find: /^bootstrap\//, replacement: `${bootstrap.dir}/` }
        ] :
        [],
      // Always use this project's copies of Bootstrap's peer dependencies, even
      // when Bootstrap itself comes from a local checkout.
      dedupe: ['@floating-ui/dom', 'vanilla-calendar-pro']
    },
    css: {
      devSourcemap: true
    },
    server: {
      // PORT lets tools that manage dev servers pick a free port.
      port: Number(process.env.PORT) || 5173,
      fs: {
        allow: [root, ...(bootstrap.dir ? [bootstrap.dir] : [])]
      }
    },
    build: {
      target: cssTarget,
      cssTarget,
      rolldownOptions: { input }
    },
    plugins: [playgroundData()]
  }
})

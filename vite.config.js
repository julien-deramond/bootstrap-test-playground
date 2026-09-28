import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { bootstrapSource, gitDir } from './scripts/lib/bootstrap.mjs'
import { readBootstrapIndex } from './scripts/lib/class-index.mjs'
import { CATEGORIES, listConfigs, readKnownGaps } from './scripts/lib/configs.mjs'
import { docsDir, SECTIONS, syncPage } from './scripts/lib/kitchen-sink.mjs'
import { collectPages, findHtmlFiles, PAGE_GROUPS } from './scripts/lib/pages.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))

// Pages link to each other with root-relative URLs (`href="/pages/…"`). Vite
// prefixes the assets it processes with `base`, but not links, so builds
// served from a subfolder (GitHub Pages) prefix the remaining ones here.
function prefixRootUrls(base) {
  return {
    name: 'prefix-root-urls',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: html => html.replace(/\b(href|src|action)="\/(?!\/)([^"]*)"/g, (match, attribute, url) =>
        ('/' + url).startsWith(base) ? match : `${attribute}="${base}${url}"`)
    }
  }
}

// Every page loads public/playground-prefs.js first in its <head>. This inlines
// it: in WebKit, an external classic script there gives a page with a drop-down
// `<select>` a `getComputedStyle(document.body)` that inherits nothing from
// `<html>` (no tokens, default font and color), although the page renders fine,
// so checks that read the body's style fail. An inline script doesn't. See #240.
function inlinePrefsScript() {
  const tag = '<script src="/playground-prefs.js"></script>'
  const file = path.join(root, 'public/playground-prefs.js')

  return {
    name: 'inline-prefs-script',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(tag)) {
          return html
        }

        const code = fs.readFileSync(file, 'utf8')
        if (/<\/script|<!--/i.test(code)) {
          throw new Error('public/playground-prefs.js can\'t contain "</script" or "<!--" once inlined')
        }

        return html.replace(tag, () => `<script>\n${code}</script>`)
      }
    }
  }
}

// Vite replaces `<link data-playground-styles="main" href="/src/styles/main.scss">`
// with a bare link to the compiled asset, which breaks config switching in
// builds. This puts the attribute back on the matching compiled link.
function keepStyleMarkers() {
  return {
    name: 'keep-style-markers',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, { filename }) {
        const source = fs.readFileSync(filename, 'utf8')
        for (const [link] of source.matchAll(/<link\b[^>]*\bdata-playground-styles="[^"]*"[^>]*>/g)) {
          const key = link.match(/data-playground-styles="([^"]*)"/)[1]
          const name = path.parse(link.match(/href="([^"]*)"/)[1]).name
          html = html.replace(new RegExp(`<link rel="stylesheet"(?=[^>]*href="[^"]*/assets/${name}-[\\w-]+\\.css")`), `$& data-playground-styles="${key}"`)
        }

        return html
      }
    }
  }
}

// Exposes two virtual modules:
// - `virtual:playground-pages`: every page, for the home and compare pages and
//   the page switcher, with the Bootstrap classes its markup uses. `tokens`
//   maps each component token (`alert-padding-x`) to the classes declaring it,
//   the ones pages use, so a search for the token finds them.
// - `virtual:playground-configs`: every saved config in configs/, with its
//   description, category, known gaps and whether it's tokens only (from its
//   README.md and files), and the URLs of its compiled `main.scss` and
//   `tokens.css` (hashed assets in builds). `categories` lists the categories
//   in order.
function playgroundData(base, bootstrapDir) {
  const modules = {
    'virtual:playground-pages': () => {
      const { classes, tokens } = readBootstrapIndex(bootstrapDir)
      const groups = collectPages(base, { bootstrapClasses: classes })
      const used = new Set(groups.flatMap(({ pages }) => pages.flatMap(page => page.classes.map(([name]) => name))))
      const tokenClasses = Object.fromEntries([...tokens]
        .map(([name, owners]) => [name, [...owners].filter(owner => used.has(owner))])
        .filter(([, owners]) => owners.length > 0))
      return `export const tokens = ${JSON.stringify(tokenClasses)}\nexport default ${JSON.stringify(groups)}`
    },
    'virtual:playground-configs': () => {
      const configs = listConfigs()
      const imports = configs.map(({ name }, index) => [
        `import main${index} from '/configs/${name}/main.scss?url'`,
        `import tokens${index} from '/configs/${name}/tokens.css?url'`
      ].join('\n')).join('\n')
      const entries = configs.map(({ name, ...data }, index) =>
        `{ ...${JSON.stringify({ name, ...data, gaps: readKnownGaps(path.join(root, 'configs', name)) })}, main: main${index}, tokens: tokens${index} }`)
      return `${imports}\nexport const categories = ${JSON.stringify(CATEGORIES)}\nexport default [${entries.join(', ')}]`
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

// `virtual:bootstrap-source` describes where Bootstrap comes from, for the
// toolbar and the home page: `{ label, path, url, dirty }` (see
// scripts/lib/bootstrap.mjs). Its `onChange(listener)` hears updates in dev.
//
// With a BOOTSTRAP_PATH checkout, the dev server also:
// - reads the checkout's branch, commit and dirty state again when its git
//   metadata or a file the playground uses changes, and pushes the new label to
//   open pages, without a reload;
// - resyncs a kitchen sink page when its docs MDX file changes, like
//   `npm run sync-kitchen-sink` for that page only. Vite then reloads it.
function bootstrapSourceData(env, initial) {
  const id = 'virtual:bootstrap-source'
  let source = initial
  const code = () => `const source = ${JSON.stringify({ label: source.label, path: source.path, url: source.url, dirty: source.dirty })}
const listeners = new Set()
export const onChange = listener => listeners.add(listener)
if (import.meta.hot) {
  import.meta.hot.on('playground:bootstrap-source', data => {
    Object.assign(source, data)
    for (const listener of listeners) listener(source)
  })
}
export default source`

  return {
    name: 'bootstrap-source',
    resolveId: request => (request === id ? '\0' + id : null),
    load: request => (request === '\0' + id ? code() : null),
    configureServer(server) {
      const dir = source.dir
      if (!dir) {
        return
      }

      let timer
      const refresh = () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const next = bootstrapSource(env)
          if (next.label === source.label && next.url === source.url && next.dirty === source.dirty) {
            return
          }

          source = next
          const mod = server.moduleGraph.getModuleById('\0' + id)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }

          server.config.logger.info(`Bootstrap source: ${source.label}`, { timestamp: true })
          server.ws.send({ type: 'custom', event: 'playground:bootstrap-source', data: { label: source.label, url: source.url, dirty: source.dirty } })
        }, 300)
      }

      // Vite's watcher ignores .git/, so git metadata (HEAD, index, refs
      // written by checkout, commit, stash…) gets a watcher of its own.
      const git = gitDir(dir)
      if (git) {
        const watcher = fs.watch(git, (event, file) => {
          if (!file?.endsWith('.lock')) {
            refresh()
          }
        })
        server.httpServer?.on('close', () => watcher.close())
      }

      const docs = docsDir(dir)
      const watchDocs = fs.existsSync(docs)
      if (watchDocs) {
        server.watcher.add(SECTIONS.map(({ dir: section }) => path.join(docs, section)))
      }

      const onFile = file => {
        if (!file.startsWith(dir + path.sep)) {
          return
        }

        refresh()
        const mdx = path.relative(docs, file)
        const [section, name, ...rest] = mdx.split(path.sep)
        if (!watchDocs || rest.length > 0 || !name?.endsWith('.mdx') || !SECTIONS.some(entry => entry.dir === section)) {
          return
        }

        try {
          const { written, removed, skipped } = syncPage(dir, mdx)
          const files = [...written, ...removed.map(entry => `${entry} (removed)`)].map(entry => path.relative(root, entry))
          server.config.logger.info(`Kitchen sink: ${mdx} → ${files.length > 0 ? files.join(', ') : 'unchanged'}`, { timestamp: true })
          for (const line of skipped) {
            server.config.logger.warn(line, { timestamp: true })
          }
        } catch (error) {
          server.config.logger.error(`Kitchen sink: could not sync ${mdx}: ${error.message}`, { timestamp: true })
        }
      }

      server.watcher.on('add', onFile)
      server.watcher.on('change', onFile)
      server.watcher.on('unlink', onFile)
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const bootstrap = bootstrapSource(env)
  // BASE_PATH serves a build from a subfolder, like `/repo-name/` on GitHub Pages.
  const base = env.BASE_PATH || '/'

  // Same floors as Bootstrap's `.browserslistrc`. Lower targets make Lightning
  // CSS rewrite `light-dark()` during minification, which breaks `data-bs-theme`.
  const cssTarget = ['chrome130', 'edge130', 'firefox132', 'safari18']

  const input = {
    main: path.join(root, 'index.html'),
    compare: path.join(root, 'compare.html'),
    matrix: path.join(root, 'matrix.html'),
    sizes: path.join(root, 'sizes.html'),
    ...Object.fromEntries(PAGE_GROUPS.flatMap(({ dir }) =>
      findHtmlFiles(path.join(root, dir)).map(file => [path.relative(root, file).replace(/\.html$/, ''), file])
    ))
  }

  return {
    appType: 'mpa',
    base,
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
    plugins: [inlinePrefsScript(), playgroundData(base, bootstrap.dir ?? undefined), bootstrapSourceData(env, bootstrap), keepStyleMarkers(), ...(base === '/' ? [] : [prefixRootUrls(base)])]
  }
})

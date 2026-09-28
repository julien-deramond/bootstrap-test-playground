import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { bootstrapSource } from './scripts/lib/bootstrap.mjs'
import { CATEGORIES, listConfigs, readKnownGaps } from './scripts/lib/configs.mjs'
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
// - `virtual:playground-pages`: every page, for the home and compare pages
// - `virtual:playground-configs`: every saved config in configs/, with its
//   description, category, known gaps and whether it's tokens only (from its
//   README.md and files), and the URLs of its compiled `main.scss` and
//   `tokens.css` (hashed assets in builds). `categories` lists the categories
//   in order.
function playgroundData(base) {
  const modules = {
    'virtual:playground-pages': () => `export default ${JSON.stringify(collectPages(base))}`,
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
    sizes: path.join(root, 'sizes.html'),
    ...Object.fromEntries(PAGE_GROUPS.flatMap(({ dir }) =>
      findHtmlFiles(path.join(root, dir)).map(file => [path.relative(root, file).replace(/\.html$/, ''), file])
    ))
  }

  return {
    appType: 'mpa',
    base,
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
    plugins: [playgroundData(base), keepStyleMarkers(), ...(base === '/' ? [] : [prefixRootUrls(base)])]
  }
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { listConfigs } from './scripts/lib/configs.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))

// Folders scanned for pages. Every `.html` file inside becomes a Vite entry.
const PAGE_GROUPS = [
  { dir: 'pages', label: 'Starter screens' },
  { dir: 'screens', label: 'Real screens' },
  { dir: 'kitchen-sink', label: 'Kitchen sink' },
  { dir: 'issues', label: 'Issue reproductions' }
]

function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(entry.parentPath, entry.name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

function readTitle(file) {
  const match = fs.readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/i)
  return match ? match[1].trim() : path.basename(file, '.html')
}

function readSource(file) {
  const tag = fs.readFileSync(file, 'utf8').match(/<meta name="playground-source"[^>]*>/i)?.[0]
  const attribute = name => tag?.match(new RegExp(`${name}="([^"]*)"`))?.[1]
  return tag ? { label: attribute('content'), url: attribute('data-url') } : undefined
}

function collectPages() {
  return PAGE_GROUPS.map(({ dir, label }) => ({
    label,
    dir,
    pages: findHtmlFiles(path.join(root, dir)).map(file => {
      const url = '/' + path.relative(root, file).split(path.sep).join('/')
      return { url: url.replace(/index\.html$/, ''), title: readTitle(file), source: readSource(file) }
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
      // Reload when pages or configs are added, renamed or removed.
      const refresh = file => {
        const relative = path.relative(root, file)
        if (!file.endsWith('.html') && !relative.startsWith('configs')) {
          return
        }

        for (const id of Object.keys(modules)) {
          const mod = server.moduleGraph.getModuleById('\0' + id)
          if (mod) {
            server.moduleGraph.invalidateModule(mod)
          }
        }

        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', refresh)
      server.watcher.on('unlink', refresh)
      server.watcher.on('unlinkDir', refresh)
      server.watcher.on('change', file => {
        if (file.endsWith('README.md') && path.relative(root, file).startsWith('configs')) {
          refresh(file)
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
      port: 5173,
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

// Builds Bootstrap's dist files from its source, the way `npm run dist` does
// upstream, so everything that reads them follows the commit under test.
// Bootstrap only rebuilds its committed `dist/` and `js/dist/` for releases:
// between two, they lag behind `main`. Used by vite.config.js (`?css=dist`,
// `?js=dist`, the class index) and the check scripts (check-dist, check-size).
//
// It runs Bootstrap's own npm scripts and `build/` files at that commit, with
// this project's copies of the tools they call (Sass, PostCSS and its plugins,
// Lightning CSS, Rolldown, Terser), in a copy of the sources under
// .cache/dist/<key>/. The npm package doesn't ship `build/`: it comes from the
// checkout when there is one, or from a sparse fetch of the locked commit into
// .cache/bootstrap-build/<sha>/. The key hashes everything the build reads and
// this project's lockfile, so a build is reused until one of them changes.
import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'
import { REPO, lockedSha } from './upstream.mjs'

// Bootstrap's npm scripts behind `npm run dist`, minus the type declarations
// (`js-emit-types`) and the docs' utilities JSON (`css-docs`). Each list runs in
// order; the two run side by side, like `npm-run-all --parallel css js`.
const STEPS = [
  ['css-compile', 'css-prefix-main', 'css-minify-main'],
  ['js-compile-standalone', 'js-compile-bundle', 'js-compile-plugins', 'js-minify-standalone', 'js-minify-bundle']
]

// What those scripts read: the package's sources, and the build files that
// only a checkout has.
const SOURCES = ['package.json', '.browserslistrc', 'scss', 'js/src']
const BUILD_FILES = ['build', 'tsconfig.json']

const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options })

// A folder holding Bootstrap's `build/` for this source: the source itself
// when it's a checkout, else the locked commit, fetched once without the rest
// of the repository.
function buildFilesDir(bootstrapDir) {
  if (fs.existsSync(path.join(bootstrapDir, 'build'))) {
    return bootstrapDir
  }

  const sha = lockedSha()
  if (!sha) {
    throw new Error('Can\'t tell which Bootstrap commit node_modules holds: package-lock.json has no resolved commit for it.')
  }

  const dir = path.join(root, '.cache/bootstrap-build', sha)
  const full = path.join(root, '.cache/bootstrap', sha)
  if (fs.existsSync(path.join(full, 'build'))) {
    return full
  }

  if (fs.existsSync(path.join(dir, 'build'))) {
    return dir
  }

  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  const steps = [
    ['init', '-q'],
    ['remote', 'add', 'origin', REPO],
    ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', sha],
    ['sparse-checkout', 'set', '--no-cone', ...BUILD_FILES.map(file => `/${file}`)],
    ['checkout', '-q', 'FETCH_HEAD']
  ]
  for (const args of steps) {
    const result = run('git', args, { cwd: dir })
    if (result.status !== 0) {
      fs.rmSync(dir, { recursive: true, force: true })
      throw new Error(`git ${args.join(' ')} failed for ${sha}: ${result.stderr || result.error?.message}`)
    }
  }

  return dir
}

// Every file under `entries` (files or folders) relative to `dir`, sorted.
function listFiles(dir, entries) {
  return entries.flatMap(entry => {
    const file = path.join(dir, entry)
    if (!fs.existsSync(file)) {
      return []
    }

    if (!fs.statSync(file).isDirectory()) {
      return [entry]
    }

    return fs.readdirSync(file, { recursive: true, withFileTypes: true })
      .filter(item => item.isFile())
      .map(item => path.relative(dir, path.join(item.parentPath, item.name)))
  }).sort()
}

function hashFiles(hash, dir, files) {
  for (const file of files) {
    hash.update(`${file}\0`).update(fs.readFileSync(path.join(dir, file))).update('\0')
  }
}

function runScript(name, script, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', script], {
      cwd,
      env: { ...process.env, PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}` },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout.on('data', chunk => {
      output += chunk
    })
    child.stderr.on('data', chunk => {
      output += chunk
    })
    child.on('error', reject)
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`Bootstrap's \`${name}\` failed (${script}):\n${output.trim()}`))))
  })
}

// Resolves to a folder laid out like the package, with `dist/css`, `dist/js`
// and `js/dist` built from `bootstrapDir`'s sources.
export async function buildDist(bootstrapDir = path.join(root, 'node_modules/bootstrap')) {
  const buildDir = buildFilesDir(bootstrapDir)
  const sources = listFiles(bootstrapDir, SOURCES)
  const buildFiles = listFiles(buildDir, BUILD_FILES)
  const hash = crypto.createHash('sha256')
  hashFiles(hash, bootstrapDir, sources)
  hashFiles(hash, buildDir, buildFiles)
  hashFiles(hash, root, ['package-lock.json'])
  const out = path.join(root, '.cache/dist', hash.digest('hex').slice(0, 16))
  if (fs.existsSync(path.join(out, 'dist/js/bootstrap.bundle.min.js'))) {
    return out
  }

  const { scripts = {} } = JSON.parse(fs.readFileSync(path.join(bootstrapDir, 'package.json'), 'utf8'))
  const missing = STEPS.flat().filter(name => !scripts[name])
  if (missing.length > 0) {
    throw new Error(`Bootstrap's package.json has no ${missing.map(name => `\`${name}\``).join(', ')} script: its build changed, update STEPS in scripts/lib/dist.mjs.`)
  }

  // Built next to the final folder, then moved in place, so a parallel run
  // never sees half a build.
  const started = Date.now()
  const stage = `${out}.${process.pid}.tmp`
  fs.rmSync(stage, { recursive: true, force: true })
  for (const [dir, files] of [[bootstrapDir, sources], [buildDir, buildFiles]]) {
    for (const file of files) {
      fs.cpSync(path.join(dir, file), path.join(stage, file))
    }
  }

  try {
    await Promise.all(STEPS.map(async names => {
      for (const name of names) {
        await runScript(name, scripts[name], stage)
      }
    }))
    fs.renameSync(stage, out)
  } catch (error) {
    fs.rmSync(stage, { recursive: true, force: true })
    if (!fs.existsSync(path.join(out, 'dist/js/bootstrap.bundle.min.js'))) {
      throw error
    }
  }

  console.warn(`Built Bootstrap's dist from source in ${((Date.now() - started) / 1000).toFixed(1)}s: ${path.relative(root, out)}`)
  return out
}

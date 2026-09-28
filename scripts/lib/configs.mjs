// Shared helpers for configs: folders holding the three style files that shape
// Bootstrap here (src/styles/, configs/<name>/, issues/<name>/).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPrefix } from '../../postcss.config.js'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const configsDir = path.join(root, 'configs')
export const workingDir = path.join(root, 'src/styles')
export const STYLE_FILES = ['main.scss', '_custom.scss', 'tokens.css']
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/
export const REPOSITORY_URL = 'https://github.com/julien-deramond/bootstrap-test-playground'

export function configDir(name) {
  return path.join(configsDir, name)
}

export function listConfigs() {
  if (!fs.existsSync(configsDir)) {
    return []
  }

  return fs.readdirSync(configsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(configsDir, entry.name, 'main.scss')))
    .map(entry => {
      const dir = path.join(configsDir, entry.name)
      return { name: entry.name, description: readDescription(dir), tokensOnly: isTokensOnly(dir), colorModes: readColorModes(dir) }
    })
    .sort((a, b) => (a.name === 'default' ? -1 : b.name === 'default' ? 1 : a.name.localeCompare(b.name)))
}

// Every folder that compiles its own copy of Bootstrap: the working copy,
// then configs/<name>/ and issues/<name>/.
export function styleFolders() {
  return [
    workingDir,
    ...[configsDir, path.join(root, 'issues')].flatMap(dir => (fs.existsSync(dir) ?
      fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'main.scss')))
        .map(entry => path.join(dir, entry.name))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) :
      []))
  ]
}

function readReadme(dir) {
  const readme = path.join(dir, 'README.md')
  return fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : ''
}

// First paragraph of the config's README.md, if any.
export function readDescription(dir) {
  const paragraph = readReadme(dir).split(/\n\s*\n/).find(block => block.trim() && !/^(#|<!--)/.test(block.trim()))
  return paragraph ? paragraph.replace(/\s+/g, ' ').trim() : ''
}

// Body of a `## <heading>` section of the config's README.md, comments removed.
export function readSection(dir, heading) {
  const sections = readReadme(dir).split(/^## /m).slice(1)
  const section = sections.find(text => text.split('\n', 1)[0].trim().toLowerCase() === heading.toLowerCase())
  return section ? section.slice(section.indexOf('\n') + 1).replace(/<!--[\s\S]*?-->/g, '').trim() : ''
}

// Tracking issues of this repository linked from the README's "Known gaps".
export function readKnownGaps(dir) {
  const pattern = new RegExp(`${REPOSITORY_URL}/issues/(\\d+)`, 'g')
  return [...new Set([...readSection(dir, 'Known gaps').matchAll(pattern)].map(match => Number(match[1])))]
}

// Custom color modes a config defines, besides light and dark: the names in
// its `[data-bs-theme="…"]` selectors and `color-mode(…)` calls, comments
// aside. The toolbar offers them next to Auto, Light and Dark.
export function readColorModes(dir) {
  const modes = new Set()
  for (const file of STYLE_FILES) {
    const source = path.join(dir, file)
    if (!fs.existsSync(source)) {
      continue
    }

    const code = fs.readFileSync(source, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const [, attribute, mixin] of code.matchAll(/data-bs-theme="([\w-]+)"|color-mode\(\s*"?([\w-]+)/g)) {
      const name = attribute ?? mixin
      if (!['light', 'dark'].includes(name)) {
        modes.add(name)
      }
    }
  }

  return [...modes]
}

// The Bootstrap partials a config's main.scss loads (`root`, `forms`,
// `utilities/api`…), or null when it loads all of Bootstrap through
// `bootstrap/scss/bootstrap`, as most do. configs/partial/ loads a few.
export function readPartials(dir) {
  const code = fs.readFileSync(path.join(dir, 'main.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const partials = [...code.matchAll(/@use\s+["']bootstrap\/scss\/([\w/-]+)["']/g)].map(match => match[1])
  return partials.includes('bootstrap') ? null : partials
}

// A config whose main.scss and _custom.scss don't differ from the default's,
// comments aside, only changes tokens.css: it also applies on top of the
// prebuilt dist (?css=dist), where Sass can't reach. A config that changes the
// custom property prefix doesn't: dist keeps `--bs-`.
export function isTokensOnly(dir) {
  if (readPrefix(fs.readFileSync(path.join(dir, 'main.scss'), 'utf8')) !== undefined) {
    return false
  }

  const code = file => (fs.existsSync(file) ?
    fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s+/g, ' ').trim() :
    '')

  return ['main.scss', '_custom.scss'].every(file => code(path.join(dir, file)) === code(path.join(configDir('default'), file)))
}

// The table of configs in configs/README.md, generated from their READMEs.
const START = '<!-- configs-table:start (generated by npm run configs-table) -->'
const END = '<!-- configs-table:end -->'

// Escapes what would break a table cell.
const tableCell = text => text.replace(/\|/g, '\\|')

function configsTable() {
  const rows = listConfigs().map(({ name, description, tokensOnly }) => {
    const gaps = readKnownGaps(configDir(name)).map(issue => `[#${issue}](${REPOSITORY_URL}/issues/${issue})`).join(', ')
    return `| [\`${name}\`](${name}/) | ${tableCell(description)} | ${gaps || '–'} | ${tokensOnly ? 'Yes' : 'No'} |`
  })

  return [
    START,
    '',
    '| Config | Description | Known gaps | Tokens only |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    END
  ].join('\n')
}

// Replaces the generated block of configs/README.md, or appends it.
export function updateConfigsReadme({ check = false } = {}) {
  const readme = path.join(configsDir, 'README.md')
  const current = fs.readFileSync(readme, 'utf8')
  const table = configsTable()
  const start = current.indexOf(START)
  const end = current.indexOf(END)
  const next = start === -1 || end === -1 ?
    `${current.trimEnd()}\n\n${table}\n` :
    current.slice(0, start) + table + current.slice(end + END.length)

  if (!check && next !== current) {
    fs.writeFileSync(readme, next)
  }

  return next !== current
}

export function copyStyles(fromDir, toDir, transform = content => content) {
  fs.mkdirSync(toDir, { recursive: true })
  for (const file of STYLE_FILES) {
    const source = path.join(fromDir, file)
    if (fs.existsSync(source)) {
      fs.writeFileSync(path.join(toDir, file), transform(fs.readFileSync(source, 'utf8'), file))
    }
  }
}

export function fail(message) {
  console.error(message)
  process.exit(1)
}

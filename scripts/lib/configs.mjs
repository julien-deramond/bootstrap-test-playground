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

// What a config customizes, in the order the toolbar, the home page and the
// configs table list them. A config picks one with a `Category: <id>` line
// in its README.md; without one, it lands in `other`.
export const CATEGORIES = [
  { id: 'baseline', label: 'Baseline', description: 'Bootstrap\'s defaults, the reference for every other config.' },
  { id: 'shape', label: 'Shape', description: 'Radii, from square corners to pills.' },
  { id: 'color', label: 'Color', description: 'Palettes, theme colors and color modes.' },
  { id: 'typography', label: 'Typography', description: 'Font families, the type scale, weights and the root font size.' },
  { id: 'layout', label: 'Layout and density', description: 'Breakpoints, containers, grids, spacing and control sizes.' },
  { id: 'options', label: 'Options', description: 'The `$enable-*` flags for shadows, motion, pointers and scrolling.' },
  { id: 'sass', label: 'Sass API and build', description: 'The custom property prefix, the utility API, mixins and functions, and partial imports.' },
  { id: 'themes', label: 'Themes', description: 'Complete looks that combine all of the above.' },
  { id: 'other', label: 'Other', description: 'Configs without a `Category:` line in their README.md.' }
]

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
      return { name: entry.name, description: readDescription(dir), category: readCategory(dir), tokensOnly: isTokensOnly(dir), colorModes: readColorModes(dir) }
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

// A README block that isn't the description: a heading, a comment or the
// `Category:` line.
export const isMetaBlock = block => /^(#|<!--|Category:)/.test(block.trim())

// First paragraph of the config's README.md, if any.
export function readDescription(dir) {
  const paragraph = readReadme(dir).split(/\n\s*\n/).find(block => block.trim() && !isMetaBlock(block))
  return paragraph ? paragraph.replace(/\s+/g, ' ').trim() : ''
}

const CATEGORY_LINE = /^Category:[ \t]*(\S*)[ \t]*$/m

// The id on the README's `Category:` line, as written: it may not be one of
// CATEGORIES (see unknownCategories). Empty when there's no such line.
export function readCategoryLine(dir) {
  return readReadme(dir).match(CATEGORY_LINE)?.[1] ?? ''
}

// The config's category id, `other` when it has none or an unknown one.
export function readCategory(dir) {
  const id = readCategoryLine(dir)
  return CATEGORIES.some(category => category.id === id) ? id : 'other'
}

// Configs whose `Category:` line names no category, for configs-table.
export function unknownCategories() {
  return listConfigs()
    .map(({ name }) => ({ name, id: readCategoryLine(configDir(name)) }))
    .filter(({ id }) => id && !CATEGORIES.some(category => category.id === id))
}

// Sets the README's `Category:` line, or adds it after the description.
export function writeCategory(readme, id) {
  const content = fs.readFileSync(readme, 'utf8')
  if (CATEGORY_LINE.test(content)) {
    fs.writeFileSync(readme, content.replace(CATEGORY_LINE, `Category: ${id}`))
    return
  }

  // Blocks and the blank lines between them, so the rest stays byte for byte.
  const parts = content.split(/(\n\s*\n)/)
  const index = parts.findIndex((part, i) => i % 2 === 0 && part.trim() && !isMetaBlock(part))
  parts.splice(index === -1 ? 1 : index + 1, 0, '\n\n', `Category: ${id}`)
  fs.writeFileSync(readme, parts.join(''))
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

// One table per category, in CATEGORIES order.
function configsTable() {
  const configs = listConfigs()
  const row = ({ name, description, tokensOnly }) => {
    const gaps = readKnownGaps(configDir(name)).map(issue => `[#${issue}](${REPOSITORY_URL}/issues/${issue})`).join(', ')
    return `| [\`${name}\`](${name}/) | ${tableCell(description)} | ${gaps || '–'} | ${tokensOnly ? 'Yes' : 'No'} |`
  }

  const sections = CATEGORIES.map(category => ({ ...category, configs: configs.filter(config => config.category === category.id) }))
    .filter(category => category.configs.length > 0)
    .flatMap(({ label, description, configs }) => [
      `### ${label}`,
      '',
      description,
      '',
      '| Config | Description | Known gaps | Tokens only |',
      '| --- | --- | --- | --- |',
      ...configs.map(row),
      ''
    ])

  return [START, '', ...sections, END].join('\n')
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

// Shared helpers for configs: folders holding the three style files that shape
// Bootstrap here (src/styles/, configs/<name>/, issues/<name>/).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const configsDir = path.join(root, 'configs')
export const workingDir = path.join(root, 'src/styles')
export const STYLE_FILES = ['main.scss', '_custom.scss', 'tokens.css']
export const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export function configDir(name) {
  return path.join(configsDir, name)
}

export function listConfigs() {
  if (!fs.existsSync(configsDir)) {
    return []
  }

  return fs.readdirSync(configsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(configsDir, entry.name, 'main.scss')))
    .map(entry => ({ name: entry.name, description: readDescription(path.join(configsDir, entry.name)) }))
    .sort((a, b) => (a.name === 'default' ? -1 : b.name === 'default' ? 1 : a.name.localeCompare(b.name)))
}

// First paragraph of the config's README.md, if any.
export function readDescription(dir) {
  const readme = path.join(dir, 'README.md')
  if (!fs.existsSync(readme)) {
    return ''
  }

  const paragraph = fs.readFileSync(readme, 'utf8').split(/\n\s*\n/).find(block => block.trim() && !block.trim().startsWith('#'))
  return paragraph ? paragraph.replace(/\s+/g, ' ').trim() : ''
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

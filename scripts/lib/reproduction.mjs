// Shared by the scripts that create issues/<name>/ (new-issue, import-issue):
// the template's placeholders, and the edits that fill it in.
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { bootstrapSource } from './bootstrap.mjs'
import { NAME_PATTERN, configDir, copyStyles, fail, listConfigs, root, workingDir } from './configs.mjs'

// Tracking issues live in this repository.
export const TRACKING_REPO = 'julien-deramond/bootstrap-test-playground'

export const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const isValidName = name => Boolean(name) && NAME_PATTERN.test(name)

// The folder a reproduction is created in and the config it copies. Fails when
// the config doesn't exist or the folder does.
export function resolveTarget(name, configName) {
  const sourceDir = configName === 'working' ? workingDir : configDir(configName)
  if (!configName || !fs.existsSync(path.join(sourceDir, 'main.scss'))) {
    fail(`Unknown config "${configName}". Available: working, ${listConfigs().map(config => config.name).join(', ')}`)
  }

  const targetDir = path.join(root, 'issues', name)
  if (fs.existsSync(targetDir)) {
    fail(`issues/${name}/ already exists.`)
  }

  return { sourceDir, targetDir }
}

// The template with its placeholders filled. `42928`: an upstream issue, so
// reported. `pg-12`: tracked here, not reported yet. Any other slug: neither,
// until the page's metadata says otherwise.
export function renderTemplate(name) {
  const isUpstream = /^\d+$/.test(name)
  const tracking = name.match(/^pg-(\d+)$/)?.[1]
  const { sha } = bootstrapSource(loadEnv('production', root, ''))
  return fs.readFileSync(path.join(root, 'scripts/templates/issue/index.html'), 'utf8')
    .replaceAll('__TITLE__', isUpstream ? `#${name}` : name)
    .replaceAll('__UPSTREAM__', isUpstream ? `twbs/bootstrap#${name}` : '')
    .replaceAll('__STATUS__', isUpstream ? 'reported' : 'unreported')
    .replaceAll('__TRACKING__', tracking ? `${TRACKING_REPO}#${tracking}` : '')
    .replaceAll('__COMMIT__', sha ?? '')
}

// Replaces one known part of the template, and fails loudly when the template
// no longer has it.
export function replaceOnce(source, from, to) {
  if (!source.includes(from)) {
    throw new Error(`The issue template changed: "${from.trim()}" not found`)
  }

  return source.replace(from, () => to)
}

export const STEP_PLACEHOLDER = '          <li>…</li>\n'
export const REPRO_PLACEHOLDER = '        <div data-playground-repro>\n          <button type="button" class="btn-solid theme-primary">Button</button>\n'

// Steps before the template's `…` one, each the HTML of an `<li>`.
export const addSteps = (html, steps) => replaceOnce(html, STEP_PLACEHOLDER, `${steps.map(step => `          <li>${step}</li>\n`).join('')}${STEP_PLACEHOLDER}`)

// The markup under test in the reproduction block, indented for it.
export const setMarkup = (html, markup, classes = []) => replaceOnce(html, REPRO_PLACEHOLDER,
  `        <div data-playground-repro${classes.length > 0 ? ` class="${classes.join(' ')}"` : ''}>\n${markup}\n`)

export const setTags = (html, tags) => replaceOnce(html, '<meta name="playground-tags" content="">', `<meta name="playground-tags" content="${tags}">`)

// Puts a kitchen sink example's markup in the reproduction block with its
// classes, its tags on the page, and a link to it in the steps. Some examples
// need the kitchen sink's own frame styles (`bd-example-drawer` shows drawers
// in place): the page then loads kitchen-sink.css too.
export function fromExample(html, { title, tags, heading, className, html: markup, url }) {
  const classes = className.split(/\s+/).filter(Boolean)
  const frame = classes.filter(entry => entry.startsWith('bd-'))
  if (frame.length > 0) {
    html = replaceOnce(html, '    <link rel="stylesheet" href="./tokens.css">\n', `    <link rel="stylesheet" href="./tokens.css">
    <!-- The example's frame styles from the kitchen sink (${frame.join(', ')}),
         outside Bootstrap. Remove them if the bug may come from there. -->
    <link rel="stylesheet" href="/kitchen-sink/kitchen-sink.css">\n`)
    console.log(`The example uses the kitchen sink's own styles (${frame.join(', ')}): the page loads kitchen-sink.css.`)
  }

  html = setTags(html, tags)
  html = addSteps(html, [`Start from the <a href="${url}">${title}: ${heading}</a> docs example, copied below.`])
  return setMarkup(html, markup, classes)
}

// Writes the page and the config's three style files, each through
// `transform(content, file)`.
export function writeReproduction({ sourceDir, targetDir, html, transform }) {
  copyStyles(sourceDir, targetDir, transform)
  fs.writeFileSync(path.join(targetDir, 'index.html'), html)
}

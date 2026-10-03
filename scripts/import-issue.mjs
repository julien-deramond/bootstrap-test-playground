#!/usr/bin/env node
// Creates issues/<n>/ from an upstream twbs/bootstrap issue or pull request:
// its title, summary, version, expected and actual behavior, demo links, and
// the code of its reduced test case.
// Usage: npm run import-issue <n> [-- --config <config>] [--force]
//
// The playground tests v6. An issue about v5 (a `v5` label, or a version
// starting with 5, and no `v6` label) is refused unless --force.
//
// The issue's content is untrusted. Its markup and styles are cleaned of what
// could run code or load from another site (each removal is listed in the
// page), its JavaScript is kept as inert text, and the page carries a
// `playground-imported` marker and a Content-Security-Policy. Builds fail while
// a page has the marker: review the page, then remove it. See "Importing an
// upstream issue" in docs/pages.md.

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { fail } from './lib/configs.mjs'
import { cleanCss, cleanHtml, cleanScss, closedIssues, codeBlocks, commentText, dedent, demoLinks, expectedActual, inertScript, readSections, sectionMatching, summary, versionOf } from './lib/issue-body.mjs'
import { listKitchenSinkTags } from './lib/kitchen-sink.mjs'
import { addSteps, escapeHtml, renderTemplate, replaceOnce, resolveTarget, setMarkup, setTags, writeReproduction } from './lib/reproduction.mjs'

const USAGE = 'Usage: npm run import-issue <twbs/bootstrap issue or pull request number> [-- --config <config>] [--force]   (e.g. npm run import-issue 42754)'

let values
let positionals
try {
  ({ values, positionals } = parseArgs({ options: { config: { type: 'string', default: 'default' }, force: { type: 'boolean', default: false } }, allowPositionals: true }))
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}

const number = positionals[0]?.replace(/^(twbs\/bootstrap)?#/, '')
if (!/^\d+$/.test(number ?? '')) {
  fail(USAGE)
}

const { sourceDir, targetDir } = resolveTarget(number, values.config)

function fetchIssue(n) {
  const result = spawnSync('gh', ['api', `repos/twbs/bootstrap/issues/${n}`], { encoding: 'utf8' })
  if (result.error) {
    fail(`import-issue needs the GitHub CLI (gh): ${result.error.message}`)
  }

  if (result.status !== 0) {
    fail(`Can't read twbs/bootstrap#${n}: ${result.stderr.trim()}`)
  }

  const issue = JSON.parse(result.stdout)
  return { number: n, title: issue.title ?? '', body: issue.body ?? '', labels: issue.labels.map(label => label.name), isPullRequest: Boolean(issue.pull_request) }
}

const issue = fetchIssue(number)
const sections = readSections(issue.body)
const { version, commit } = versionOf(sections, issue.body)

// v6 or not: upstream's version labels, then the version the issue form asks
// for. A pinned commit can't tell on its own.
const majorLabels = issue.labels.filter(label => /^v\d+$/.test(label))
const v6Evidence = issue.labels.some(label => /^v6\b/.test(label))
  ? `labeled ${issue.labels.filter(label => /^v6\b/.test(label)).join(', ')} upstream`
  : /^v?6\b|v6-dev/i.test(version) ? `reported on ${version}` : ''
const versionMajor = version.match(/^v?([1-5])\./)?.[1]
const otherMajor = v6Evidence ? '' : majorLabels[0] ?? (versionMajor ? `v${versionMajor}` : '')
if (otherMajor && !values.force) {
  fail(`twbs/bootstrap#${number} looks like a ${otherMajor} issue (${majorLabels.length > 0 ? `labeled ${majorLabels.join(', ')}` : `reported on ${version}`}), and the playground tests v6. Pass --force to import it anyway.`)
}

// The code: the issue form's "Reduced test cases" when it has some, else every
// block. A pull request rarely has any: then the code of the issue it closes.
const codeOf = ({ body }) => {
  const reduced = codeBlocks(sectionMatching(readSections(body), /reduced test case|reproduction|test case/))
  return (reduced.some(block => block.language) ? reduced : codeBlocks(body)).filter(block => block.language)
}

let blocks = codeOf(issue)
let codeSource = issue
if (issue.isPullRequest && blocks.length === 0) {
  const closed = closedIssues(issue.body)[0]
  const closedIssue = closed && fetchIssue(closed)
  const closedBlocks = closedIssue ? codeOf(closedIssue) : []
  if (closedBlocks.length > 0) {
    codeSource = closedIssue
    blocks = closedBlocks
  }
}

// --- What goes where --------------------------------------------------------

const removed = []
const bootstrapFiles = []
const markup = []
const css = []
const scss = []
const js = []
for (const block of blocks) {
  if (block.language === 'html') {
    const result = cleanHtml(block.code)
    if (result.markup) {
      markup.push(result.markup)
    }

    css.push(...result.css)
    js.push(...result.js)
    bootstrapFiles.push(...result.bootstrap)
    removed.push(...result.removed)
  } else if (block.language === 'css') {
    css.push(block.code)
  } else if (block.language === 'scss') {
    scss.push(block.code)
  } else if (block.language === 'js') {
    js.push(block.code)
  }
}

const cleanedCss = css.map(code => cleanCss(code, removed)).filter(Boolean).join('\n\n')
const cleanedScss = scss.map(code => cleanScss(code, removed))
const configBlock = cleanedScss.find(code => /^\s*@use\s+['"]bootstrap\/scss\/bootstrap['"]/m.test(code))
const otherScss = cleanedScss.filter(code => code !== configBlock)

const describe = sectionMatching(sections, /describe|description|summary/) || sections.get('') || issue.body
const description = summary(describe) || issue.title
const { expected, actual } = expectedActual(describe)
const demos = demoLinks(`${issue.body}\n${codeSource === issue ? '' : codeSource.body}`)

// Tags: the kitchen sink pages of the components the markup uses.
const classes = new Set(markup.join('\n').match(/\bclass="[^"]*"/g)?.flatMap(attribute => attribute.slice(7, -1).split(/\s+/)) ?? [])
const tags = new Set()
for (const { slug, tags: pageTags } of listKitchenSinkTags()) {
  if ([...classes].some(name => name === slug || name.startsWith(`${slug}-`))) {
    pageTags.forEach(tag => tags.add(tag))
  }
}

if (js.length > 0 || issue.labels.includes('js')) {
  tags.add('javascript')
}

// --- The page ---------------------------------------------------------------

const link = (reference, text) => `<a href="https://github.com/twbs/bootstrap/issues/${reference}">${escapeHtml(text)}</a>`
let html = renderTemplate(number)
html = replaceOnce(html, `<title>#${number}: Issue reproduction</title>`, `<title>#${number}: ${escapeHtml(issue.title)}</title>`)
html = replaceOnce(html, '<meta name="description" content="">', `<meta name="description" content="${escapeHtml(description)}">`)
html = setTags(html, [...tags].join(', ') || 'components')
html = replaceOnce(html, `<h1>Issue #${number}</h1>`, `<h1>Issue #${number}: ${escapeHtml(issue.title)}</h1>`)

// The review gate, and a policy that keeps the page from loading or sending
// anything off-site while it's reviewed.
html = replaceOnce(html, '    <link rel="icon"', `    <!-- Imported from twbs/bootstrap#${number} by import-issue: untrusted content.
         Builds fail while this marker is here. Review the page (markup, the
         inert script at the bottom, tokens.css, main.scss and _custom.scss),
         then remove the marker. Keep the policy unless the reproduction needs
         remote content. -->
    <meta name="playground-imported" content="twbs/bootstrap#${number}">
    <meta http-equiv="Content-Security-Policy" content="img-src 'self' data:; media-src 'self'; font-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'">
    <link rel="icon"`)

// The template's checklist is for this repository's own tracking issues.
html = html.replace(/ {4}<!-- Before filing[\s\S]*?-->\n/, '')

const steps = [`Imported from ${link(number, `twbs/bootstrap#${number}`)}${issue.isPullRequest ? ' (pull request)' : ''}${codeSource === issue ? '' : `, with the code of ${link(codeSource.number, `#${codeSource.number}`)}`}.`]
if (version || commit) {
  steps.push(`Reported on ${version ? `<code>${escapeHtml(version)}</code>` : 'Bootstrap'}${commit ? ` at <code>${escapeHtml(commit)}</code>` : ''}.`)
}

steps.push(v6Evidence
  ? `A v6 issue: ${escapeHtml(v6Evidence)}.`
  : `Not known to be a v6 issue${otherMajor ? ` (${escapeHtml(otherMajor)}, imported with --force)` : ''}: check that it applies.`)

for (const demo of demos) {
  steps.push(`The issue's live demo: <a href="${escapeHtml(demo)}">${escapeHtml(demo)}</a>.`)
}

html = addSteps(html, steps)
if (expected) {
  html = replaceOnce(html, '<p class="mb-0">…</p>', `<p class="mb-0">${escapeHtml(expected)}</p>`)
}

if (actual) {
  html = html.replace(/(<h3 class="h6">Actual<\/h3>\n\s*)<p class="mb-0">…<\/p>/, (_, before) => `${before}<p class="mb-0">${escapeHtml(actual)}</p>`)
}

if (markup.length > 0) {
  const indented = markup.join('\n\n').split('\n').map(line => (line ? `          ${line}` : line)).join('\n')
  html = setMarkup(html, indented)
}

const notes = [
  ...bootstrapFiles.map(file => `The issue loaded ${file}: the reproduction compiles its own Bootstrap instead.`),
  ...removed.map(item => `Removed: ${item}`)
]
if (notes.length > 0) {
  html = replaceOnce(html, '    <main class="container py-5">\n', `    <!-- From twbs/bootstrap#${number}, by import-issue:
${notes.map(note => `         - ${commentText(note)}`).join('\n')} -->
    <main class="container py-5">\n`)
}

if (js.length > 0) {
  html = replaceOnce(html, '    <script type="module">\n', `    <!-- The issue's JavaScript, inert: type="text/plain" never runs. Read it,
         then move what the reproduction needs to the module below.
         Bootstrap is on \`window.bootstrap\` once src/js/main.js has imported
         it, which may come after \`load\`. -->
    <script type="text/plain" data-playground-imported>
${inertScript(js.map(code => dedent(code)).join('\n\n')).replace(/^(?=.)/gm, '      ')}
    </script>

    <script type="module">\n`)
}

// --- Style files ------------------------------------------------------------

const header = what => `From twbs/bootstrap#${number}, ${what}, by import-issue. Untrusted: review it.`
const transform = (content, file) => {
  if (file === 'tokens.css' && cleanedCss) {
    return `${content.trimEnd()}\n\n/* ${header('unlayered as in the issue')} */\n${cleanedCss}\n`
  }

  if (file === 'main.scss' && configBlock) {
    const line = '@use "bootstrap/scss/bootstrap";\n'
    return content.includes(line)
      ? content.replace(line, () => `// ${header('its configuration')}\n${configBlock}\n`)
      : `${content.trimEnd()}\n\n// ${header('its configuration')}. This config already\n// configures Bootstrap: merge it into the \`@use\` above.\n${configBlock.replace(/^/gm, '// ')}\n`
  }

  if (file === '_custom.scss' && otherScss.length > 0) {
    return `${content.trimEnd()}\n\n// ${header('outside the custom layer as in the issue')}\n${otherScss.join('\n\n')}\n`
  }

  return content
}

writeReproduction({ sourceDir, targetDir, html, transform })

// --- Report -----------------------------------------------------------------

const relative = path.relative(process.cwd(), targetDir)
console.log(`Created ${relative}/ from ${issue.isPullRequest ? 'pull request' : 'issue'} twbs/bootstrap#${number}${codeSource === issue ? '' : ` and the code of #${codeSource.number}`}, with the "${values.config}" config`)
console.log(`  ${v6Evidence ? `A v6 issue: ${v6Evidence}` : `Not known to be a v6 issue${otherMajor ? ` (${otherMajor}, imported with --force)` : ''}: check that it applies`}`)
console.log(`  ${markup.length} markup, ${css.length} CSS, ${scss.length} Sass and ${js.length} JavaScript part(s)${js.length > 0 ? ' (the JavaScript is inert)' : ''}`)
if (blocks.length === 0) {
  console.log('  The issue has no code to import: fill in the reproduction block yourself.')
}

for (const note of notes) {
  console.log(`  ${note}`)
}

console.log(`\nThe content is untrusted. Review ${relative}/ before anything else, then remove its`)
console.log('`playground-imported` marker: builds fail while it\'s there. Open it with `npm run dev`:')
console.log(`http://localhost:5173/issues/${number}/`)
if (issue.isPullRequest) {
  console.log(`\nTo test the pull request: npm run update-bootstrap -- --pr ${number}   (don't commit that; npm run update-bootstrap goes back)`)
  console.log(`Or in your BOOTSTRAP_PATH checkout: gh pr checkout ${number} --repo twbs/bootstrap`)
}

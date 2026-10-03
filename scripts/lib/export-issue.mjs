// Exports a reproduction (issues/<name>/) for upstream maintainers, who want
// one they can open without cloning this repository, which needs Vite, Sass
// and the playground's scripts:
//
// - `html`: one HTML file, the markup of `?chrome=0` without the toolbar and
//   the playground's scripts, but with the paragraphs of the chrome that the
//   page's scripts write to. Its styles are Bootstrap's `dist/` build of the
//   same commit from jsDelivr when the config is Bootstrap's defaults, or the
//   reproduction's own compiled copy, inlined. Bootstrap's JavaScript is the
//   commit's `dist/js/bootstrap.bundle.min.js` from jsDelivr.
// - `project`: a minimal Vite + Sass project with the same page and the
//   reproduction's three config files, which compiles Bootstrap from the
//   commit's source. The toolbar opens it in StackBlitz through
//   public/open-in-stackblitz.html, a POST to https://stackblitz.com/run.
//
// Shared by `npm run export-issue` and the Vite plugin that serves both in dev
// and writes them next to each reproduction in builds. See "Exporting a
// reproduction" in docs/pages.md.
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'parse5'
import { compileConfig, processCss } from './compile.mjs'
import { REPOSITORY_URL, configDir, root } from './configs.mjs'

export const SITE_URL = 'https://julien-deramond.github.io/bootstrap-test-playground'

// The two exports' file names next to the page, in dev and in builds.
export const EXPORT_FILES = { html: 'export.html', project: 'stackblitz.json' }

const STACKBLITZ_FILE = 'index.html'
const quiet = { warn() {}, debug() {} }
const playgroundPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const cdnUrl = (sha, file) => `https://cdn.jsdelivr.net/gh/twbs/bootstrap@${sha ?? 'v6-dev'}/${file}`

const read = file => fs.readFileSync(file, 'utf8')
const sameFile = (a, b) => fs.existsSync(a) && fs.existsSync(b) && read(a) === read(b)
const attribute = (node, name) => node.attrs?.find(entry => entry.name === name)?.value
const isElement = (node, tagName) => node.tagName === tagName
const indent = (text, prefix) => text.split('\n').map(line => (line ? prefix + line : line)).join('\n')
// Comments can't contain `--`.
const commentText = text => text.replace(/--/g, '- -')

function walk(node, visit) {
  for (const child of [...(node.childNodes ?? [])]) {
    if (visit(child) !== false) {
      walk(child, visit)
    }
  }

  if (node.content) {
    walk(node.content, visit)
  }
}

const escapeAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

// The page under test: the body without the playground's chrome
// (`data-playground-chrome`) and its comments, which describe the playground
// layout, as edits of the page's source, so the rest stays as written.
// Root-relative links point to the deployed playground.
function readBody(source, document, warnings) {
  const html = document.childNodes.find(node => isElement(node, 'html'))
  const body = html.childNodes.find(node => isElement(node, 'body'))
  const isBlank = node => node.nodeName === '#text' && /^\s*$/.test(node.value)
  const removed = new Set()
  const edits = []

  // The page's scripts often write what they measure in the chrome, like
  // `<p>Measured here: <code id="measured">…</code></p>` in "Actual": that
  // paragraph stays, where the chrome was.
  const scripts = []
  walk(body, node => {
    if (isElement(node, 'script')) {
      scripts.push(node.childNodes.map(child => child.value).join(''))
    }
  })
  const isReferenced = id => scripts.some(code => [`'${id}'`, `"${id}"`, `\`${id}\``, `#${id}`].some(token => code.includes(token)))
  const keptInside = chrome => {
    const kept = []
    walk(chrome, node => {
      const id = attribute(node, 'id')
      if (id && isReferenced(id)) {
        let block = node
        while (block !== chrome && !isElement(block, 'p')) {
          block = block.parentNode
        }

        kept.push(block === chrome ? node : block)
        return false
      }
    })
    return [...new Set(kept)]
  }

  walk(body, node => {
    const kept = node.nodeName === '#comment' ? [] : attribute(node, 'data-playground-chrome') !== undefined ? keptInside(node) : undefined
    if (kept?.length > 0) {
      const { startOffset, endOffset } = node.sourceCodeLocation
      const indentation = source.slice(source.lastIndexOf('\n', startOffset) + 1, startOffset)
      const text = kept.map(fragment => source.slice(fragment.sourceCodeLocation.startOffset, fragment.sourceCodeLocation.endOffset)).join(`\n${indentation}`)
      edits.push({ start: startOffset, end: endOffset, text })
      return false
    }

    if (kept) {
      // The node and the whitespace before it. When nothing stays before it
      // in its parent, the blank lines after it go too.
      const { startOffset, endOffset } = node.sourceCodeLocation
      let start = startOffset
      let end = endOffset
      while (/\s/.test(source[start - 1])) {
        start--
      }

      const siblings = node.parentNode.childNodes
      if (siblings.slice(0, siblings.indexOf(node)).every(sibling => isBlank(sibling) || removed.has(sibling))) {
        let after = end
        while (/\s/.test(source[after])) {
          after++
        }

        end = Math.max(end, source.lastIndexOf('\n', after - 1))
      }

      removed.add(node)
      edits.push({ start, end, text: '' })
      return false
    }

    for (const entry of node.attrs ?? []) {
      if (!['href', 'src', 'poster', 'action'].includes(entry.name)) {
        continue
      }

      if (/^\/(?!\/)/.test(entry.value)) {
        const { startOffset, endOffset } = node.sourceCodeLocation.attrs[entry.name]
        edits.push({ start: startOffset, end: endOffset, text: `${entry.name}="${escapeAttribute(SITE_URL + entry.value)}"` })
      } else if (!/^(#|\?|[a-z][\w+.-]*:|\/\/)/i.test(entry.value) && entry.value) {
        warnings.push(`<${node.tagName} ${entry.name}="${entry.value}"> is relative to the reproduction's folder: the export doesn't include it.`)
      }
    }
  })

  // Overlapping removals merge, then apply from the end.
  const merged = []
  for (const edit of edits.sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1)
    if (last && edit.start <= last.end && !last.text && !edit.text) {
      last.end = Math.max(last.end, edit.end)
    } else {
      merged.push({ ...edit })
    }
  }

  const { startTag, endTag } = body.sourceCodeLocation
  let content = source.slice(startTag.startOffset, endTag.endOffset)
  for (const { start, end, text } of merged.reverse()) {
    content = content.slice(0, start - startTag.startOffset) + text + content.slice(end - startTag.startOffset)
  }

  return content
}

// The <html> attributes, without the playground's own (`data-playground-busy`).
const htmlAttributes = document => document.childNodes.find(node => isElement(node, 'html')).attrs
  .filter(({ name }) => !name.startsWith('data-playground'))
  .map(({ name, value }) => ` ${name}="${escapeAttribute(value)}"`)
  .join('')

// What the <head> says about the page, and the stylesheets it loads.
function readHead(document) {
  const head = document.childNodes.find(node => isElement(node, 'html')).childNodes.find(node => isElement(node, 'head'))
  const meta = name => head.childNodes.find(node => isElement(node, 'meta') && attribute(node, 'name') === name)
  const title = head.childNodes.find(node => isElement(node, 'title'))?.childNodes[0]?.value ?? ''
  const csp = head.childNodes.find(node => isElement(node, 'meta') && attribute(node, 'http-equiv')?.toLowerCase() === 'content-security-policy')
  const upstream = meta('playground-upstream')
  return {
    title,
    description: attribute(meta('description') ?? {}, 'content') ?? '',
    upstream: attribute(upstream ?? {}, 'content')?.trim() ?? '',
    imported: Boolean(meta('playground-imported')),
    csp: csp && attribute(csp, 'content'),
    stylesheets: head.childNodes
      .filter(node => isElement(node, 'link') && attribute(node, 'rel') === 'stylesheet')
      .map(node => attribute(node, 'href'))
  }
}

// `twbs/bootstrap#42754` → its URL.
const issueUrl = reference => reference.replace(/^([\w.-]+\/[\w.-]+)#(\d+)$/, 'https://github.com/$1/issues/$2')

// Tooltips and popovers are opt-in: the playground initializes them, like the
// docs do (src/js/examples.js), so the exports do too when the page has some.
function optInComponents(body) {
  return [
    ['tooltip', 'Tooltip'],
    ['popover', 'Popover']
  ].filter(([toggle]) => body.includes(`data-bs-toggle="${toggle}"`))
    .map(([toggle, component]) => `for (const element of document.querySelectorAll('[data-bs-toggle="${toggle}"]')) {\n  new bootstrap.${component}(element)\n}`)
}

// The comments the default tokens.css is made of, removed from the export
// with the rules they leave empty, so only the reproduction's own CSS stays.
async function trimTokens(css, file) {
  const defaults = new Set()
  ;(await processCss(read(path.join(configDir('default'), 'tokens.css')), undefined)).root.walkComments(comment => {
    defaults.add(comment.text.trim())
  })

  const { root: tree } = await processCss(css, file)
  tree.walkComments(comment => {
    if (defaults.has(comment.text.trim())) {
      comment.remove()
    }
  })

  // Innermost first: an @layer holding an emptied rule empties too.
  const containers = []
  tree.walk(node => {
    if (node.nodes) {
      containers.push(node)
    }
  })
  for (const node of containers.reverse()) {
    if (node.nodes.length === 0) {
      node.remove()
    }
  }

  tree.raws.after = '\n'
  return tree.toString().replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n').trim()
}

// Reads issues/<name>/ and resolves to `{ html, project, warnings }`.
// `bootstrap` is `bootstrapSource()` (scripts/lib/bootstrap.mjs).
export async function exportIssue(name, { bootstrap }) {
  const dir = path.join(root, 'issues', name)
  const page = path.join(dir, 'index.html')
  if (!fs.existsSync(page) || !fs.existsSync(path.join(dir, 'main.scss'))) {
    throw new Error(`issues/${name}/ is not a reproduction: it needs an index.html and a main.scss.`)
  }

  const source = read(page)
  const document = parse(source, { sourceCodeLocationInfo: true })
  const head = readHead(document)
  if (head.imported) {
    throw new Error(`issues/${name}/ is an unreviewed import: review it and remove its \`playground-imported\` marker before exporting it (see "Importing an upstream issue" in docs/pages.md).`)
  }

  const warnings = []
  const body = readBody(source, document, warnings)
  const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
  const { sha } = bootstrap
  if (!sha) {
    warnings.push('The Bootstrap commit is unknown: the exports use the v6-dev branch from GitHub.')
  }

  if (bootstrap.dirty) {
    warnings.push('The Bootstrap checkout has uncommitted changes: the exports only have what is committed, and the HTML export\'s JavaScript comes from GitHub.')
  } else if (bootstrap.dir && sha) {
    warnings.push(`The exports load Bootstrap ${sha.slice(0, 7)} from GitHub: push it first if it's a local commit.`)
  }

  // Bootstrap's defaults: the same main.scss and _custom.scss as configs/default/.
  const isDefault = ['main.scss', '_custom.scss'].every(file => sameFile(path.join(dir, file), path.join(configDir('default'), file)))
  const useCdn = isDefault && sha && !bootstrap.dirty
  const commit = sha ? `v6-dev at ${sha.slice(0, 7)} (https://github.com/twbs/bootstrap/commit/${sha})` : 'v6-dev (https://github.com/twbs/bootstrap/tree/v6-dev)'

  // Each stylesheet of the page, for the HTML export (inlined, or from the
  // CDN) and for the project (a file, by its name).
  const styles = []
  for (const href of head.stylesheets) {
    if (/^(https?:)?\/\//.test(href)) {
      styles.push({ html: `<link rel="stylesheet" href="${href}">`, link: href })
      continue
    }

    const file = href.startsWith('/') ? path.join(root, href) : path.join(dir, href)
    if (!fs.existsSync(file)) {
      throw new Error(`issues/${name}/index.html loads ${href}, which doesn't exist.`)
    }

    const fileName = path.basename(file)
    if (href === './main.scss') {
      styles.push({
        html: useCdn ?
          `<!-- Bootstrap's default build, from the same commit. -->\n<link rel="stylesheet" href="${cdnUrl(sha, 'dist/css/bootstrap.min.css')}">` :
          `<!-- Bootstrap compiled from the commit's Sass with this reproduction's config (main.scss and _custom.scss in the StackBlitz project). -->\n<style>\n${indent((await compileConfig(file, { bootstrapDir, logger: quiet, style: 'compressed' })).css.trim(), '  ')}\n</style>`,
        link: './main.scss'
      })
    } else if (href === './tokens.css') {
      const css = await trimTokens(read(file), file)
      styles.push({ html: css && `<!-- The reproduction's own CSS (tokens.css). -->\n<style>\n${indent(css, '  ')}\n</style>`, link: './tokens.css' })
    } else {
      const css = (await processCss(read(file), file)).css.trim()
      styles.push({ html: `<!-- ${path.relative(root, file)}, from the playground. -->\n<style>\n${indent(css, '  ')}\n</style>`, link: `./${fileName}`, fileName, content: read(file) })
      warnings.push(`The page loads ${path.relative(root, file)}, the playground's own styles: the exports include them.`)
    }
  }

  const extra = optInComponents(body)
  const about = sources => commentText([
    head.title,
    head.description,
    head.upstream && `Upstream: ${issueUrl(head.upstream)}`,
    `Bootstrap: ${commit}`,
    sources,
    `Exported from ${REPOSITORY_URL}/tree/main/issues/${name}`
  ].filter(Boolean).join('\n'))

  const document_ = ({ comment, headParts }) => `<!doctype html>
<html${htmlAttributes(document)}>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${head.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
    <!--
${indent(comment, '      ')}
    -->
${head.csp ? `    <meta http-equiv="Content-Security-Policy" content="${head.csp}">\n` : ''}${headParts.filter(Boolean).map(part => indent(part, '    ')).join('\n')}
  </head>
  ${body}
</html>
`

  const html = document_({
    comment: about(useCdn ?
      'Styles: Bootstrap\'s dist/ build from jsDelivr. JavaScript: dist/js/bootstrap.bundle.min.js from jsDelivr.' :
      'Styles: compiled with this reproduction\'s config, inlined. JavaScript: dist/js/bootstrap.bundle.min.js from jsDelivr.'),
    headParts: [
      ...styles.map(style => style.html),
      `<script type="module">\n  // Bootstrap's JavaScript, every component and its dependencies in one module.\n  import * as bootstrap from '${cdnUrl(sha, 'dist/js/bootstrap.bundle.min.js')}'\n  window.bootstrap = bootstrap\n${extra.map(code => indent(code, '  ')).join('\n')}${extra.length > 0 ? '\n' : ''}</script>`
    ]
  })

  const files = {
    [STACKBLITZ_FILE]: document_({
      comment: about('Styles: Bootstrap compiled from that commit\'s Sass with main.scss, _custom.scss and tokens.css. JavaScript: main.js.'),
      headParts: [
        ...styles.map(style => `<link rel="stylesheet" href="${style.link}">`),
        '<script type="module" src="./main.js"></script>'
      ]
    }),
    'main.js': [
      '// Bootstrap\'s JavaScript, compiled from the commit\'s source by Vite. The',
      '// page\'s own scripts find it on `window.bootstrap`.',
      'import * as bootstrap from \'bootstrap\'',
      '',
      'window.bootstrap = bootstrap',
      ...(extra.length > 0 ? ['', ...extra] : []),
      ''
    ].join('\n'),
    'main.scss': read(path.join(dir, 'main.scss')),
    '_custom.scss': read(path.join(dir, '_custom.scss')),
    'tokens.css': read(path.join(dir, 'tokens.css')),
    ...Object.fromEntries(styles.filter(style => style.fileName).map(style => [style.fileName, style.content])),
    // Bootstrap's build, as in the playground: the `--bs-` prefix, then
    // Autoprefixer against Bootstrap's browsers.
    'postcss.config.js': read(path.join(root, 'postcss.config.js')),
    '.browserslistrc': read(path.join(root, '.browserslistrc')),
    'vite.config.js': `import { defineConfig } from 'vite'

// Same floors as Bootstrap's \`.browserslistrc\`. Lower targets make the
// minifier rewrite \`light-dark()\`, which breaks \`data-bs-theme\`.
const cssTarget = ['chrome130', 'edge130', 'firefox132', 'safari18']

export default defineConfig({
  build: { target: cssTarget, cssTarget }
})
`,
    'package.json': `${JSON.stringify(packageJson(name, sha), null, 2)}\n`,
    '.stackblitzrc': `${JSON.stringify({ installDependencies: true, startCommand: 'npm run dev' }, null, 2)}\n`,
    'README.md': `# ${head.title}

${head.description}

${head.upstream ? `Upstream: ${issueUrl(head.upstream)}\n\n` : ''}Bootstrap ${commit}, compiled from its source with this reproduction's config: \`main.scss\` (Sass options), \`_custom.scss\` (Sass rules) and \`tokens.css\` (CSS custom properties and rules).

\`\`\`sh
npm install
npm run dev
\`\`\`

Exported from ${REPOSITORY_URL}/tree/main/issues/${name}
`
  }

  return {
    html,
    project: { title: head.title, description: head.description || head.title, template: 'node', openFile: STACKBLITZ_FILE, files },
    warnings
  }
}

// Bootstrap from a tarball of the commit: npm installs it without git, and
// the commit's dist/ and js/dist/ are committed. Sass is the JavaScript one,
// which runs in StackBlitz, at the version of the playground's sass-embedded.
function packageJson(name, sha) {
  const { dependencies, devDependencies } = playgroundPackage
  return {
    name: `bootstrap-repro-${name}`,
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: {
      '@floating-ui/dom': dependencies['@floating-ui/dom'],
      bootstrap: `https://codeload.github.com/twbs/bootstrap/tar.gz/${sha ?? 'refs/heads/v6-dev'}`,
      'vanilla-calendar-pro': dependencies['vanilla-calendar-pro']
    },
    devDependencies: {
      autoprefixer: devDependencies.autoprefixer,
      'postcss-prefix-custom-properties': devDependencies['postcss-prefix-custom-properties'],
      sass: devDependencies['sass-embedded'],
      vite: devDependencies.vite
    }
  }
}

// The names of the reproductions, issues/<name>/ with an index.html.
export function listReproductions() {
  const dir = path.join(root, 'issues')
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'index.html')) && fs.existsSync(path.join(dir, entry.name, 'main.scss')))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
}

// An HTML page that opens `project` in StackBlitz when loaded, with a POST to
// https://stackblitz.com/run, for the CLI. public/open-in-stackblitz.html
// posts the same form for the toolbar.
export function stackblitzLauncher(project) {
  const escape = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const fields = [
    ['project[title]', project.title],
    ['project[description]', project.description],
    ['project[template]', project.template],
    ...Object.entries(project.files).map(([file, content]) => [`project[files][${file}]`, content])
  ]
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Opening ${escape(project.title)} in StackBlitz…</title>
  </head>
  <body>
    <form method="post" action="https://stackblitz.com/run?file=${encodeURIComponent(project.openFile)}">
${fields.map(([field, value]) => `      <input type="hidden" name="${escape(field)}" value="${escape(value)}">`).join('\n')}
      <button type="submit">Open in StackBlitz</button>
    </form>
    <script>document.forms[0].submit()</script>
  </body>
</html>
`
}

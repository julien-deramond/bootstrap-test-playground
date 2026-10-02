// Generates kitchen-sink/*.html from the live examples in Bootstrap's docs
// (site/src/content/docs/{components,forms}/*.mdx). Used by
// scripts/sync-kitchen-sink.mjs, and by vite.config.js to resync a page in dev
// when its MDX file changes in a BOOTSTRAP_PATH checkout.
//
// Everything around the examples (header, navigation, example headings) carries
// `data-playground-chrome`, so `?chrome=0` can hide it (see playground-prefs.js).

import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'

export const outDir = path.join(root, 'kitchen-sink')
export const SECTIONS = [
  { dir: 'components', label: 'Components' },
  { dir: 'forms', label: 'Forms' }
]

export const docsDir = bootstrapDir => path.join(bootstrapDir, 'site/src/content/docs')
export const pageFile = ({ section, slug }) => path.join(outDir, `${section}-${slug}.html`)

// Stand-ins for the helpers available inside the docs' MDX expressions.
// site/data/*.yml files are flat lists of maps, so a tiny parser is enough.
function readYamlList(bootstrapDir, file) {
  const items = []
  for (const line of fs.readFileSync(path.join(bootstrapDir, 'site/data', file), 'utf8').split('\n')) {
    const match = line.match(/^(- |  )([\w-]+):\s*(.*)$/)
    if (!match) {
      continue
    }

    if (match[1] === '- ') {
      items.push({})
    }

    items.at(-1)[match[2]] = match[3].replace(/^(['"])(.*)\1$/, '$2')
  }

  return items
}

const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1)
function createGetData(bootstrapDir) {
  const docsData = {
    'theme-colors': readYamlList(bootstrapDir, 'theme-colors.yml').map(color => ({ title: capitalize(color.name), ...color })),
    breakpoints: readYamlList(bootstrapDir, 'breakpoints.yml')
  }

  return type => {
    if (!docsData[type]) {
      throw new Error(`getData('${type}') is not supported`)
    }

    return docsData[type]
  }
}

const getConfig = () => ({ docs_version: 'current' })

// Reads the JS expression in `code={...}`, starting right after the `{`.
function readExpression(source, start) {
  const templateDepths = []
  let depth = 1
  let inTemplate = false

  for (let i = start; i < source.length; i++) {
    const char = source[i]

    if (inTemplate) {
      if (char === '\\') {
        i++
      } else if (char === '`') {
        inTemplate = false
      } else if (char === '$' && source[i + 1] === '{') {
        templateDepths.push(depth)
        depth++
        inTemplate = false
        i++
      }

      continue
    }

    if (char === '`') {
      inTemplate = true
    } else if (char === '"' || char === "'") {
      for (i++; source[i] !== char; i++) {
        if (source[i] === '\\') {
          i++
        }
      }
    } else if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (templateDepths.length > 0 && depth === templateDepths.at(-1)) {
        templateDepths.pop()
        inTemplate = true
      } else if (depth === 0) {
        return source.slice(start, i)
      }
    }
  }

  throw new Error('Unterminated code={...} expression')
}

function parseAttributes(source) {
  const attributes = {}
  for (const [, name, quoted, expression] of source.matchAll(/([\w-]+)=(?:"([^"]*)"|\{([^}]*)\})/g)) {
    attributes[name] = quoted ?? (expression === 'false' ? false : expression)
  }

  return attributes
}

// Mirrors site/src/libs/placeholder.ts
function renderPlaceholder(attributes) {
  const options = {
    background: 'var(--bs-bg-2)',
    color: 'var(--bs-fg-4)',
    height: '180',
    title: 'Placeholder',
    width: '100%',
    ...attributes
  }
  options.text ??= `${options.width}x${options.height}`

  const showText = options.text !== false
  const showTitle = options.title !== false
  const label = [showTitle && options.title, showText && options.text].filter(Boolean).join(': ')
  const props = {
    'aria-hidden': label ? undefined : 'true',
    'aria-label': label || undefined,
    class: ['bd-placeholder-img', options.class].filter(Boolean).join(' '),
    height: options.height,
    preserveAspectRatio: 'xMidYMid slice',
    role: label ? 'img' : undefined,
    width: options.width,
    xmlns: 'http://www.w3.org/2000/svg'
  }

  const attrs = Object.entries(props).filter(([, value]) => value !== undefined).map(([key, value]) => ` ${key}="${value}"`).join('')
  return `<svg${attrs}>${showTitle ? `<title>${options.title}</title>` : ''}<rect width="100%" height="100%" fill="${options.background}" />${showText ? `<text x="50%" y="50%" fill="${options.color}" dy=".3em">${options.text}</text>` : ''}</svg>`
}

function renderCloseButton(attributes) {
  const classes = ['btn-close', attributes.class].filter(Boolean).join(' ')
  const dismiss = attributes.dismiss ? ` data-bs-dismiss="${attributes.dismiss}"` : ''
  const target = attributes.target ? ` data-bs-target="${attributes.target}"` : ''
  return `<button type="button" class="${classes}"${dismiss}${target} aria-label="Close"></button>`
}

function dedent(html) {
  const lines = html.split('\n')
  const indents = lines.slice(1).filter(line => line.trim()).map(line => line.match(/^ */)[0].length)
  const shift = indents.length > 0 ? Math.min(...indents) : 0
  return [lines[0], ...lines.slice(1).map(line => line.slice(shift))].join('\n')
}

function cleanHtml(html) {
  return dedent(html)
    .replace(/<Placeholder\s+([^>]*?)\/>/g, (match, attrs) => renderPlaceholder(parseAttributes(attrs)))
    .replace(/<CloseButton\s*([^>]*?)\/>/g, (match, attrs) => renderCloseButton(parseAttributes(attrs)))
    .replace(/\/docs\/[^/]+\/assets\/brand\/bootstrap-logo\.svg/g, '/favicon.svg')
    .replace(/\[\[docsref:([^\]]*)\]\]/g, '#')
    .replace(/\[\[config:[^\]]*\]\]/g, '')
    .trim()
}

const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const plainText = markdown => markdown.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^["']|["']$/g, '')
const slugify = value => value.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
const indent = (html, spaces) => html.split('\n').map(line => (line ? ' '.repeat(spaces) + line : line)).join('\n')

// The ids that an example's toggles open (`data-bs-target="#id"`, or
// `href="#id"` on a `data-bs-toggle` element).
const toggleTargets = html => [...html.matchAll(/<[^>]*\sdata-bs-toggle="[^"]*"[^>]*>/g)]
  .map(([tag]) => (tag.match(/\sdata-bs-target="#([^"]+)"/) ?? tag.match(/\shref="#([^"]+)"/))?.[1])
  .filter(Boolean)

// Reads the element that starts at `start` in `source`, up to its matching
// closing tag.
function readElement(source, start, name) {
  const tags = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g')
  tags.lastIndex = start
  let depth = 0
  for (const match of source.matchAll(tags)) {
    depth += match[1] ? -1 : 1
    if (depth === 0) {
      return source.slice(start, match.index + match[0].length)
    }
  }

  throw new Error(`Unterminated <${name}>`)
}

// Some examples open an element that the MDX writes as raw HTML outside any
// <Example>, like the sized dialogs of dialog.mdx. Appends each one to the
// first example that targets it, so its trigger opens something. `prose` is the
// MDX source with the examples and code blocks blanked out.
function attachTargets(examples, prose, source) {
  const missing = []
  const ids = new Set(examples.flatMap(({ html }) => [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id)))
  for (const example of examples) {
    for (const id of toggleTargets(example.html).filter(target => !ids.has(target))) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const match = prose.match(new RegExp(`^<([a-z][\\w-]*)\\b[^>]*\\sid="${escaped}"`, 'm'))
      if (match) {
        example.html += `\n\n${cleanHtml(readElement(source, match.index, match[1]))}`
      } else {
        missing.push(`#${id}`)
      }

      ids.add(id)
    }
  }

  return missing
}

function extractExamples(source, getData) {
  const examples = []
  const skipped = []
  const blank = (text, start, end) => text.slice(0, start) + text.slice(start, end).replace(/[^\n]/g, ' ') + text.slice(end)
  let prose = source.replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, block => block.replace(/[^\n]/g, ' '))
  let index = 0

  while ((index = source.indexOf('<Example', index)) !== -1) {
    const codeIndex = source.indexOf('code={', index)
    if (codeIndex === -1) {
      break
    }

    const expression = readExpression(source, codeIndex + 6)
    const expressionEnd = codeIndex + 6 + expression.length
    const tagEnd = source.indexOf('/>', expressionEnd)
    const tag = source.slice(index, codeIndex) + source.slice(expressionEnd, tagEnd)
    prose = blank(prose, index, tagEnd)
    index = expressionEnd

    const heading = [...source.slice(0, index).matchAll(/^#{2,3} (.+)$/gm)].at(-1)?.[1] ?? 'Example'
    try {
      // eslint-disable-next-line no-new-func
      let html = new Function('getData', 'getConfig', `return (${expression})`)(getData, getConfig)
      if (Array.isArray(html)) {
        html = html.join('\n')
      }

      examples.push({ heading, className: tag.match(/class="([^"]*)"/)?.[1] ?? '', html: cleanHtml(html) })
    } catch (error) {
      skipped.push(`${heading} (${error.message})`)
    }
  }

  const missing = attachTargets(examples, prose, source)
  if (missing.length > 0) {
    skipped.push(`the targets of ${missing.join(', ')} (not found in the MDX)`)
  }

  return { examples, skipped }
}

export function renderPage({ section, slug, title, description, examples }, allPages) {
  const seen = new Map()
  const blocks = examples.map(({ heading, className, html }) => {
    const base = slugify(heading) || 'example'
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    const id = count > 1 ? `${base}-${count}` : base
    return { id, heading, className, html }
  })

  const toc = [...new Map(blocks.map(block => [block.heading, block.id])).entries()]
  const pageLinks = SECTIONS.map(({ dir, label }) => `        <p class="mb-1 fg-3">${label}</p>
        <p class="d-flex flex-wrap gap-2 mb-3">
${allPages.filter(page => page.section === dir).map(page => `          <a href="/kitchen-sink/${page.section}-${page.slug}.html"${page.slug === slug && page.section === section ? ' aria-current="page" class="fw-bold"' : ''}>${escapeHtml(page.title)}</a>`).join('\n')}
        </p>`).join('\n')

  return `<!doctype html>
<!-- Generated by scripts/sync-kitchen-sink.mjs from site/src/content/docs/${section}/${slug}.mdx. Do not edit by hand. -->
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Kitchen sink: ${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="playground-tags" content="${section}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script src="/playground-prefs.js"></script>
    <link rel="stylesheet" href="/src/styles/main.scss" data-playground-styles="main">
    <link rel="stylesheet" href="/src/styles/tokens.css" data-playground-styles="tokens">
    <link rel="stylesheet" href="/kitchen-sink/kitchen-sink.css">
    <script type="module" src="/src/js/main.js"></script>
  </head>
  <body>
    <header class="container py-5" data-playground-chrome>
      <p class="mb-2"><a href="/">Playground</a> / Kitchen sink</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="fs-lg fg-2">${escapeHtml(description)}</p>
      <p class="mb-0"><a href="https://github.com/twbs/bootstrap/blob/v6-dev/site/src/content/docs/${section}/${slug}.mdx">Docs source</a></p>
    </header>

    <main class="container pb-5">
      <details class="bd-kitchen-sink-nav mb-5" data-playground-chrome>
        <summary>All kitchen sink pages</summary>
${pageLinks}
      </details>

      <nav class="mb-5" aria-label="On this page" data-playground-chrome>
        <p class="d-flex flex-wrap gap-2 mb-0">
${toc.map(([heading, id]) => `          <a href="#${id}">${escapeHtml(plainText(heading))}</a>`).join('\n')}
        </p>
      </nav>

${blocks.map(({ id, heading, className, html }) => `      <section class="bd-kitchen-sink-section" aria-labelledby="${id}">
        <h2 class="h5" id="${id}" data-playground-chrome>${escapeHtml(plainText(heading))}</h2>
        <div class="bd-example${className ? ` ${className}` : ''}">
${indent(html, 10)}
        </div>
      </section>`).join('\n\n')}
    </main>
  </body>
</html>
`
}

// One example of a generated page, the reverse of renderPage: `{ title, tags,
// heading, className, html }`, `heading` and `html` as they appear in the page
// (`html` indented for its section), or `{ ids }`, every example id, when `id`
// isn't one of them.
export function readExample(page, id) {
  const section = /<section class="bd-kitchen-sink-section" aria-labelledby="([^"]+)">\n {8}<h2 class="h5" id="\1" data-playground-chrome>(.*?)<\/h2>\n {8}<div class="bd-example(?: ([^"]*))?">\n([\s\S]*?)\n {8}<\/div>\n {6}<\/section>/g
  const examples = [...page.matchAll(section)]
  const example = examples.find(([, exampleId]) => exampleId === id)
  if (!example) {
    return { ids: examples.map(([, exampleId]) => exampleId) }
  }

  const [, , heading, className = '', html] = example
  return {
    title: page.match(/<title>Kitchen sink: (.*?)<\/title>/)?.[1] ?? '',
    tags: page.match(/<meta name="playground-tags" content="([^"]*)">/)?.[1] ?? '',
    heading,
    className,
    html
  }
}

// Every docs page with at least one example, in the order of the navigation.
// `skipped` lists the examples that couldn't be evaluated, by MDX file.
export function readPages(bootstrapDir) {
  const getData = createGetData(bootstrapDir)
  const pages = []
  const skipped = []
  for (const { dir } of SECTIONS) {
    for (const file of fs.readdirSync(path.join(docsDir(bootstrapDir), dir)).filter(name => name.endsWith('.mdx')).sort()) {
      const source = fs.readFileSync(path.join(docsDir(bootstrapDir), dir, file), 'utf8')
      const { examples, skipped: skippedExamples } = extractExamples(source, getData)
      const slug = file.replace(/\.mdx$/, '')

      if (skippedExamples.length > 0) {
        skipped.push(`${dir}/${file}: skipped ${skippedExamples.join(', ')}`)
      }

      if (examples.length === 0) {
        continue
      }

      pages.push({
        section: dir,
        slug,
        title: source.match(/^title:\s*(.+)$/m)?.[1].trim() ?? slug,
        description: plainText(source.match(/^description:\s*(.+)$/m)?.[1].trim() ?? ''),
        examples
      })
    }
  }

  return { pages, skipped }
}

// Resyncs the page of one MDX file (`components/alert.mdx`), for the dev
// server. When the navigation changes too (a page added, removed or renamed),
// every page is rewritten, like `npm run sync-kitchen-sink`. Only files whose
// content changes are written. Returns the files written and removed.
export function syncPage(bootstrapDir, mdx) {
  const [section, name] = mdx.split(/[/\\]/)
  const slug = name.replace(/\.mdx$/, '')
  const { pages, skipped } = readPages(bootstrapDir)
  const page = pages.find(entry => entry.section === section && entry.slug === slug)
  const file = pageFile({ section, slug })
  const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined
  const nav = html => html?.match(/<details class="bd-kitchen-sink-nav[\s\S]*?<\/details>/)?.[0]
  const html = page && renderPage(page, pages)

  const written = []
  const removed = []
  const write = (target, content) => {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) {
      fs.writeFileSync(target, content)
      written.push(target)
    }
  }

  if (html && previous && nav(html) === nav(previous)) {
    write(file, html)
  } else {
    const files = new Set(pages.map(entry => pageFile(entry)))
    for (const existing of fs.readdirSync(outDir).filter(entry => entry.endsWith('.html')).map(entry => path.join(outDir, entry))) {
      if (!files.has(existing)) {
        fs.rmSync(existing)
        removed.push(existing)
      }
    }

    for (const entry of pages) {
      write(pageFile(entry), renderPage(entry, pages))
    }
  }

  return { written, removed, skipped: skipped.filter(line => line.startsWith(`${section}/${name}:`)) }
}

#!/usr/bin/env node
// Regenerates kitchen-sink/*.html from the live examples in Bootstrap's docs
// (site/src/content/docs/{components,forms}/*.mdx), so the kitchen sink always
// uses the current v6 markup.
//
// The npm package does not ship the docs, so this needs a Bootstrap checkout:
//   npm run sync-kitchen-sink -- ../twbs/bootstrap
// or set BOOTSTRAP_PATH in .env.local and run `npm run sync-kitchen-sink`.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'kitchen-sink')
const SECTIONS = [
  { dir: 'components', label: 'Components' },
  { dir: 'forms', label: 'Forms' }
]

const bootstrapPath = process.argv[2] ?? loadEnv('development', root, '').BOOTSTRAP_PATH
if (!bootstrapPath) {
  console.error('Usage: npm run sync-kitchen-sink -- <path/to/bootstrap>  (or set BOOTSTRAP_PATH in .env.local)')
  process.exit(1)
}

const bootstrapDir = path.resolve(root, bootstrapPath)
const docsDir = path.join(bootstrapDir, 'site/src/content/docs')
if (!fs.existsSync(docsDir)) {
  console.error(`No Bootstrap docs found in ${docsDir}`)
  process.exit(1)
}

// Stand-ins for the helpers available inside the docs' MDX expressions.
// site/data/*.yml files are flat lists of maps, so a tiny parser is enough.
function readYamlList(file) {
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
const docsData = {
  'theme-colors': readYamlList('theme-colors.yml').map(color => ({ title: capitalize(color.name), ...color })),
  breakpoints: readYamlList('breakpoints.yml')
}
const getData = type => {
  if (!docsData[type]) {
    throw new Error(`getData('${type}') is not supported`)
  }

  return docsData[type]
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

function extractExamples(source) {
  const examples = []
  const skipped = []
  let index = 0

  while ((index = source.indexOf('<Example', index)) !== -1) {
    const codeIndex = source.indexOf('code={', index)
    if (codeIndex === -1) {
      break
    }

    const expression = readExpression(source, codeIndex + 6)
    const expressionEnd = codeIndex + 6 + expression.length
    const tag = source.slice(index, codeIndex) + source.slice(expressionEnd, source.indexOf('/>', expressionEnd))
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

  return { examples, skipped }
}

function renderPage({ section, slug, title, description, examples }, allPages) {
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
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script src="/playground-prefs.js"></script>
    <link rel="stylesheet" href="/src/styles/main.scss" data-playground-styles="main">
    <link rel="stylesheet" href="/src/styles/tokens.css" data-playground-styles="tokens">
    <link rel="stylesheet" href="/kitchen-sink/kitchen-sink.css">
    <script type="module" src="/src/js/main.js"></script>
  </head>
  <body>
    <header class="container py-5">
      <p class="mb-2"><a href="/">Playground</a> / Kitchen sink</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="fs-lg fg-2">${escapeHtml(description)}</p>
      <p class="mb-0"><a href="https://github.com/twbs/bootstrap/blob/v6-dev/site/src/content/docs/${section}/${slug}.mdx">Docs source</a></p>
    </header>

    <main class="container pb-5">
      <details class="bd-kitchen-sink-nav mb-5">
        <summary>All kitchen sink pages</summary>
${pageLinks}
      </details>

      <nav class="mb-5" aria-label="On this page">
        <p class="d-flex flex-wrap gap-2 mb-0">
${toc.map(([heading, id]) => `          <a href="#${id}">${escapeHtml(plainText(heading))}</a>`).join('\n')}
        </p>
      </nav>

${blocks.map(({ id, heading, className, html }) => `      <section class="bd-kitchen-sink-section" aria-labelledby="${id}">
        <h2 class="h5" id="${id}">${escapeHtml(plainText(heading))}</h2>
        <div class="bd-example${className ? ` ${className}` : ''}">
${indent(html, 10)}
        </div>
      </section>`).join('\n\n')}
    </main>
  </body>
</html>
`
}

const pages = []
for (const { dir } of SECTIONS) {
  for (const file of fs.readdirSync(path.join(docsDir, dir)).filter(name => name.endsWith('.mdx')).sort()) {
    const source = fs.readFileSync(path.join(docsDir, dir, file), 'utf8')
    const { examples, skipped } = extractExamples(source)
    const slug = file.replace(/\.mdx$/, '')

    if (skipped.length > 0) {
      console.warn(`${dir}/${file}: skipped ${skipped.join(', ')}`)
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

for (const file of fs.readdirSync(outDir).filter(name => name.endsWith('.html'))) {
  fs.rmSync(path.join(outDir, file))
}

for (const page of pages) {
  fs.writeFileSync(path.join(outDir, `${page.section}-${page.slug}.html`), renderPage(page, pages))
}

const total = pages.reduce((sum, page) => sum + page.examples.length, 0)
console.log(`Wrote ${pages.length} pages (${total} examples) to kitchen-sink/ from ${path.relative(root, bootstrapDir) || bootstrapDir}`)

// Reads an upstream issue's body for import-issue.mjs: its sections, code
// blocks, summary, version and demo links, and the markup, CSS, Sass and
// JavaScript to put in a reproduction.
//
// Everything in an issue is untrusted: anyone can write one. Nothing here runs
// it. The markup and styles are cleaned of what could run code or load
// anything from another site, and JavaScript is kept as inert text. Each
// removal is listed, so the reviewer sees what the issue had. See "Importing
// an upstream issue" in docs/pages.md.
import { parse, parseFragment, serialize } from 'parse5'
import postcss from 'postcss'

// `### Describe the issue` → its text, by lowercased heading. The text before
// the first heading is under ''.
export function readSections(body) {
  const sections = new Map()
  let heading = ''
  let lines = []
  for (const line of body.replace(/\r\n?/g, '\n').split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)
    if (match) {
      sections.set(heading, lines.join('\n').trim())
      heading = match[1].toLowerCase()
      lines = []
    } else {
      lines.push(line)
    }
  }

  sections.set(heading, lines.join('\n').trim())
  return sections
}

export const sectionMatching = (sections, pattern) => [...sections].find(([heading]) => pattern.test(heading))?.[1] ?? ''

const LANGUAGES = {
  html: 'html', htm: 'html', xhtml: 'html', svg: 'html', xml: 'html',
  css: 'css',
  scss: 'scss', sass: 'scss',
  js: 'js', javascript: 'js', mjs: 'js', jsx: 'js'
}

// An untagged block's language, from its content. Logs, errors and shell
// sessions are none of them.
function sniff(code) {
  const text = code.trim()
  if (/^</.test(text)) {
    return 'html'
  }

  if (/^\s*@(use|forward|import|include|mixin)\b|^\s*\$[\w-]+\s*:/m.test(text)) {
    return 'scss'
  }

  if (/^[^{}\n]+\{[^{}]*[\w-]+\s*:[^{}]+\}/m.test(text)) {
    return 'css'
  }

  if (/\b(document|window|bootstrap)\.|\baddEventListener\(|\bnew bootstrap\./.test(text)) {
    return 'js'
  }

  return null
}

const indentOf = line => line.match(/^[ \t]*/)[0].length

// Removes the common indentation. Pasted code often has its first line less
// indented than the rest (` <dialog>` then `       <div>`): the other lines
// then lose their own common indentation.
export const dedent = code => {
  const lines = code.replace(/^\s*\n|\s+$/g, '').split('\n')
  const minimum = list => Math.min(...list.filter(line => line.trim()).map(indentOf))
  const first = indentOf(lines[0])
  const rest = minimum(lines.slice(1))
  const indent = Number.isFinite(rest) && first < rest ? rest : minimum(lines)
  return lines.map((line, index) => (index === 0 && first < rest ? line.slice(first) : line.slice(Number.isFinite(indent) ? Math.min(indent, indentOf(line)) : 0))).join('\n')
}

// Fenced code blocks, as `{ language, code }`: `language` from the info string,
// or sniffed when it has none, `null` for anything else (`txt`, `bash`, …).
export function codeBlocks(text) {
  const fence = /^[ \t]*(`{3,}|~{3,})[ \t]*([^\s`]*)[^\n]*\n([\s\S]*?)\n[ \t]*\1[ \t]*$/gm
  return [...text.replace(/\r\n?/g, '\n').matchAll(fence)].map(([, , info, code]) => {
    const tag = info.toLowerCase()
    return { language: tag ? LANGUAGES[tag] ?? null : sniff(code), code: dedent(code) }
  })
}

// Markdown to one line of plain text.
const plain = text => text
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/<img\b[^>]*>/gi, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_`]+/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const shorten = (text, max) => text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`

// The first paragraph of prose: not a checklist, a quote, a code block or an image.
export function summary(text, max = 200) {
  const withoutCode = text.replace(/^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[ \t]*$/gm, '')
  const paragraph = withoutCode.replace(/^#{1,6}\s.*$/gm, '').split(/\n\s*\n/).map(plain).find(block => block && !/^(- \[[ x]\]|>)/i.test(block))
  return paragraph ? shorten(paragraph, max) : ''
}

// "Expected behavior: …" and "Actual behavior: …" lines, the issue form's
// wording, as plain text.
export function expectedActual(text) {
  const read = word => {
    const match = text.match(new RegExp(`^[ \\t>*_-]*${word}(?:\\s+(?:behaviou?r|result|outcome))?[*_]*\\s*:[*_]*[ \\t]*(.+(?:\\n(?!\\s*\\n).+)*)`, 'im'))
    return match ? shorten(plain(match[1]), 400) : ''
  }

  return { expected: read('expected'), actual: read('actual') }
}

// The version the issue form asks for, and a commit when a CDN link pins one.
export function versionOf(sections, body) {
  const answer = plain(sectionMatching(sections, /version of bootstrap/).split('\n')[0] ?? '')
  const commit = body.match(/(?:twbs\/bootstrap@|bootstrap@)([\da-f]{7,40})\b/i)?.[1]
  return { version: answer === 'No response' ? '' : shorten(answer, 80), commit }
}

// Live demos: links the reviewer opens, never loaded by the page.
export function demoLinks(body) {
  const pattern = /https:\/\/(?:www\.)?(?:codepen\.io|stackblitz\.com|[\w-]+\.stackblitz\.io|jsfiddle\.net|codesandbox\.io|jsbin\.com)\/[^\s)>\]"'`]+/g
  return [...new Set(body.match(pattern) ?? [])]
}

// Upstream issues a pull request closes, from its body.
export const closedIssues = body => [...new Set([...body.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:twbs\/bootstrap)?#(\d+)/gi)].map(([, number]) => number))]

// --- Cleaning -----------------------------------------------------------------

const isRemote = url => /^([a-z][a-z\d+.-]*:|\/\/|\\\\)/i.test(url.trim())
const normalized = value => value.replace(/[\u0000- \u007F-\u009F]/g, '').toLowerCase()
const isScript = value => /(javascript|vbscript|livescript):/.test(normalized(value))
const isSafeData = value => /^data:image\/(png|gif|jpe?g|webp|avif);/.test(normalized(value))
const isBootstrap = url => /(^|[/@.-])bootstrap(?!-icons)([@/.-]|$)/i.test(url) && /\.(css|js)(\?|#|$)/i.test(url)

// Attributes that make the browser fetch something. `href` only on elements
// that load it: on a link, it waits for a click.
const LOADING_ATTRIBUTES = new Set(['src', 'srcset', 'imagesrcset', 'poster', 'background', 'data', 'lowsrc', 'dynsrc', 'ping', 'action', 'formaction', 'manifest', 'codebase', 'archive', 'longdesc', 'cite'])
const LOADING_HREF = new Set(['use', 'image', 'feimage', 'script', 'link', 'pattern', 'textpath', 'mpath', 'tref', 'filter', 'cursor'])
// Elements that run code, embed another page or change how the page loads.
const DROPPED = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'portal', 'base', 'meta', 'link', 'title', 'fencedframe'])
const BOOLEAN_ATTRIBUTES = ['allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected']

// A CSS value or rule loads something from another site, or runs code.
function loadsRemotely(value) {
  const unescaped = value.replace(/\\([\da-f]{1,6})\s?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16) || 0xFFFD)).replace(/\\(.)/g, '$1')
  const text = normalized(unescaped)
  if (/expression\(|-moz-binding|behavior:|javascript:|vbscript:/.test(text)) {
    return true
  }

  return [...text.matchAll(/(?:url|src|image|image-set|cross-fade|element)\(\s*(['"]?)([^'")]*)\1/g)]
    .some(([, , url]) => isRemote(url) && !isSafeData(url))
}

// CSS without `@import` and without declarations that load from another site.
export function cleanCss(css, removed = []) {
  let root
  try {
    root = postcss.parse(css)
  } catch (error) {
    removed.push(`CSS that doesn't parse (${error.reason ?? error.message})`)
    return ''
  }

  root.walkAtRules(rule => {
    if (/^(import|namespace)$/i.test(rule.name) || loadsRemotely(rule.params)) {
      removed.push(`CSS @${rule.name} ${rule.params}`)
      rule.remove()
    }
  })
  root.walkDecls(declaration => {
    if (loadsRemotely(declaration.value) || loadsRemotely(declaration.prop)) {
      removed.push(`CSS ${declaration.prop}: ${declaration.value}`)
      declaration.remove()
    }
  })
  return root.toString().trim()
}

// Sass where `@use`, `@forward` and `@import` only load Bootstrap or a Sass
// module, and nothing loads from another site. The rest is commented out.
export function cleanScss(scss, removed = []) {
  const lines = scss.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    // Every loader on the line, also nested in a rule (`.a { @import "x"; }`).
    const loaders = [...line.matchAll(/@(use|forward|import)\b\s*(['"]?)([^'";\s]*)/g)]
    const allowed = ([, , quote, target]) => quote && /^(bootstrap(\/|$)|sass:)/.test(target) && !target.includes('..')
    if (!loaders.every(allowed) || /\bload-css\(/.test(line) || loadsRemotely(line)) {
      // The whole statement, up to its `;`, when it spans lines (`with (`).
      let end = index
      while (end < lines.length - 1 && !lines[end].includes(';')) {
        end++
      }

      removed.push(`Sass ${lines.slice(index, end + 1).join(' ').trim()}`)
      for (let line = index; line <= end; line++) {
        lines[line] = `// Removed by import-issue: ${lines[line]}`
      }

      index = end
    }
  }

  return lines.join('\n')
}

// Cleans a parsed node's children in place: drops what runs code or loads from
// elsewhere, moves `<style>` to `css` and inline `<script>` to `js`.
function cleanNodes(parent, found) {
  for (const node of [...parent.childNodes ?? []]) {
    const name = node.tagName?.toLowerCase()
    if (node.nodeName === '#comment' || node.nodeName === '#documentType') {
      parent.childNodes.splice(parent.childNodes.indexOf(node), 1)
      continue
    }

    if (!name) {
      continue
    }

    const attribute = attr => node.attrs.find(({ name }) => name === attr)?.value
    if (name === 'style') {
      found.css.push(node.childNodes.map(child => child.value ?? '').join(''))
      parent.childNodes.splice(parent.childNodes.indexOf(node), 1)
      continue
    }

    if (DROPPED.has(name)) {
      const source = attribute('src') ?? attribute('href') ?? attribute('data')
      if (name === 'script' && !source) {
        found.js.push(node.childNodes.map(child => child.value ?? '').join(''))
      } else if (source && isBootstrap(source)) {
        found.bootstrap.push(source)
      } else if (!['title', 'meta'].includes(name) || attribute('http-equiv')) {
        found.removed.push(`<${name}>${source ? ` ${source}` : ''}`)
      }

      parent.childNodes.splice(parent.childNodes.indexOf(node), 1)
      continue
    }

    node.attrs = node.attrs.filter(({ name: attr, value }) => {
      const lower = attr.toLowerCase()
      let reason
      if (lower.startsWith('on') || lower === 'srcdoc') {
        reason = 'runs code'
      } else if (isScript(value)) {
        reason = 'a script URL'
      } else if ((LOADING_ATTRIBUTES.has(lower) || (/(^|:)href$/.test(lower) && LOADING_HREF.has(name))) && (isRemote(value) || /,\s*\S*:\/\//.test(value)) && !(lower === 'src' && isSafeData(value))) {
        reason = 'loads from another site'
      } else if (lower === 'style' && loadsRemotely(value)) {
        reason = 'loads from another site'
      }

      if (reason) {
        found.removed.push(`${attr}="${value.length > 80 ? `${value.slice(0, 80)}…` : value}" on <${name}> (${reason})`)
      }

      return !reason
    })

    cleanNodes(node, found)
    if (node.content) {
      cleanNodes(node.content, found)
    }
  }
}

// An issue's HTML block, whole document or fragment: `{ markup, css, js,
// bootstrap, removed }`. `markup` is the cleaned body; `bootstrap` lists the
// Bootstrap files it loaded, which the reproduction replaces with its own build.
export function cleanHtml(html) {
  const found = { css: [], js: [], bootstrap: [], removed: [] }
  const isDocument = /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html)
  let container
  if (isDocument) {
    const document = parse(html)
    const root = document.childNodes.find(node => node.tagName === 'html')
    const head = root.childNodes.find(node => node.tagName === 'head')
    const body = root.childNodes.find(node => node.tagName === 'body')
    cleanNodes(head, found)
    const bodyAttributes = body.attrs.map(({ name, value }) => `${name}="${value}"`).join(' ')
    if (bodyAttributes) {
      found.removed.push(`<body ${bodyAttributes}>'s attributes (the reproduction block has none)`)
    }

    container = body
  } else {
    container = parseFragment(html)
  }

  cleanNodes(container, found)
  let markup = serialize(container)
  for (const attribute of BOOLEAN_ATTRIBUTES) {
    markup = markup.replaceAll(` ${attribute}=""`, ` ${attribute}`)
  }

  return { ...found, markup: dedent(markup) }
}

// Text for an HTML comment: `--` can't appear in one.
export const commentText = text => text.replace(/--/g, '- -').replace(/[<>]/g, character => (character === '<' ? '‹' : '›'))

// JavaScript inside an inert `<script type="text/plain">`: it can't close
// the element or open a comment.
export const inertScript = code => code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--')

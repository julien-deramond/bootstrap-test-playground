import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  cleanHtml, extractExamples, parseAttributes, readExpression
} from '../lib/kitchen-sink.mjs'

const fixture = name => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../__fixtures__/mdx', name), 'utf8')
const getData = type => {
  if (type !== 'theme-colors') {
    throw new Error(`getData('${type}') is not supported`)
  }

  return [{ name: 'primary', title: 'Primary' }, { name: 'danger', title: 'Danger' }]
}

describe('readExpression', () => {
  test('stops at the closing brace', () => {
    assert.equal(readExpression('`a` } rest', 0), '`a` ')
  })

  test('keeps braces nested in objects and strings', () => {
    assert.equal(readExpression('{ a: "}" }, \'}\'} tail', 0), '{ a: "}" }, \'}\'')
  })

  test('follows ${…} inside template literals, nested ones too', () => {
    const code = '`x ${y({ z: `}${1}` })} }`'
    assert.equal(readExpression(`${code}} tail`, 0), code)
  })

  test('skips escaped backticks in templates', () => {
    assert.equal(readExpression('`a \\` }`} tail', 0), '`a \\` }`')
  })

  test('throws when the expression never ends', () => {
    assert.throws(() => readExpression('`a`', 0), /Unterminated/)
  })
})

describe('parseAttributes', () => {
  test('reads quoted and expression values', () => {
    assert.deepEqual(parseAttributes('width="200" height={120} class="x y"'), { width: '200', height: '120', class: 'x y' })
  })

  test('turns {false} into false', () => {
    assert.deepEqual(parseAttributes('text={false} title="T"'), { text: false, title: 'T' })
  })

  test('keeps dashes in names and ignores bare attributes', () => {
    assert.deepEqual(parseAttributes('data-x="1" hidden'), { 'data-x': '1' })
  })
})

describe('cleanHtml', () => {
  test('dedents everything after the first line and trims', () => {
    assert.equal(cleanHtml('<div>\n    <p>a</p>\n  </div>\n'), '<div>\n  <p>a</p>\n</div>')
  })

  test('renders <Placeholder /> as an svg with a label', () => {
    const html = cleanHtml('<Placeholder width="200" height="100" text="Hi" />')
    assert.match(html, /^<svg /)
    assert.match(html, /aria-label="Placeholder: Hi"/)
    assert.match(html, /width="200"/)
    assert.match(html, /<text [^>]*>Hi<\/text>/)
  })

  test('hides a Placeholder without title or text from assistive technologies', () => {
    const html = cleanHtml('<Placeholder title={false} text={false} />')
    assert.match(html, /aria-hidden="true"/)
    assert.doesNotMatch(html, /role="img"/)
  })

  test('renders <CloseButton /> with its dismiss and target', () => {
    assert.equal(cleanHtml('<CloseButton dismiss="alert" class="x" />'), '<button type="button" class="btn-close x" data-bs-dismiss="alert" aria-label="Close"></button>')
    assert.match(cleanHtml('<CloseButton />'), /^<button type="button" class="btn-close" aria-label="Close">/)
  })

  test('rewrites docs references and drops config markers', () => {
    assert.equal(cleanHtml('<a href="[[docsref:/x]]">x</a>[[config:y]]'), '<a href="#">x</a>')
    assert.equal(cleanHtml('<img src="/docs/6.0/assets/brand/bootstrap-logo.svg">'), '<img src="/favicon.svg">')
  })
})

describe('extractExamples', () => {
  test('reads a plain example with its heading', () => {
    const { examples, skipped } = extractExamples(fixture('plain.mdx'), getData)
    assert.deepEqual(skipped, [])
    assert.equal(examples.length, 1)
    assert.equal(examples[0].heading, 'Basic example')
    assert.equal(examples[0].html, '<button type="button" class="btn-solid theme-primary">Primary</button>')
  })

  test('evaluates getData and nested template literals, joins arrays, keeps the tag class', () => {
    const { examples, skipped } = extractExamples(fixture('nested.mdx'), getData)
    assert.deepEqual(skipped, [])
    assert.equal(examples.length, 2)
    assert.equal(examples[0].className, 'd-flex gap-2')
    assert.equal(examples[0].html.split('\n').length, 2)
    assert.match(examples[0].html, /theme-danger">Danger \{braces\}</)
    assert.equal(examples[1].heading, 'Second')
    assert.equal(examples[1].html, '<div class="a-} b-}">nested</div>')
  })

  test('cleans helpers and reports an example that throws, without dropping the others', () => {
    const { examples, skipped } = extractExamples(fixture('helpers.mdx'), getData)
    assert.equal(examples.length, 1)
    assert.match(examples[0].html, /<svg /)
    assert.match(examples[0].html, /btn-close/)
    assert.match(examples[0].html, /href="#"/)
    assert.equal(skipped.length, 1)
    assert.match(skipped[0], /^Broken \(getData\('nope'\) is not supported\)/)
  })

  test('finds nothing in a page without examples', () => {
    assert.deepEqual(extractExamples('# Title\n\nJust prose.\n', getData), { examples: [], skipped: [] })
  })
})

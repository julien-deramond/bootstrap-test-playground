import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { after, before, describe, test } from 'node:test'
import { makeTree } from '../__fixtures__/tree.mjs'

// configs.mjs reads PLAYGROUND_ROOT when it loads, so point it at a temp tree first.
const tree = makeTree()
process.env.PLAYGROUND_ROOT = tree
const configs = await import('../lib/configs.mjs')

const write = (file, content) => {
  fs.mkdirSync(path.dirname(path.join(tree, file)), { recursive: true })
  fs.writeFileSync(path.join(tree, file), content)
}

after(() => fs.rmSync(tree, { recursive: true, force: true }))

describe('listConfigs', () => {
  test('lists configs with a main.scss, default first', () => {
    write('configs/alpha/main.scss', '@use "bootstrap/scss/bootstrap";\n')
    write('configs/alpha/README.md', '# alpha\n\nAlpha description\nspans lines.\n\nCategory: shape\n')
    write('configs/not-a-config/README.md', 'no main.scss here\n')
    const list = configs.listConfigs()
    assert.deepEqual(list.map(config => config.name), ['default', 'alpha'])
    assert.equal(list[1].description, 'Alpha description spans lines.')
    assert.equal(list[1].category, 'shape')
  })
})

describe('categories', () => {
  const readme = content => {
    write('configs/cat/README.md', content)
    return path.join(tree, 'configs/cat')
  }

  test('readCategory reads the Category line', () => {
    assert.equal(configs.readCategory(readme('# cat\n\nText\n\nCategory: color\n')), 'color')
  })

  test('readCategory falls back to other for no line or an unknown id', () => {
    assert.equal(configs.readCategory(readme('# cat\n\nText\n')), 'other')
    assert.equal(configs.readCategory(readme('Text\n\nCategory: nope\n')), 'other')
    assert.equal(configs.readCategoryLine(readme('Text\n\nCategory: nope\n')), 'nope')
  })

  test('writeCategory replaces the line in place', () => {
    const dir = readme('# cat\n\nText\n\nCategory: color\n\n## More\n')
    configs.writeCategory(path.join(dir, 'README.md'), 'shape')
    assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), '# cat\n\nText\n\nCategory: shape\n\n## More\n')
  })

  test('writeCategory adds the line after the description, leaving the rest alone', () => {
    const dir = readme('# cat\n\nText\n\n## More\n')
    configs.writeCategory(path.join(dir, 'README.md'), 'layout')
    assert.equal(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'), '# cat\n\nText\n\nCategory: layout\n\n## More\n')
  })
})

describe('readColorModes', () => {
  test('finds custom modes in selectors and color-mode() calls, not light and dark, not comments', () => {
    write('configs/modes/main.scss', '@use "bootstrap/scss/bootstrap";\n// [data-bs-theme="ignored"]\n')
    write('configs/modes/tokens.css', '/* [data-bs-theme="hidden"] */\n[data-bs-theme="sepia"] { }\n[data-bs-theme="dark"] { }\n')
    write('configs/modes/_custom.scss', '@include color-mode(ocean) { }\n@include color-mode("light") { }\n')
    assert.deepEqual(configs.readColorModes(path.join(tree, 'configs/modes')).sort(), ['ocean', 'sepia'])
  })
})

describe('readPartials', () => {
  test('is null when the config loads all of Bootstrap', () => {
    assert.equal(configs.readPartials(path.join(tree, 'configs/alpha')), null)
  })

  test('lists the partials a config loads', () => {
    write('configs/partial-x/main.scss', '@use "bootstrap/scss/root";\n@use "bootstrap/scss/utilities/api";\n// @use "bootstrap/scss/forms";\n')
    assert.deepEqual(configs.readPartials(path.join(tree, 'configs/partial-x')), ['root', 'utilities/api'])
  })
})

describe('isTokensOnly', () => {
  test('is true when only tokens.css differs from the default', () => {
    const main = fs.readFileSync(path.join(tree, 'configs/default/main.scss'), 'utf8')
    write('configs/tokens-x/main.scss', `// a different comment\n${main}`)
    fs.cpSync(path.join(tree, 'configs/default/_custom.scss'), path.join(tree, 'configs/tokens-x/_custom.scss'))
    write('configs/tokens-x/tokens.css', ':root { --bs-x: 1; }\n')
    assert.equal(configs.isTokensOnly(path.join(tree, 'configs/tokens-x')), true)
  })

  test('is false when main.scss differs', () => {
    assert.equal(configs.isTokensOnly(path.join(tree, 'configs/alpha')), false)
  })
})

describe('copyStyles', () => {
  test('copies the style files that exist and transforms them', () => {
    write('from/main.scss', 'a')
    write('from/tokens.css', 'b')
    write('from/other.txt', 'c')
    configs.copyStyles(path.join(tree, 'from'), path.join(tree, 'to'), (content, file) => `${file}:${content}`)
    assert.deepEqual(fs.readdirSync(path.join(tree, 'to')).sort(), ['main.scss', 'tokens.css'])
    assert.equal(fs.readFileSync(path.join(tree, 'to/main.scss'), 'utf8'), 'main.scss:a')
  })
})

describe('updateConfigsReadme', () => {
  test('writes the table, then reports no change, and --check does not write', () => {
    assert.equal(configs.updateConfigsReadme(), true)
    const written = fs.readFileSync(path.join(tree, 'configs/README.md'), 'utf8')
    assert.match(written, /\| \[`alpha`\]\(alpha\/\) \| Alpha description spans lines\. \| – \| No \|/)
    assert.equal(configs.updateConfigsReadme({ check: true }), false)

    write('configs/zeta/main.scss', '@use "bootstrap/scss/bootstrap";\n')
    assert.equal(configs.updateConfigsReadme({ check: true }), true)
    assert.equal(fs.readFileSync(path.join(tree, 'configs/README.md'), 'utf8'), written)
  })
})

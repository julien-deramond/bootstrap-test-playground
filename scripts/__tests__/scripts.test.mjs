// new-issue, save-config and use-config run as the CLIs they are, against a temp copy of the minimum tree.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { makeTree, runScript } from '../__fixtures__/tree.mjs'

let tree
const read = file => fs.readFileSync(path.join(tree, file), 'utf8')
const exists = file => fs.existsSync(path.join(tree, file))

beforeEach(() => {
  tree = makeTree()
})

afterEach(() => {
  fs.rmSync(tree, { recursive: true, force: true })
})

describe('new-issue', () => {
  test('creates issues/<name>/ from the template and the default config', () => {
    const { status, stdout } = runScript(tree, 'new-issue.mjs', ['pg-12'])
    assert.equal(status, 0)
    assert.match(stdout, /Created issues\/pg-12\//)
    for (const file of ['index.html', 'main.scss', '_custom.scss', 'tokens.css']) {
      assert.ok(exists(`issues/pg-12/${file}`), file)
    }

    const html = read('issues/pg-12/index.html')
    assert.doesNotMatch(html, /__[A-Z]+__/)
    assert.match(html, /julien-deramond\/bootstrap-test-playground#12/)
    assert.equal(exists('issues/pg-12/repro.spec.js'), false)
  })

  test('an upstream issue number is reported upstream', () => {
    assert.equal(runScript(tree, 'new-issue.mjs', ['#42928']).status, 0)
    const html = read('issues/42928/index.html')
    assert.match(html, /twbs\/bootstrap#42928/)
    assert.match(html, /reported/)
  })

  test('--spec adds a repro.spec.js named after the issue', () => {
    assert.equal(runScript(tree, 'new-issue.mjs', ['pg-13', '--spec']).status, 0)
    assert.match(read('issues/pg-13/repro.spec.js'), /pg-13/)
    assert.doesNotMatch(read('issues/pg-13/repro.spec.js'), /__NAME__/)
  })

  test('refuses an invalid name, an existing folder and an unknown config', () => {
    assert.equal(runScript(tree, 'new-issue.mjs', ['Bad Name']).status, 1)
    assert.equal(runScript(tree, 'new-issue.mjs').status, 1)
    assert.equal(runScript(tree, 'new-issue.mjs', ['pg-1']).status, 0)
    const again = runScript(tree, 'new-issue.mjs', ['pg-1'])
    assert.equal(again.status, 1)
    assert.match(again.stderr, /already exists/)
    const unknown = runScript(tree, 'new-issue.mjs', ['pg-2', '--config', 'nope'])
    assert.equal(unknown.status, 1)
    assert.match(unknown.stderr, /Unknown config "nope"/)
    assert.equal(exists('issues/pg-2'), false)
  })

  test('--config working copies src/styles/', () => {
    fs.appendFileSync(path.join(tree, 'src/styles/tokens.css'), '\n:root { --bs-test-marker: 1; }\n')
    assert.equal(runScript(tree, 'new-issue.mjs', ['pg-3', '--config', 'working']).status, 0)
    assert.match(read('issues/pg-3/tokens.css'), /--bs-test-marker/)
  })
})

describe('save-config', () => {
  test('snapshots src/styles/ into configs/<name>/ with a README and a table row', () => {
    fs.appendFileSync(path.join(tree, 'src/styles/tokens.css'), '\n:root { --bs-test-marker: 1; }\n')
    const { status, stdout } = runScript(tree, 'save-config.mjs', ['mine', 'My description', '--category', 'color'])
    assert.equal(status, 0, stdout)
    assert.match(read('configs/mine/tokens.css'), /--bs-test-marker/)
    const readme = read('configs/mine/README.md')
    assert.match(readme, /^# mine/)
    assert.match(readme, /My description/)
    assert.match(readme, /^Category: color$/m)
    assert.match(read('configs/README.md'), /\[`mine`\]\(mine\/\) \| My description/)
  })

  test('refuses default, a bad name, an unknown category and an existing config without --force', () => {
    assert.match(runScript(tree, 'save-config.mjs', ['default']).stderr, /stays pristine/)
    assert.equal(runScript(tree, 'save-config.mjs', ['Bad_Name']).status, 1)
    assert.match(runScript(tree, 'save-config.mjs', ['x', '--category', 'nope']).stderr, /Unknown category/)
    assert.equal(runScript(tree, 'save-config.mjs', ['mine', '--category', 'shape']).status, 0)
    assert.match(runScript(tree, 'save-config.mjs', ['mine']).stderr, /already exists/)
  })

  test('--force keeps the README and swaps the description and category', () => {
    runScript(tree, 'save-config.mjs', ['mine', 'First', '--category', 'shape'])
    const { status } = runScript(tree, 'save-config.mjs', ['mine', 'Second', '--category', 'layout', '--force'])
    assert.equal(status, 0)
    const readme = read('configs/mine/README.md')
    assert.match(readme, /Second/)
    assert.doesNotMatch(readme, /First/)
    assert.match(readme, /^Category: layout$/m)
  })
})

describe('use-config', () => {
  test('replaces src/styles/ with the config', () => {
    runScript(tree, 'save-config.mjs', ['mine', '--category', 'shape'])
    fs.writeFileSync(path.join(tree, 'configs/mine/tokens.css'), ':root { --bs-from-mine: 1; }\n')
    const { status, stdout } = runScript(tree, 'use-config.mjs', ['mine'])
    assert.equal(status, 0)
    assert.match(stdout, /now uses configs\/mine\//)
    assert.match(read('src/styles/tokens.css'), /--bs-from-mine/)
  })

  test('lists the available configs for an unknown name or none', () => {
    for (const args of [['nope'], []]) {
      const { status, stderr } = runScript(tree, 'use-config.mjs', args)
      assert.equal(status, 1)
      assert.match(stderr, /Available configs: default/)
    }
  })
})

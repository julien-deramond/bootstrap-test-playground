// Fixed when `color-contrast()` compiles for a plain Sass color and for a color
// of Bootstrap's own palette. It never drives the page: the bug is a Sass
// compile error, so the spec compiles the snippets in Node, the way
// `scripts/lib/compile.mjs` does, against the Bootstrap the playground builds
// with (`BOOTSTRAP_PATH` and `--pr` installs included).
//
// The verdict is only whether both compile. Which color comes back is not
// checked, so a fix that maps the gamut differently still passes.
import { loadEnv } from 'vite'
import { bootstrapSource } from '../../scripts/lib/bootstrap.mjs'
import { compileSource } from '../../scripts/lib/compile.mjs'
import { root } from '../../scripts/lib/configs.mjs'
import { test } from '../../tests/issues/fixtures.js'

const snippets = {
  'color-contrast(#0d6efd)': '@use "bootstrap/scss/functions" as *;\n.a { color: color-contrast(#0d6efd); }',
  'color-contrast($blue)': '@use "bootstrap/scss/functions" as *;\n@use "bootstrap/scss/colors" as *;\n.a { color: color-contrast($blue); }'
}

test('color-contrast() compiles for a Sass color and for $blue', async ({ repro }) => {
  const { dir } = bootstrapSource(loadEnv('production', root, ''))
  const bootstrapDir = dir ?? `${root}/node_modules/bootstrap`
  const failures = []

  for (const [call, source] of Object.entries(snippets)) {
    try {
      const { css } = await compileSource(source, { bootstrapDir, logger: { warn() {}, debug() {} } })
      if (!/color:\s*\S/.test(css)) {
        failures.push(`${call}: compiled without a color`)
      }
    } catch (error) {
      failures.push(`${call}: ${String(error.sassMessage ?? error.message).split('\n')[0]}`)
    }
  }

  repro.verdict(failures.length === 0, failures.length ? failures.join(' | ') : 'both calls compile and return a color')
})

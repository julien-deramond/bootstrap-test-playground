// Fixed when `@use "bootstrap/scss/mixins" as *` gives the documented grid,
// breakpoint and focus ring mixins. The bug is in Sass, not in a rendering, so
// the spec compiles one snippet per mixin family, as a reader of the docs
// would write them, and reports which ones fail with "Undefined mixin".
import path from 'node:path'
import { compileString } from 'sass-embedded'
import { root } from '../../scripts/lib/configs.mjs'
import { test } from '../../tests/issues/fixtures.js'

const snippets = {
  'make-row()': '.example-row { @include make-row(); }',
  'make-col()': '.example-col { @include make-col(6); }',
  'focus-ring()': '.a:focus-visible { @include focus-ring(true); }',
  'media-breakpoint-up()': '.b { @include media-breakpoint-up(md) { color: red; } }'
}

test('the documented mixins come from bootstrap/scss/mixins', async ({ repro }) => {
  const failing = []
  for (const [name, code] of Object.entries(snippets)) {
    try {
      compileString(`@use "bootstrap/scss/mixins" as *;\n${code}`, {
        loadPaths: [path.join(root, 'node_modules')],
        quietDeps: true,
        silenceDeprecations: ['import']
      })
    } catch (error) {
      if (!/Undefined mixin/.test(error.message)) {
        throw error
      }

      failing.push(name)
    }
  }

  repro.verdict(failing.length === 0,
    failing.length ? `Undefined mixin through bootstrap/scss/mixins: ${failing.join(', ')}` : 'every snippet compiles')
})

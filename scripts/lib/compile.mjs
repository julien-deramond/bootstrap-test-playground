// Compiles a config's `main.scss` the way Vite does: Sass with `bootstrap/…`
// resolved like Vite's alias, then this project's postcss.config.js. Shared by
// the check and audit scripts.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import postcss from 'postcss'
import * as sass from 'sass-embedded'
import postcssConfig from '../../postcss.config.js'

// `bootstrap/…` resolves to node_modules or to the BOOTSTRAP_PATH checkout.
export const bootstrapImporter = bootstrapDir => ({
  findFileUrl: url => (url.startsWith('bootstrap/') ? pathToFileURL(path.join(bootstrapDir, url.slice('bootstrap/'.length))) : null)
})

// Resolves to PostCSS's result: `.css`, and `.root` to walk. With `sourceMap`,
// `node.source.input.origin(line, column)` points back to the Sass source.
// `style: 'compressed'` minifies.
export async function compileConfig(file, { bootstrapDir, logger, sourceMap = false, style }) {
  const { css, sourceMap: map } = await sass.compileAsync(file, { importers: [bootstrapImporter(bootstrapDir)], logger, sourceMap, style })
  return postcss(postcssConfig.plugins).process(css, { from: file, map: sourceMap && { prev: map, inline: false, annotation: false } })
}

// The same for Sass source code, like `@use "bootstrap/scss/bootstrap" with (…)`.
// `compiler` is an optional `sass.initAsyncCompiler()`, to run many at once.
export async function compileSource(source, { bootstrapDir, logger, compiler = sass }) {
  const url = pathToFileURL(path.join(bootstrapDir, 'scss/virtual.scss'))
  const { css } = await compiler.compileStringAsync(source, { url, importers: [bootstrapImporter(bootstrapDir)], logger })
  return postcss(postcssConfig.plugins).process(css, { from: undefined })
}

export const processCss = (css, from) => postcss(postcssConfig.plugins).process(css, { from })

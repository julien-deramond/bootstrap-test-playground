// Compiles a config's `main.scss` the way Vite does: Sass with `bootstrap/…`
// resolved like Vite's alias, then this project's postcss.config.js. Shared by
// scripts/check-configs.mjs and scripts/check-dist.mjs.
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
export async function compileConfig(file, { bootstrapDir, logger, sourceMap = false }) {
  const { css, sourceMap: map } = await sass.compileAsync(file, { importers: [bootstrapImporter(bootstrapDir)], logger, sourceMap })
  return postcss(postcssConfig.plugins).process(css, { from: file, map: sourceMap && { prev: map, inline: false, annotation: false } })
}

export const processCss = (css, from) => postcss(postcssConfig.plugins).process(css, { from })

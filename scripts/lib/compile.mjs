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

export async function compileConfig(file, { bootstrapDir, logger }) {
  const { css } = await sass.compileAsync(file, { importers: [bootstrapImporter(bootstrapDir)], logger })
  return (await postcss(postcssConfig.plugins).process(css, { from: file })).css
}

export const processCss = (css, from) => postcss(postcssConfig.plugins).process(css, { from })

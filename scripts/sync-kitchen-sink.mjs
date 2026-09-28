#!/usr/bin/env node
// Regenerates kitchen-sink/*.html from the live examples in Bootstrap's docs
// (site/src/content/docs/{components,forms}/*.mdx), so the kitchen sink always
// uses the current v6 markup. The generator lives in scripts/lib/kitchen-sink.mjs.
//
// The npm package does not ship the docs, so this needs a Bootstrap checkout:
//   npm run sync-kitchen-sink -- ../twbs/bootstrap
// or set BOOTSTRAP_PATH in .env.local and run `npm run sync-kitchen-sink`.
// With BOOTSTRAP_PATH, the dev server also resyncs a page when its MDX changes.

import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { root } from './lib/configs.mjs'
import { docsDir, outDir, pageFile, readPages, renderPage } from './lib/kitchen-sink.mjs'

const bootstrapPath = process.argv[2] ?? loadEnv('development', root, '').BOOTSTRAP_PATH
if (!bootstrapPath) {
  console.error('Usage: npm run sync-kitchen-sink -- <path/to/bootstrap>  (or set BOOTSTRAP_PATH in .env.local)')
  process.exit(1)
}

const bootstrapDir = path.resolve(root, bootstrapPath)
if (!fs.existsSync(docsDir(bootstrapDir))) {
  console.error(`No Bootstrap docs found in ${docsDir(bootstrapDir)}`)
  process.exit(1)
}

const { pages, skipped } = readPages(bootstrapDir)
for (const line of skipped) {
  console.warn(line)
}

for (const file of fs.readdirSync(outDir).filter(name => name.endsWith('.html'))) {
  fs.rmSync(path.join(outDir, file))
}

for (const page of pages) {
  fs.writeFileSync(pageFile(page), renderPage(page, pages))
}

const total = pages.reduce((sum, page) => sum + page.examples.length, 0)
console.log(`Wrote ${pages.length} pages (${total} examples) to kitchen-sink/ from ${path.relative(root, bootstrapDir) || bootstrapDir}`)

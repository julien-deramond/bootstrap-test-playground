#!/usr/bin/env node
// Exports reproductions for upstream maintainers, who can open them without
// cloning this repository (see scripts/lib/export-issue.mjs):
//
//   dist/exports/<name>.html              one HTML file, Bootstrap from jsDelivr or inlined
//   dist/exports/<name>/                  a Vite + Sass project: npm install && npm run dev
//   dist/exports/<name>-stackblitz.html   opens that project in StackBlitz
//
// Usage: npm run export-issue <name>... | --all
//
// The toolbar of a reproduction has the same exports: Export HTML and
// Open in StackBlitz. `npm run build` empties dist/, exports included.
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { fail, root } from './lib/configs.mjs'
import { exportIssue, listReproductions, stackblitzLauncher } from './lib/export-issue.mjs'

const USAGE = 'Usage: npm run export-issue <name>... | -- --all   (e.g. npm run export-issue 42754)'
let values
let positionals
try {
  ({ values, positionals } = parseArgs({ options: { all: { type: 'boolean', default: false } }, allowPositionals: true }))
} catch (error) {
  fail(`${error.message}\n${USAGE}`)
}

const available = listReproductions()
const names = values.all ? available : positionals.map(name => name.replace(/^#/, ''))
if (names.length === 0) {
  fail(USAGE)
}

const unknown = names.filter(name => !available.includes(name))
if (unknown.length > 0) {
  fail(`Unknown reproduction: ${unknown.join(', ')}. Available: ${available.join(', ')}`)
}

const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const outDir = path.join(root, 'dist/exports')
fs.mkdirSync(outDir, { recursive: true })

let failed = false
for (const name of names) {
  let result
  try {
    result = await exportIssue(name, { bootstrap })
  } catch (error) {
    console.error(`✘ ${name}: ${error.message}`)
    failed = true
    continue
  }

  const { html, project, warnings } = result
  const projectDir = path.join(outDir, name)
  fs.rmSync(projectDir, { recursive: true, force: true })
  for (const [file, content] of Object.entries(project.files)) {
    fs.mkdirSync(path.dirname(path.join(projectDir, file)), { recursive: true })
    fs.writeFileSync(path.join(projectDir, file), content)
  }

  fs.writeFileSync(path.join(outDir, `${name}.html`), html)
  fs.writeFileSync(path.join(outDir, `${name}-stackblitz.html`), stackblitzLauncher(project))

  const relative = file => path.relative(root, path.join(outDir, file))
  console.log(`✔ ${name}  ${relative(`${name}.html`)} (${Math.round(Buffer.byteLength(html) / 1024)} kB), ${relative(name)}/, ${relative(`${name}-stackblitz.html`)}`)
  for (const warning of warnings) {
    console.log(`  ! ${warning}`)
  }
}

process.exitCode = failed ? 1 : 0

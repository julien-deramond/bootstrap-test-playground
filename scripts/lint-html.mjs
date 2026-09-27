#!/usr/bin/env node
// Validates the HTML of every page with html-validate, the validator Bootstrap
// uses for its docs. Invalid markup (a <div> inside a <button>, a duplicate
// id, an unknown element) can hide or fake a Bootstrap bug.
// Usage: npm run lint:html [-- --all]
//
// Checks the source files: the home page, compare.html, sizes.html, every page of every
// group (pages/, screens/, kitchen-sink/, issues/) and the reproduction
// template. The toolbar is added at runtime, so it isn't part of them.
//
// The rules are html-validate's `standard` preset: validity, not style.
// Bootstrap's own docs config (`build/html-validate.mjs`) only checks
// duplicate ids. Kitchen sink pages are generated from the docs, so an error
// there is an upstream docs bug: it gets a tracking issue and an entry in
// scripts/known-html.mjs, like any other finding. Exits non-zero on a new
// error or on a known entry that no longer matches anything.

import path from 'node:path'
import { HtmlValidate } from 'html-validate'
import { root } from './lib/configs.mjs'
import { collectPages, findHtmlFiles } from './lib/pages.mjs'
import known from './known-html.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-html.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.rule} ${entry.file}`)
  }
}

const showAll = process.argv.includes('--all')

const validator = new HtmlValidate({
  extends: ['html-validate:standard']
})

const files = [
  path.join(root, 'index.html'),
  path.join(root, 'compare.html'),
  path.join(root, 'sizes.html'),
  ...collectPages('/').flatMap(({ dir }) => findHtmlFiles(path.join(root, dir))),
  path.join(root, 'scripts/templates/issue/index.html')
]

const findings = []
for (const file of files) {
  const report = await validator.validateFile(file)
  for (const result of report.results) {
    for (const message of result.messages) {
      if (message.severity === 2) {
        findings.push({ file: path.relative(root, file), line: message.line, rule: message.ruleId, message: message.message })
      }
    }
  }
}

const matches = (entry, finding) => entry.rule === finding.rule &&
  (entry.file instanceof RegExp ? entry.file.test(finding.file) : finding.file === entry.file) &&
  (!entry.message || entry.message.test(finding.message))
const entryOf = finding => known.find(entry => matches(entry, finding))
const used = new Set(findings.map(entryOf).filter(Boolean))
const fresh = findings.filter(finding => !entryOf(finding))

const dupIds = findings.filter(finding => finding.rule === 'no-dup-id')
console.log(`${files.length} files, ${findings.length} errors (${dupIds.length} duplicate ids)`)
console.log(`${fresh.length ? '✗' : '✓'} ${findings.length - fresh.length} known, ${fresh.length} new\n`)

// By file, so duplicate ids read per page.
const listed = showAll ? findings : fresh
for (const file of [...new Set(listed.map(finding => finding.file))]) {
  console.log(`  ${file}`)
  for (const finding of listed.filter(item => item.file === file)) {
    const entry = entryOf(finding)
    console.log(`    ${finding.line}  ${finding.message}  (${finding.rule})${entry ? `  (${entry.issue ? `#${entry.issue}` : entry.reason})` : ''}`)
  }
}

const stale = known.filter(entry => !used.has(entry))
for (const entry of stale) {
  console.log(`\n✗ Known entry no longer found, remove it from scripts/known-html.mjs: ${entry.rule} ${entry.file}${entry.issue ? ` (#${entry.issue})` : ''}`)
  if (entry.issue) {
    console.log(`  If Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (fresh.length) {
  console.log('\nFix errors in the playground’s own pages. In kitchen-sink/, which is generated from Bootstrap’s docs,')
  console.log('an error is an upstream docs bug: open a tracking issue labeled `upstream` (see "Upstream issue tracking"')
  console.log('in CLAUDE.md), then add it to scripts/known-html.mjs with `issue: <n>`.')
}

process.exitCode = fresh.length || stale.length ? 1 : 0

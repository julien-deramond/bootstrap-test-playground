#!/usr/bin/env node
// Compiles every config the way Vite does (Sass, then postcss.config.js) and
// reports errors and warnings per folder: the working copy (src/styles/),
// every saved config (configs/<name>/) and every reproduction (issues/<name>/).
// Usage: npm run check-configs [-- --strict]
//   Exits non-zero on a compile error, and with --strict on any warning too.
//   Honors BOOTSTRAP_PATH from .env.local, like the dev server.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig, processCss } from './lib/compile.mjs'
import { root, styleFolders } from './lib/configs.mjs'

const strict = process.argv.includes('--strict')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')

const folders = styleFolders()

// A file as the report shows it: `configs/shadcn/main.scss`, or
// `bootstrap/scss/_root.scss` for Bootstrap's own files.
function display(file) {
  return file.startsWith(bootstrapDir + path.sep) ?
    `bootstrap/${path.relative(bootstrapDir, file)}` :
    path.relative(root, file)
}

// Sass writes stack paths relative to its compiler's folder in node_modules,
// like `../../../configs/x/_custom.scss`, so look the path up in this
// repository, then in Bootstrap's `scss/` folder.
function stackFile(file) {
  const trimmed = file.replace(/^(?:\.\.\/)+/, '')
  const inBootstrap = trimmed.match(/(?:^|\/)(scss\/.*)$/)?.[1]
  return [path.join(root, trimmed), inBootstrap && path.join(bootstrapDir, inBootstrap)]
    .find(candidate => candidate && fs.existsSync(candidate)) ?? path.resolve(root, file)
}

// `{ file, line, column }` (1-based) from a Sass span.
const fromSpan = span => (span?.url ? { file: fileURLToPath(span.url), line: span.start.line + 1, column: span.start.column + 1 } : undefined)

const format = where => (where ? `${display(where.file)}:${where.line}:${where.column}` : '')

// Annotations on the pull request's "Files changed" tab, for files of this repository.
function annotate(level, message, where) {
  if (!process.env.GITHUB_ACTIONS) {
    return
  }

  const file = where && display(where.file)
  const position = file && !file.startsWith('bootstrap/') && !file.startsWith('..') ? ` file=${file},line=${where.line},col=${where.column}` : ''
  console.log(`::${level}${position}::${message.replace(/%/g, '%25').replace(/\r?\n/g, '%0A')}`)
}

async function check(folder) {
  const warnings = []
  const logger = {
    // `@warn` has no span, only a stack: `configs/x/_custom.scss 14:1  root stylesheet`.
    warn(message, { deprecation, deprecationType, span, stack }) {
      const [, file, line, column] = stack?.match(/^(\S+) (\d+):(\d+)/) ?? []
      warnings.push({
        message: deprecation ? `Deprecation [${deprecationType?.id ?? 'unknown'}]: ${message}` : message,
        where: fromSpan(span) ?? (file ? { file: stackFile(file), line: Number(line), column: Number(column) } : undefined)
      })
    },
    debug() {}
  }

  try {
    await compileConfig(path.join(folder, 'main.scss'), { bootstrapDir, logger })
    const tokens = path.join(folder, 'tokens.css')
    if (fs.existsSync(tokens)) {
      await processCss(fs.readFileSync(tokens, 'utf8'), tokens)
    }

    return { warnings }
  } catch (error) {
    // Sass errors carry a span; PostCSS errors a file, line and column.
    const where = fromSpan(error.span) ?? (error.file ? { file: error.file, line: error.line, column: error.column } : undefined)
    return { warnings, error: { message: error.sassMessage ?? error.reason ?? error.message, where } }
  }
}

console.log(`Bootstrap: ${bootstrap.label}\n`)

let errors = 0
let warningCount = 0
let upstreamWarnings = 0

for (const folder of folders) {
  const name = path.relative(root, folder)
  const { warnings, error } = await check(folder)
  warningCount += warnings.length

  if (error) {
    errors++
    console.log(`✗ ${name}: ${error.message}`)
    if (error.where) {
      console.log(`    at ${format(error.where)}`)
    }

    annotate('error', `${name}: ${error.message}`, error.where)
  } else {
    console.log(`${warnings.length ? '!' : '✓'} ${name}${warnings.length ? `: ${warnings.length} warning${warnings.length > 1 ? 's' : ''}` : ''}`)
  }

  for (const { message, where } of warnings) {
    if (where && display(where.file).startsWith('bootstrap/')) {
      upstreamWarnings++
    }

    console.log(`    ${message.split('\n').join('\n    ')}`)
    if (where) {
      console.log(`      at ${format(where)}`)
    }

    annotate('warning', `${name}: ${message}`, where)
  }
}

console.log(`\n${folders.length} folders, ${errors} with errors, ${warningCount} warnings`)

if (upstreamWarnings) {
  console.log(`\n${upstreamWarnings} of the warnings come from Bootstrap's own files: open a tracking issue in this repository labeled`)
  console.log('`upstream` for each distinct warning, unless one exists (see "Upstream issue tracking" in CLAUDE.md).')
}

if (errors || (strict && warningCount)) {
  process.exit(1)
}

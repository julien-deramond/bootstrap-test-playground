#!/usr/bin/env node
// Audits configs/default's compiled CSS for declarations that depend on the
// physical left and right. Bootstrap v6 has no RTL stylesheet: it relies on
// logical properties, so each of these either renders the same in RTL by
// design or is an RTL bug.
// Usage: npm run audit-rtl [-- --all | --render]
//
// What counts as physical:
//   - property: `left`, `margin-right`, `border-top-left-radius`…
//   - value: `left`/`right` keywords (`background-position: right …`,
//     `to right` gradients), an x offset (`translateX(…)`, `translate(x, y)`,
//     a non-centered `transform-origin`), a rotation, a mirror (`scaleX(-1)`)
//     or a gradient angle that isn't vertical
//   - shorthand: `margin`, `padding`, `inset`, `border-radius`… whose left
//     and right sides differ
//   - shadow: a box or text shadow with an x offset
// Custom properties are checked by value, so `--select-bg-position: right …`
// counts. Not reported, because they render the same in both directions:
//   - symmetric: `left: 0` with `right: 0` in the same rule, and so on
//   - centered: `left: 50%` with `translateX(-50%)` in the same rule
//   - compensated: a rule under `:dir(rtl)` or `[dir=rtl]` sets the same
//     property on the same selector
// Known findings are listed in scripts/known-rtl.mjs. The report only shows
// the others, or all of them with --all. Exits non-zero on a new finding or on
// a known entry that no longer matches anything.
//
// --render screenshots every kitchen sink example in LTR and RTL, mirrors the
// RTL one and compares it with the LTR one. See scripts/lib/render-rtl.mjs.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { bootstrapSource } from './lib/bootstrap.mjs'
import { compileConfig } from './lib/compile.mjs'
import { root } from './lib/configs.mjs'
import known from './known-rtl.mjs'
import { renderRtl } from './lib/render-rtl.mjs'

// Bugs are tracked, intended findings explained: see "Upstream issue tracking" in CLAUDE.md.
for (const entry of known) {
  if (Boolean(entry.issue) === Boolean(entry.reason)) {
    throw new Error(`scripts/known-rtl.mjs: each entry needs either an \`issue\` or a \`reason\`: ${entry.selector}`)
  }
}

const showAll = process.argv.includes('--all')
const bootstrap = bootstrapSource(loadEnv('production', root, ''))
const bootstrapDir = bootstrap.dir ?? path.join(root, 'node_modules/bootstrap')
const quiet = { warn() {}, debug() {} }

console.log(`Bootstrap: ${bootstrap.label}\n`)

if (process.argv.includes('--render')) {
  process.exitCode = await renderRtl()
  process.exit()
}

// --- Parsing helpers --------------------------------------------------------

// Splits on top-level separators only, so `calc(a - b)` stays one token.
function splitTop(value, separator) {
  const parts = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') {
      depth++
    } else if (char === ')') {
      depth--
    }

    if (depth === 0 && separator.test(char)) {
      if (current.trim()) {
        parts.push(current.trim())
      }

      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

const isZero = token => /^[-+]?0*\.?0+(px|rem|em|%)?$/.test(token)
// `var(--bs-popover-arrow-height)` names say nothing about direction.
const withoutNames = value => value.replace(/var\(\s*--[\w-]+/g, 'var(').replace(/url\([^)]*\)|"[^"]*"|'[^']*'/g, '')

function degrees(angle) {
  const match = angle.match(/^([-+]?[\d.]+)(deg|turn|rad|grad)$/)
  if (!match) {
    return null
  }

  const factor = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 }[match[2]]
  return Number(match[1]) * factor
}

// Rotations and gradient angles that a mirror changes: anything but a multiple of 180°.
const directionalAngle = angle => {
  const value = degrees(angle)
  return value !== null && Math.abs(Math.round(value) % 180) !== 0
}

// Every call to one of `names` in a value, with its arguments, however deep
// the nesting: `translateX(calc(-100% - var(--x)))`.
function calls(value, names) {
  const found = []
  for (const match of value.matchAll(new RegExp(`\\b(${names.join('|')})\\(`, 'g'))) {
    let depth = 1
    let index = match.index + match[0].length
    while (index < value.length && depth) {
      depth += value[index] === '(' ? 1 : value[index] === ')' ? -1 : 0
      index++
    }

    found.push({ name: match[1], args: value.slice(match.index + match[0].length, index - 1) })
  }

  return found
}

// The first argument of `translateX(…)`, `translate(…)`, `translate3d(…)`.
function translateX(value) {
  const xs = []
  for (const { name, args } of calls(value, ['translateX', 'translate3d', 'translate'])) {
    const x = splitTop(args, /,/)[0]
    if (x && !isZero(x)) {
      xs.push({ name, x })
    }
  }

  return xs
}

const SHORTHANDS = new Set(['margin', 'padding', 'inset', 'border-width', 'border-color', 'border-style', 'scroll-margin', 'scroll-padding'])
const ORIGINS = new Set(['transform-origin', 'perspective-origin', 'background-position', 'mask-position', 'object-position'])
const PHYSICAL_PROPERTY = /^(left|right)$|^(margin|padding|border|scroll-margin|scroll-padding)-(left|right)(-|$)|^border-(top|bottom)-(left|right)-radius$|^(background|mask)-position-x$/

function asymmetricRadius(value) {
  return value.split('/').some(side => {
    const [a, b = a, c = a, d = b] = splitTop(side, /\s/)
    return a !== b || c !== d
  })
}

// Why a declaration depends on the physical direction, or null.
function physical(prop, value) {
  const plain = withoutNames(value)
  if (PHYSICAL_PROPERTY.test(prop)) {
    return 'property'
  }

  if (/\b(left|right)\b/.test(plain) || /\b[ns]?[ew]-resize\b/.test(plain)) {
    return 'value'
  }

  if (translateX(value).length) {
    return 'value'
  }

  if ([...value.matchAll(/\brotate(?:Z)?\(\s*([^)\s,]+)\s*\)/g)].some(([, angle]) => directionalAngle(angle))) {
    return 'value'
  }

  if (/\bscaleX\(\s*-|\bscale\(\s*-[\d.]+\s*,/.test(value)) {
    return 'value'
  }

  if ([...value.matchAll(/linear-gradient\(\s*([-+]?[\d.]+(?:deg|turn|rad|grad))/g)].some(([, angle]) => directionalAngle(angle))) {
    return 'value'
  }

  if (ORIGINS.has(prop)) {
    // `left`/`right` keywords are handled above. `0 0` is the top left corner.
    const tokens = splitTop(splitTop(value, /,/)[0] ?? '', /\s/)
    const x = /^(top|bottom)$/.test(tokens[0]) ? tokens[1] : tokens[0]
    // `var(--x)` is checked where --x is defined.
    if (x && !['center', '50%'].includes(x) && !x.startsWith('var(')) {
      return 'value'
    }
  }

  if (SHORTHANDS.has(prop)) {
    const [, right, , left] = splitTop(value, /\s/)
    if (left !== undefined && left !== right) {
      return 'shorthand'
    }
  }

  if (prop === 'border-radius' && asymmetricRadius(value)) {
    return 'shorthand'
  }

  if (/^(box|text)-shadow$/.test(prop) || /drop-shadow\(/.test(value)) {
    const shadows = splitTop(value, /,/).map(shadow => splitTop(shadow.replace(/drop-shadow\(|\)$/g, ''), /\s/).filter(token => token !== 'inset'))
    if (shadows.some(tokens => {
      const lengths = tokens.filter(token => /^[-+]?[\d.]+(px|rem|em)?$|^calc\(/.test(token))
      return lengths.length >= 2 && !isZero(lengths[0])
    })) {
      return 'shadow'
    }
  }

  return null
}

// `margin-left` → `margin-right`, `border-top-left-radius` → `border-top-right-radius`.
const mirrorProperty = prop => prop.replace(/\b(left|right)\b/, side => (side === 'left' ? 'right' : 'left'))

// --- Source locations -------------------------------------------------------

// `node_modules/bootstrap/scss/_chip.scss:42` → `bootstrap/scss/_chip.scss:42`
function where(node) {
  const { start, input } = node.source ?? {}
  if (!start) {
    return ''
  }

  const origin = input.map ? input.origin(start.line, start.column) : { file: input.file, line: start.line }
  if (!origin?.file) {
    return ''
  }

  const file = origin.file.startsWith('file:') ? fileURLToPath(origin.file) : origin.file
  const shown = file.startsWith(bootstrapDir + path.sep) ? `bootstrap/${path.relative(bootstrapDir, file)}` : path.relative(root, file)
  return `${shown}:${origin.line}`
}

// Token maps are written out by one mixin, so a custom property's source map
// points to `mixins/_tokens.scss`. Point to the map entry instead.
let tokenLines
function tokenWhere(name) {
  if (!tokenLines) {
    tokenLines = new Map()
    const dir = path.join(bootstrapDir, 'scss')
    for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
      if (entry.isFile() && entry.name.endsWith('.scss')) {
        const file = path.join(entry.parentPath, entry.name)
        for (const [index, line] of fs.readFileSync(file, 'utf8').split('\n').entries()) {
          const token = line.match(/^\s*(--[\w-]+)\s*:/)?.[1]
          if (token && !tokenLines.has(token)) {
            tokenLines.set(token, `bootstrap/${path.relative(bootstrapDir, file)}:${index + 1}`)
          }
        }
      }
    }
  }

  return tokenLines.get(name.replace(/^--bs-/, '--'))
}

// --- Audit ------------------------------------------------------------------

// The at-rules a node sits in: `@layer components > @media (width < 576px)`.
function contextOf(node) {
  const chain = []
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule') {
      chain.unshift(`@${parent.name} ${parent.params}`.trim())
    }
  }

  return chain.join(' > ')
}

const RTL = /:dir\(rtl\)|\[dir=["']?rtl["']?\]/
// `:root:dir(rtl) .drawer` and `[dir=rtl] .submenu` → `.drawer`, `.submenu`
const withoutRtl = selector => selector.replace(/(?::root)?:dir\(rtl\)\s*|\[dir=["']?rtl["']?\]\s*/g, '').trim()

const { root: css } = await compileConfig(path.join(root, 'configs/default/main.scss'), { bootstrapDir, logger: quiet, sourceMap: true })

// What `:dir(rtl)` rules override, keyed by context, selector and property.
const compensations = new Set()
let rtlRules = 0
css.walkRules(rule => {
  if (RTL.test(rule.selector)) {
    rtlRules++
    for (const selector of rule.selectors.filter(item => RTL.test(item))) {
      rule.each(node => node.type === 'decl' && compensations.add(`${contextOf(rule)}|${withoutRtl(selector)}|${node.prop}`))
    }
  }
})

const counts = { symmetric: 0, centered: 0, compensated: 0 }
const findings = []

css.walkDecls(decl => {
  const rule = decl.parent
  if (rule.type !== 'rule' || RTL.test(rule.selector)) {
    return
  }

  const kind = physical(decl.prop, decl.value)
  if (!kind) {
    return
  }

  const siblings = rule.nodes.filter(node => node.type === 'decl')
  const valueOf = prop => siblings.findLast(node => node.prop === prop)?.value

  if (kind === 'property' && valueOf(mirrorProperty(decl.prop)) === decl.value) {
    counts.symmetric++
    return
  }

  // `left: 50%` and `translateX(-50%)` center the box whatever the direction.
  const centering = valueOf('left') === '50%' && translateX(valueOf('transform') ?? '').every(({ x }) => x === '-50%') && translateX(valueOf('transform') ?? '').length
  if (centering && (decl.prop === 'left' || decl.prop === 'transform')) {
    counts.centered++
    return
  }

  const context = contextOf(decl)
  if (rule.selectors.every(selector => compensations.has(`${context}|${selector}|${decl.prop}`))) {
    counts.compensated++
    return
  }

  const at = where(decl)
  findings.push({
    kind,
    prop: decl.prop,
    value: decl.value.replace(/\s+/g, ' '),
    // Keyframes are named after their animation: `@keyframes animation-shake 10%, 90%`.
    selector: `${rule.parent.name === 'keyframes' ? `@keyframes ${rule.parent.params} ` : ''}${rule.selector.replace(/\s+/g, ' ')}`,
    where: decl.prop.startsWith('--') && at.includes('/mixins/') ? tokenWhere(decl.prop) ?? at : at
  })
})

const matches = (entry, finding) => (entry.properties?.includes(finding.prop.replace(/^--bs-/, '--')) ?? true) &&
  (entry.selector instanceof RegExp ? entry.selector.test(finding.selector) : finding.selector.includes(entry.selector))

const entryOf = finding => known.find(entry => matches(entry, finding))
const used = new Set(findings.map(entryOf).filter(Boolean))
const fresh = findings.filter(finding => !entryOf(finding))

// Responsive and container variants repeat a declaration from one Sass line:
// group by source line, property and value.
function group(list) {
  const groups = new Map()
  for (const finding of list) {
    const key = `${finding.where}|${finding.prop}|${finding.value}`
    groups.set(key, [...(groups.get(key) ?? []), finding])
  }

  return [...groups.values()].sort((a, b) => a[0].where.localeCompare(b[0].where, 'en', { numeric: true }))
}

function print(groups) {
  for (const list of groups) {
    const [{ prop, value, where: at, kind }] = list
    const entry = entryOf(list[0])
    const note = entry ? `  (${entry.issue ? `#${entry.issue}` : entry.reason})` : ''
    console.log(`    ${prop}: ${value.length > 80 ? `${value.slice(0, 77)}…` : value}  [${kind}]${note}`)
    console.log(`      ${list[0].selector.length > 100 ? `${list[0].selector.slice(0, 97)}…` : list[0].selector}${list.length > 1 ? `  (+${list.length - 1} variants)` : ''}`)
    console.log(`      ${at}`)
  }
}

const total = findings.length + counts.symmetric + counts.centered + counts.compensated
console.log(`configs/default: ${total} declarations use the physical left or right`)
console.log(`  ${counts.symmetric} symmetric, ${counts.centered} centered, ${counts.compensated} compensated by ${rtlRules} :dir(rtl) rules`)
console.log(`${fresh.length ? '✗' : '✓'} ${findings.length - fresh.length} known, ${fresh.length} new\n`)

const listed = showAll ? findings : fresh
if (listed.length) {
  print(group(listed))
}

const stale = known.filter(entry => !used.has(entry))
for (const entry of stale) {
  console.log(`\n✗ Known entry no longer found, remove it from scripts/known-rtl.mjs: ${entry.selector}${entry.properties ? ` (${entry.properties.join(', ')})` : ''}${entry.issue ? ` (#${entry.issue})` : ''}`)
  if (entry.issue) {
    console.log(`  If Bootstrap fixed it, mark #${entry.issue} \`upstream-fixed\` and close it (step 3 of "Upstream issue tracking" in CLAUDE.md).`)
  }
}

if (fresh.length) {
  console.log('\nFor each new finding, check the example in RTL (`npm run audit-rtl -- --render`, or `?dir=rtl`).')
  console.log('If it’s a Bootstrap bug, open a tracking issue in this repository labeled `upstream`')
  console.log('(see "Upstream issue tracking" in CLAUDE.md), then add it to scripts/known-rtl.mjs with `issue: <n>`.')
  console.log('If it renders the same in RTL by design, add it with a `reason`.')
}

process.exitCode = fresh.length || stale.length ? 1 : 0

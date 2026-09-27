// Normalizes compiled CSS so two builds compare rule by rule: comments,
// banner, source map and formatting removed. Shared by scripts/check-dist.mjs
// and scripts/diff-bootstrap.mjs.
import postcss from 'postcss'

// One declaration or rule per line, indented by nesting, so a line diff reads
// like a CSS diff.
export function normalizeCss(css) {
  const lines = []
  const write = (node, depth) => {
    const indent = '  '.repeat(depth)
    if (node.type === 'decl') {
      lines.push(`${indent}${node.prop}: ${node.value.replace(/\s+/g, ' ').trim()}${node.important ? ' !important' : ''};`)
    } else if (node.type === 'rule' || (node.type === 'atrule' && node.name !== 'charset')) {
      const head = node.type === 'rule' ?
        node.selectors.map(selector => selector.replace(/\s+/g, ' ').trim()).join(', ') :
        `@${node.name} ${node.params.replace(/\s+/g, ' ').trim()}`.trim()
      if (node.nodes?.length === 0) {
        // Like the `@layer custom {}` an empty _custom.scss produces. The
        // `@layer …;` statement at the top already fixes the layer order.
        return
      }

      if (node.nodes) {
        lines.push(`${indent}${head} {`)
        node.each(child => write(child, depth + 1))
        lines.push(`${indent}}`)
      } else {
        lines.push(`${indent}${head};`)
      }
    }
  }

  postcss.parse(css).each(node => write(node, 0))
  return `${lines.join('\n')}\n`
}

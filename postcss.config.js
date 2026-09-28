// Mirrors Bootstrap's own `build/postcss.config.mjs` so the CSS compiled here
// matches `dist/css/bootstrap.css`: every custom property gets the `--bs-`
// prefix (Bootstrap's JavaScript reads the prefixed names), then Autoprefixer
// runs against the targets in `.browserslistrc` (copied from Bootstrap).
import postcssPrefixCustomProperties from 'postcss-prefix-custom-properties'
import autoprefixer from 'autoprefixer'

export const DEFAULT_PREFIX = 'bs-'

// A stylesheet picks another prefix with a loud comment, which Sass keeps:
// `/*! playground-prefix: "x-" */`, or `""` for none, like the docs' npm and
// webpack guides, which run Autoprefixer only. The comment is removed.
const PREFIX_MARKER = /^!?\s*playground-prefix:\s*"([^"]*)"\s*$/

// The prefix a stylesheet asks for, or undefined.
export const readPrefix = source => source.match(/\/\*!?\s*playground-prefix:\s*"([^"]*)"\s*\*\//)?.[1]

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const prefixCustomProperties = {
  postcssPlugin: 'playground-prefix-custom-properties',
  Once(root) {
    let prefix = DEFAULT_PREFIX
    root.walkComments(comment => {
      const match = comment.text.match(PREFIX_MARKER)
      if (match) {
        prefix = match[1]
        comment.remove()
      }
    })

    if (prefix) {
      postcssPrefixCustomProperties({
        prefix,
        ignore: [new RegExp(`^--${escapeRegExp(prefix)}`), /^--bd-/]
      }).Once(root)
    }
  }
}

export default {
  plugins: [
    prefixCustomProperties,
    autoprefixer({ cascade: false })
  ]
}

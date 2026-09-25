// Mirrors Bootstrap's own `build/postcss.config.mjs` so the CSS compiled here
// matches `dist/css/bootstrap.css`: every custom property gets the `--bs-`
// prefix (Bootstrap's JavaScript reads the prefixed names), then Autoprefixer
// runs against the targets in `.browserslistrc` (copied from Bootstrap).
import postcssPrefixCustomProperties from 'postcss-prefix-custom-properties'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    postcssPrefixCustomProperties({
      prefix: 'bs-',
      ignore: [/^--bs-/, /^--bd-/]
    }),
    autoprefixer({ cascade: false })
  ]
}

// Measures what Bootstrap weighs for a given Bootstrap folder: each config's
// CSS, the dist files built from its source (scripts/lib/dist.mjs) and a
// bundle of js/src, minified, gzipped and brotli-compressed. Shared by
// scripts/check-size.mjs and scripts/diff-bootstrap.mjs.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { transform } from 'lightningcss'
import { rolldown } from 'rolldown'
import { compileConfig } from './compile.mjs'
import { listConfigs, root } from './configs.mjs'
import { buildDist } from './dist.mjs'

const quiet = { warn() {}, debug() {} }

// Bootstrap's `.browserslistrc` floors, as in vite.config.js.
const TARGETS = { chrome: 130 << 16, edge: 130 << 16, firefox: 132 << 16, safari: 18 << 16 }

const measure = buffer => ({
  min: buffer.length,
  gzip: zlib.gzipSync(buffer, { level: 9 }).length,
  brotli: zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length
})

export async function measureSizes(bootstrapDir) {
  const sizes = {}

  for (const { name } of listConfigs()) {
    const { css } = await compileConfig(path.join(root, 'configs', name, 'main.scss'), { bootstrapDir, logger: quiet })
    const { code } = transform({ filename: `${name}.css`, code: Buffer.from(css), minify: true, targets: TARGETS })
    sizes[`css/${name}`] = measure(Buffer.from(code))
  }

  const distDir = await buildDist(bootstrapDir)
  for (const file of ['dist/css/bootstrap.min.css', 'dist/js/bootstrap.min.js', 'dist/js/bootstrap.bundle.min.js']) {
    sizes[`dist/${path.basename(file)}`] = measure(fs.readFileSync(path.join(distDir, file)))
  }

  const bundle = await rolldown({ input: path.join(bootstrapDir, 'js/src/index.ts'), logLevel: 'silent' })
  const { output } = await bundle.generate({ format: 'esm', minify: true })
  await bundle.close()
  sizes['src/bootstrap.bundle.js'] = measure(Buffer.from(output[0].code))
  return sizes
}

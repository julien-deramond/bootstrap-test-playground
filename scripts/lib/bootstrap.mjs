// Shared by vite.config.js and scripts/check-configs.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'

// Where Bootstrap comes from: the `v6-dev` branch installed from GitHub in
// node_modules (default), or a local checkout when BOOTSTRAP_PATH is set.
export function bootstrapSource(env) {
  if (env.BOOTSTRAP_PATH) {
    const dir = path.resolve(root, env.BOOTSTRAP_PATH)
    if (!fs.existsSync(path.join(dir, 'scss/bootstrap.scss'))) {
      throw new Error(`BOOTSTRAP_PATH="${env.BOOTSTRAP_PATH}" does not point to a Bootstrap checkout (${dir})`)
    }

    return { dir, label: `local checkout: ${dir}` }
  }

  let label = 'node_modules/bootstrap'
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
    const resolved = lock.packages?.['node_modules/bootstrap']?.resolved ?? ''
    const sha = resolved.split('#')[1]
    if (sha) {
      label = `twbs/bootstrap#v6-dev @ ${sha.slice(0, 9)}`
    }
  } catch {}

  return { dir: null, label }
}

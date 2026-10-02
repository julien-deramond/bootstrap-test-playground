// Shared by vite.config.js and the check scripts.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'

// `owner/repo` of a GitHub remote URL (`git@github.com:twbs/bootstrap.git`,
// `https://github.com/twbs/bootstrap`, `git+ssh://git@github.com/…`).
const githubRepo = url => url.match(/github\.com[:/]([^/]+\/[^/#]+?)(?:\.git)?(?:#|$)/)?.[1]

// The branch, commit and dirty state of a git checkout, and the branch on
// GitHub when it tracks a GitHub remote. Undefined outside a git checkout.
export function checkoutState(dir) {
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  let status
  try {
    status = git('status', '--porcelain=v2', '--branch')
  } catch {
    return undefined
  }

  const lines = status.split('\n').filter(Boolean)
  const header = key => lines.find(line => line.startsWith(`# branch.${key} `))?.slice(`# branch.${key} `.length)
  const head = header('head')
  const branch = head === '(detached)' ? undefined : head
  const sha = header('oid') === '(initial)' ? undefined : header('oid')
  const dirty = lines.some(line => !line.startsWith('#'))

  let url
  if (branch && header('upstream')) {
    try {
      const remote = git('config', '--get', `branch.${branch}.remote`)
      const merge = git('config', '--get', `branch.${branch}.merge`).replace(/^refs\/heads\//, '')
      const repo = githubRepo(git('remote', 'get-url', remote))
      if (repo) {
        url = `https://github.com/${repo}/tree/${merge}`
      }
    } catch {}
  }

  return { branch, sha, dirty, url }
}

// The git directory of a checkout (`.git`, or a worktree's), if any.
export function gitDir(dir) {
  try {
    return execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return undefined
  }
}

// `branch@sha (dirty)`, `sha (detached)` or `sha (detached, dirty)`.
function checkoutLabel({ branch, sha, dirty }) {
  const short = sha?.slice(0, 7) ?? 'no commit'
  if (branch) {
    return `${branch}@${short}${dirty ? ' (dirty)' : ''}`
  }

  return `${short} (detached${dirty ? ', dirty' : ''})`
}

// Where Bootstrap comes from: the `v6-dev` branch installed from GitHub in
// node_modules (default), or a local checkout when BOOTSTRAP_PATH is set.
// `label` names it (`local checkout: v6-dev@1a2b3c4 (dirty)`), `path` is its
// folder relative to the playground, so builds embed no absolute path, `url`
// links to the commit or the branch on GitHub when known, `sha` is the full
// commit when known, and `dirty` says whether the checkout has uncommitted
// changes.
export function bootstrapSource(env) {
  if (env.BOOTSTRAP_PATH) {
    const dir = path.resolve(root, env.BOOTSTRAP_PATH)
    if (!fs.existsSync(path.join(dir, 'scss/bootstrap.scss'))) {
      throw new Error(`BOOTSTRAP_PATH="${env.BOOTSTRAP_PATH}" does not point to a Bootstrap checkout (${dir})`)
    }

    const state = checkoutState(dir)
    return {
      dir,
      label: state ? `local checkout: ${checkoutLabel(state)}` : `local checkout: ${dir}`,
      path: path.relative(root, dir) || dir,
      url: state?.url,
      sha: state?.sha,
      dirty: state?.dirty ?? false
    }
  }

  let label = 'node_modules/bootstrap'
  let url
  let sha
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
    const resolved = lock.packages?.['node_modules/bootstrap']?.resolved ?? ''
    sha = resolved.split('#')[1]
    if (sha) {
      label = `twbs/bootstrap#v6-dev @ ${sha.slice(0, 9)}`
      url = `https://github.com/${githubRepo(resolved) ?? 'twbs/bootstrap'}/commit/${sha}`
    }
  } catch {}

  return { dir: null, label, path: 'node_modules/bootstrap', url, sha, dirty: false }
}

// Bootstrap's own `.scss` files under `scss/`, as absolute paths. A git
// checkout also has the Sass unit tests (`scss/tests/**/*.test.scss`), which
// the npm package doesn't ship: they aren't partials and are left out.
export function bootstrapScssFiles(bootstrapDir) {
  const scssDir = path.join(bootstrapDir, 'scss')
  return fs.readdirSync(scssDir, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.scss') && !entry.name.endsWith('.test.scss'))
    .map(entry => path.join(entry.parentPath, entry.name))
    .filter(file => !path.relative(scssDir, file).startsWith(`tests${path.sep}`))
}

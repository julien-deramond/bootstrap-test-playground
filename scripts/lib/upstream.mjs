// Shared by the scripts that deal with twbs/bootstrap commits: which one the
// lockfile pins, resolving a ref, fetching a commit's sources, and the commits
// between two of them.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { root } from './configs.mjs'

export const REPO = 'https://github.com/twbs/bootstrap.git'
const SHA = /^[\da-f]{40}$/

const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options })

// The commit package-lock.json pins: package.json keeps `#v6-dev`.
export function lockedSha() {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  return lock.packages?.['node_modules/bootstrap']?.resolved?.split('#')[1] ?? ''
}

// A full commit for a commit (full or short), branch or tag of twbs/bootstrap.
export function resolveRef(ref) {
  if (SHA.test(ref)) {
    return ref
  }

  const api = run('gh', ['api', `repos/twbs/bootstrap/commits/${ref}`, '--jq', '.sha'])
  if (api.status === 0 && SHA.test(api.stdout.trim())) {
    return api.stdout.trim()
  }

  const remote = run('git', ['ls-remote', REPO, ref]).stdout.split('\t')[0]
  if (SHA.test(remote)) {
    return remote
  }

  throw new Error(`Can't resolve "${ref}" in twbs/bootstrap. Use a full commit, or install the GitHub CLI for short ones.`)
}

// A shallow fetch of exactly that commit into .cache/bootstrap/<sha>/, reused
// on later runs. Unlike the npm package, it has the docs.
export function fetchCommit(sha) {
  const dir = path.join(root, '.cache/bootstrap', sha)
  if (fs.existsSync(path.join(dir, 'scss/bootstrap.scss'))) {
    return dir
  }

  fs.mkdirSync(dir, { recursive: true })
  for (const args of [['init', '-q'], ['fetch', '-q', '--depth', '1', REPO, sha], ['checkout', '-q', 'FETCH_HEAD']]) {
    const result = run('git', args, { cwd: dir })
    if (result.status !== 0) {
      fs.rmSync(dir, { recursive: true, force: true })
      throw new Error(`git ${args.join(' ')} failed for ${sha}: ${result.stderr}`)
    }
  }

  return dir
}

// `[{ sha, subject }]` from <from> (excluded) to <to>, oldest first: from a
// local checkout when it has both commits, or the GitHub CLI. `null` when
// neither can tell.
export function upstreamCommits(from, to, checkoutDir) {
  if (checkoutDir && [from, to].every(sha => run('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: checkoutDir }).status === 0)) {
    const log = run('git', ['log', '--reverse', '--format=%H%x09%s', `${from}..${to}`], { cwd: checkoutDir })
    if (log.status === 0) {
      return log.stdout.split('\n').filter(Boolean).map(line => {
        const [sha, subject] = line.split('\t')
        return { sha, subject }
      })
    }
  }

  const compare = run('gh', ['api', `repos/twbs/bootstrap/compare/${from}...${to}`, '--jq', '.commits[] | "\\(.sha)\\t\\(.commit.message | split("\\n")[0])"'])
  if (compare.status !== 0) {
    return null
  }

  return compare.stdout.split('\n').filter(Boolean).map(line => {
    const [sha, subject] = line.split('\t')
    return { sha, subject }
  })
}

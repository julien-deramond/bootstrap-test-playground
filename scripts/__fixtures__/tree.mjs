// Shared by the unit tests: a copy of the minimum tree the config scripts need, in a temp folder.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function makeTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playground-test-'))
  for (const entry of ['configs/default', 'configs/README.md', 'src/styles', 'scripts/templates']) {
    fs.cpSync(path.join(repoRoot, entry), path.join(dir, entry), { recursive: true })
  }

  return dir
}

// Runs a script of scripts/ against a temp tree. Returns the exit code and the output.
export function runScript(tree, script, args = []) {
  try {
    const stdout = execFileSync('node', [path.join(repoRoot, 'scripts', script), ...args], {
      cwd: tree,
      env: { ...process.env, PLAYGROUND_ROOT: tree },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return { status: 0, stdout, stderr: '' }
  } catch (error) {
    return { status: error.status, stdout: error.stdout, stderr: error.stderr }
  }
}

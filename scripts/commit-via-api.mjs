#!/usr/bin/env node
// Commits the staged changes to a branch through GitHub's GraphQL API
// (createCommitOnBranch), so GitHub signs the commit and it shows as Verified.
// A commit made with plain git and pushed by CI is Unverified.
// Usage: node scripts/commit-via-api.mjs <branch> <expected-head-sha> <message>
// Needs GH_TOKEN and GITHUB_REPOSITORY, and the `gh` CLI (both set up on CI).
//
// The branch is only updated while it still points to <expected-head-sha>
// (`expectedHeadOid`), the same guard as `git push --force-with-lease`.
// A change too large for one request is split into consecutive commits.
// Prints the last new commit's sha. Exit codes: 0 committed, 2 the branch moved,
// 1 any other failure. With nothing staged, the commit is empty.
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [branch, expectedHeadOid, message] = process.argv.slice(2)
const repository = process.env.GITHUB_REPOSITORY
if (!branch || !expectedHeadOid || !message || !repository) {
  console.error('Usage: GITHUB_REPOSITORY=owner/repo commit-via-api.mjs <branch> <expected-head-sha> <message>')
  process.exit(1)
}

// -z keeps odd file names intact; --no-renames reports a rename as a deletion
// and an addition, which is what createCommitOnBranch takes.
const entries = execFileSync('git', ['diff', '--cached', '--name-status', '--no-renames', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 })
  .split('\0')
  .filter(Boolean)

const additions = []
const deletions = []
for (let i = 0; i < entries.length; i += 2) {
  const [status, path] = [entries[i], entries[i + 1]]
  if (status === 'D') deletions.push({ path })
  else additions.push({ path, contents: readFileSync(path).toString('base64') })
}

// GitHub refuses a request payload over 45MB, so a large change is split into
// consecutive commits whose base64 contents stay under MAX_BATCH_BYTES. The
// deletions go in the first one. A single commit is made when it all fits.
const MAX_BATCH_BYTES = 30 * 1024 * 1024
const batches = [{ additions: [], deletions, bytes: 0 }]
for (const addition of additions) {
  let batch = batches.at(-1)
  if (batch.bytes > 0 && batch.bytes + addition.contents.length > MAX_BATCH_BYTES) {
    batch = { additions: [], deletions: [], bytes: 0 }
    batches.push(batch)
  }

  batch.additions.push(addition)
  batch.bytes += addition.contents.length
}

const query = `mutation($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) { commit { oid } }
}`

let head = expectedHeadOid
batches.forEach((batch, index) => {
  const headline = batches.length > 1 ? `${message} (${index + 1}/${batches.length})` : message
  const input = {
    branch: { repositoryNameWithOwner: repository, branchName: branch },
    expectedHeadOid: head,
    message: { headline },
    fileChanges: { additions: batch.additions, deletions: batch.deletions }
  }

  const result = spawnSync('gh', ['api', 'graphql', '--input', '-'], {
    input: JSON.stringify({ query, variables: { input } }),
    encoding: 'utf8',
    maxBuffer: 1 << 28
  })

  let response
  try {
    response = JSON.parse(result.stdout)
  } catch {
    console.error(result.stderr || result.stdout || 'No response from the GitHub API.')
    process.exit(1)
  }

  const oid = response.data?.createCommitOnBranch?.commit?.oid
  if (!oid) {
    const errors = (response.errors || [{ message: result.stderr }]).map(error => error.message).join('; ')
    console.error(errors)
    process.exit(/expected branch to point to|is at .* but expected/i.test(errors) ? 2 : 1)
  }

  head = oid
})

console.log(head)

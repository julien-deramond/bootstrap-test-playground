#!/usr/bin/env node
// The status sweep of "Upstream issue tracking" in CLAUDE.md, for the weekly
// workflow (.github/workflows/status-sweep.yml):
//
// - an open `upstream-reported` issue whose upstream items (the twbs/bootstrap
//   issues and pull requests of its "Reported upstream" comments) are all fixed
//   on v6-dev moves to `upstream-fixed` and is closed. Fixed means a pull
//   request merged, or an issue closed as completed by a commit or with a
//   merged pull request linked to close it, whose commit is in v6-dev. An item closed without a fix gets a comment for a human.
// - an open `upstream` issue that a twbs/bootstrap issue or pull request links
//   to moves to `upstream-reported`. One updated since --since whose title and
//   description share its keywords gets a comment as a possible match: a human
//   decides.
//
// Usage: npm run status-sweep [-- --since <YYYY-MM-DD>] [--apply]
// Without --apply, it changes nothing and prints what it would do. It needs
// the GitHub CLI, and no npm install. Each comment carries a marker, so a
// finding is reported once.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM = 'twbs/bootstrap'
const BRANCH = 'v6-dev'
const TRACKING = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/julien-deramond/bootstrap-test-playground/blob/main/CLAUDE.md#upstream-issue-tracking`

// The files whose entries reference a tracking issue (step 3 of CLAUDE.md).
const ALLOWLISTS = [
  'tests/console/known-issues.js',
  'tests/smoke/known-issues.js',
  'tests/a11y/known-issues.js',
  ...fs.readdirSync(path.join(root, 'scripts')).filter(file => /^known-.+\.mjs$/.test(file)).map(file => `scripts/${file}`),
  ...fs.readdirSync(path.join(root, 'issues'), { recursive: true }).filter(file => file.endsWith('.html')).map(file => `issues/${file}`)
]

const arg = name => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

const apply = process.argv.includes('--apply')
const since = arg('since') ?? new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  console.error('Usage: npm run status-sweep [-- --since <YYYY-MM-DD>] [--apply]')
  process.exit(1)
}

function gh(args, { json = true } = {}) {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (result.status !== 0) {
    throw new Error(`gh ${args.join(' ')} failed: ${result.error?.message ?? result.stderr.trim()}`)
  }

  return json ? JSON.parse(result.stdout) : result.stdout
}

// Every page of a REST list, as one array.
const list = (endpoint, field) => gh(['api', '-X', 'GET', endpoint, '--paginate', '--slurp']).flatMap(page => field ? page[field] : page)

const repo = process.env.GITHUB_REPOSITORY ?? gh(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner

// --- Upstream items -----------------------------------------------------------

const UPSTREAM_REF = new RegExp(String.raw`(?:${UPSTREAM}#|github\.com/${UPSTREAM}/(?:issues|pull)/)(\d+)`, 'g')

// The upstream items an issue's "Reported upstream" comments link to.
const reportedRefs = comments => [...new Set(comments
  .filter(comment => /reported upstream/i.test(comment.body))
  .flatMap(comment => [...comment.body.matchAll(UPSTREAM_REF)].map(match => Number(match[1]))))]

const inBranch = new Map()
// Whether a twbs/bootstrap commit is in v6-dev.
function landed(sha) {
  if (!inBranch.has(sha)) {
    const status = gh(['api', `repos/${UPSTREAM}/compare/${BRANCH}...${sha}`, '--jq', '.status'], { json: false }).trim()
    inBranch.set(sha, status === 'behind' || status === 'identical')
  }

  return inBranch.get(sha)
}

// { number, kind, title, state: 'open' | 'fixed' | 'unfixed' | 'unclear', fixes: [{ pr, sha }], reason }
function upstreamStatus(number) {
  const item = gh(['api', `repos/${UPSTREAM}/issues/${number}`])
  const base = { number, kind: item.pull_request ? 'pull request' : 'issue', title: item.title }
  if (item.state === 'open') {
    return { ...base, state: 'open' }
  }

  if (item.pull_request) {
    const pr = gh(['api', `repos/${UPSTREAM}/pulls/${number}`])
    if (!pr.merged) {
      return { ...base, state: 'unfixed', reason: 'closed without merging' }
    }

    return landed(pr.merge_commit_sha) ?
      { ...base, state: 'fixed', fixes: [{ pr: number, sha: pr.merge_commit_sha }] } :
      { ...base, state: 'unclear', reason: `merged into \`${pr.base.ref}\`, and its commit isn't in \`${BRANCH}\` yet` }
  }

  if (item.state_reason !== 'completed') {
    return { ...base, state: 'unfixed', reason: `closed as ${(item.state_reason ?? 'closed').replaceAll('_', ' ')}` }
  }

  // Closed as completed: by which pull request or commit. Maintainers often
  // close by hand after merging, so without a closer, the pull requests linked
  // to close it that merged. The REST timeline has neither.
  const [owner, name] = UPSTREAM.split('/')
  const pull = 'number merged mergeCommit { oid }'
  const query = `query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { issue(number: $number) {
    timelineItems(itemTypes: [CLOSED_EVENT], last: 1) { nodes { ... on ClosedEvent { closer { __typename ... on PullRequest { ${pull} } ... on Commit { oid } } } } }
    closedByPullRequestsReferences(first: 20, includeClosedPrs: true) { nodes { ${pull} } }
  } } }`
  let issue
  try {
    issue = gh(['api', 'graphql', '-f', `query=${query}`, '-f', `owner=${owner}`, '-f', `name=${name}`, '-F', `number=${number}`]).data.repository.issue
  } catch (error) {
    return { ...base, state: 'unclear', reason: `closed as completed, by what the sweep can't tell (${error.message.split('\n')[0]})` }
  }

  const closer = issue.timelineItems.nodes[0]?.closer
  const fixes = closer?.__typename === 'Commit' ?
    [{ sha: closer.oid }] :
    (closer ? [closer] : issue.closedByPullRequestsReferences.nodes)
      .filter(pr => pr.merged)
      .map(pr => ({ pr: pr.number, sha: pr.mergeCommit.oid }))
  if (fixes.length === 0) {
    return { ...base, state: 'unclear', reason: 'closed as completed, without a merged pull request or a commit' }
  }

  const missing = fixes.filter(fix => !landed(fix.sha))
  return missing.length === 0 ?
    { ...base, state: 'fixed', fixes } :
    { ...base, state: 'unclear', reason: `closed with ${missing.map(fix => fix.pr ? `${UPSTREAM}#${fix.pr}` : fix.sha.slice(0, 7)).join(', ')}, not in \`${BRANCH}\` yet` }
}

// --- Possible matches ---------------------------------------------------------

// Words too common in Bootstrap issues to tell two of them apart.
const STOPWORDS = new Set(`
  about after also because before being both but can't cannot does doesn't don't each even every from have into isn't just
  keep keeps like more most never none only other over same should since some still than that their them then there these
  they this those under until when where which while with without would your
  bootstrap docs documentation example examples issue page pages default defaults component components class classes
  token tokens value values variable variables work works working broken bug fix fixes fixed missing wrong instead
  light dark mode modes css sass scss javascript html file files
`.split(/\s+/).filter(Boolean))

const stem = word => word.replace(/(?<=\w{3})(?:ies|es|s)$/, '')

const words = text => new Set([...text.toLowerCase().matchAll(/[a-z$-][\w$-]*[\w)]/g)]
  .map(([word]) => word.replace(/^-+|-+$/g, ''))
  .filter(word => word.length >= 4 && !/^v?\d/.test(word) && !STOPWORDS.has(word))
  .map(stem))

// Code in the title (`--form-floating-label-opacity`, `color-contrast()`): a
// verbatim match is a strong hint on its own.
const codeSpans = title => [...title.matchAll(/`([^`]{6,})`/g)].map(match => match[1].toLowerCase())

// The keywords a tracking issue's title shares with an upstream item's title,
// or null when it doesn't look like the same bug: three, or two backed by
// code or five shared with the description too. Tuned on two months of
// twbs/bootstrap: it finds #2 and #129's reports, and flags three others.
function shared(issue, item) {
  const keywords = [...words(issue.title)]
  const text = `${item.title}\n${item.body ?? ''}`.slice(0, 10_000)
  const titleWords = words(item.title)
  const textWords = words(text)
  const inTitle = keywords.filter(word => titleWords.has(word))
  const inText = keywords.filter(word => textWords.has(word))
  const code = codeSpans(issue.title).filter(span => text.toLowerCase().includes(span))
  const enough = inTitle.length >= 3 || (inTitle.length >= 2 && (code.length > 0 || inText.length >= 5))
  return enough ? [...new Set([...inTitle, ...code])] : null
}

// --- The sweep ----------------------------------------------------------------

const marker = key => `<!-- status-sweep:${key} -->`
const done = []
const notes = []

function act(issue, description, ...steps) {
  done.push(`- #${issue.number} ${description}`)
  if (!apply) {
    return
  }

  for (const step of steps) {
    step()
  }
}

const comment = (issue, body) => () => gh(['api', '-X', 'POST', `repos/${repo}/issues/${issue.number}/comments`, '-f', `body=${body}`, '--silent'], { json: false })
const relabel = (issue, from, to) => () => {
  try {
    gh(['api', '-X', 'DELETE', `repos/${repo}/issues/${issue.number}/labels/${from}`, '--silent'], { json: false })
  } catch {
    // Someone removed it already.
  }

  gh(['api', '-X', 'POST', `repos/${repo}/issues/${issue.number}/labels`, '-f', `labels[]=${to}`, '--silent'], { json: false })
}

const close = issue => () => gh(['api', '-X', 'PATCH', `repos/${repo}/issues/${issue.number}`, '-f', 'state=closed', '-f', 'state_reason=completed', '--silent'], { json: false })

const lockedSha = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  .packages['node_modules/bootstrap'].resolved.split('#')[1]

// Whether the Bootstrap commit package-lock.json pins has a twbs/bootstrap commit.
const installedSha = sha => ['ahead', 'identical'].includes(gh(['api', `repos/${UPSTREAM}/compare/${sha}...${lockedSha}`, '--jq', '.status'], { json: false }).trim())

// The allowlist entries and checks that still reference an issue.
const references = number => ALLOWLISTS.filter(file => new RegExp(String.raw`\bissue: ${number}\b|data-issue="${number}"`)
  .test(fs.readFileSync(path.join(root, file), 'utf8')))

const openIssues = label => list(`repos/${repo}/issues?labels=${label}&state=open&per_page=100`)
  .filter(issue => !issue.pull_request)
const commentsOf = issue => list(`repos/${repo}/issues/${issue.number}/comments?per_page=100`)
const commented = (comments, key) => comments.some(comment => comment.body.includes(marker(key)))

// 1. Reported upstream: fixed yet?
const reported = openIssues('upstream-reported')
for (const issue of reported) {
  const comments = commentsOf(issue)
  const refs = reportedRefs(comments)
  if (refs.length === 0) {
    notes.push(`- #${issue.number} is \`upstream-reported\` without a "Reported upstream: ${UPSTREAM}#<n>" comment: add one so the sweep can follow it.`)
    continue
  }

  const statuses = refs.map(upstreamStatus)
  const show = status => `${UPSTREAM}#${status.number} (${status.kind})`
  const showFix = fix => fix.pr ? `${UPSTREAM}#${fix.pr} (${UPSTREAM}@${fix.sha})` : `${UPSTREAM}@${fix.sha}`
  if (statuses.every(status => status.state === 'fixed')) {
    const fixes = statuses.flatMap(status => status.fixes)
    const installed = fixes.every(fix => installedSha(fix.sha))
    const left = references(issue.number)
    const body = [
      `Fixed upstream in ${[...new Set(fixes.map(showFix))].join(', ')}.`,
      '',
      installed ?
        `The playground already has it: it installs ${UPSTREAM}@${lockedSha}.` :
        'The playground gets it with its next Bootstrap update.',
      left.length > 0 ?
        `Still referenced by ${left.map(file => `\`${file}\``).join(', ')}: remove those entries ${installed ? 'now, as the checks report them gone' : 'with the update that brings the fix, as the checks will then report them gone'}.` :
        'No allowlist entry or check references this issue.',
      '',
      `Closed by the weekly status sweep (step 3 of [Upstream issue tracking](${TRACKING})).`,
      marker(`fixed:${refs.join(',')}`)
    ].join('\n')
    act(issue, `fixed upstream in ${statuses.map(show).join(', ')}: \`upstream-reported\` → \`upstream-fixed\`, closed${left.length > 0 ? ` (still referenced by ${left.join(', ')})` : ''}`,
      relabel(issue, 'upstream-reported', 'upstream-fixed'), comment(issue, body), close(issue))
    continue
  }

  // Waiting while anything is open; otherwise someone has to decide.
  if (statuses.some(status => status.state === 'open')) {
    continue
  }

  const key = `closed:${statuses.map(status => `${status.number}=${status.state}`).join(',')}`
  if (commented(comments, key)) {
    continue
  }

  const lines = statuses.map(status => `- ${show(status)}: ${status.state === 'fixed' ? `fixed in ${status.fixes.map(showFix).join(', ')}` : status.reason}`)
  const body = [
    'The weekly status sweep found every upstream item of this issue closed, but not all of them fixed:',
    '',
    ...lines,
    '',
    `Check whether the bug is still there, then keep this issue \`upstream-reported\` with a new upstream link, move it back to \`upstream\`, or close it (see [Upstream issue tracking](${TRACKING})).`,
    marker(key)
  ].join('\n')
  act(issue, `upstream items closed without a clear fix: ${statuses.map(status => `${show(status)} ${status.reason ?? status.state}`).join(', ')}: comment`, comment(issue, body))
}

// 2. Not reported yet: has someone reported it upstream?
const candidates = list(`search/issues?q=${encodeURIComponent(`repo:${UPSTREAM} updated:>=${since}`)}&per_page=100`, 'items')
  .filter(item => item.user?.type !== 'Bot')
const unreported = openIssues('upstream')
for (const issue of unreported) {
  const comments = commentsOf(issue)

  // An upstream issue or pull request that links to this one.
  const links = list(`repos/${repo}/issues/${issue.number}/timeline?per_page=100`)
    .filter(event => event.event === 'cross-referenced' && event.source?.issue?.repository?.full_name === UPSTREAM)
    .map(event => event.source.issue)
  const link = links.find(item => !commented(comments, `reported:${item.number}`))
  if (link) {
    const body = [
      `Reported upstream: ${UPSTREAM}#${link.number}`,
      '',
      `Found by the weekly status sweep: ${UPSTREAM}#${link.number} links to this issue (step 2 of [Upstream issue tracking](${TRACKING})).`,
      marker(`reported:${link.number}`)
    ].join('\n')
    act(issue, `linked from ${UPSTREAM}#${link.number} (${link.title}): \`upstream\` → \`upstream-reported\``,
      relabel(issue, 'upstream', 'upstream-reported'), comment(issue, body))
    continue
  }

  // Possible matches, shown as code: a mention would cross-reference this
  // issue on twbs/bootstrap for what may not be the same bug.
  const matches = candidates
    .map(item => ({ item, keywords: shared(issue, item) }))
    .filter(({ item, keywords }) => keywords && !commented(comments, `match:${item.number}`))
  if (matches.length === 0) {
    continue
  }

  const body = [
    `The weekly status sweep found upstream items that may be this bug (not linked, so they don't cross-reference this issue):`,
    '',
    ...matches.map(({ item, keywords }) => `- \`${UPSTREAM}#${item.number}\` (${item.pull_request ? 'pull request' : 'issue'}, ${item.state}): ${item.title.replaceAll('`', '')}. Shared keywords: ${keywords.join(', ')}.`),
    '',
    `If one is, follow step 2 of [Upstream issue tracking](${TRACKING}) and comment "Reported upstream: ${UPSTREAM}#<n>", or step 3 if it fixed it.`,
    ...matches.map(({ item }) => marker(`match:${item.number}`))
  ].join('\n')
  act(issue, `possible upstream match ${matches.map(({ item }) => `${UPSTREAM}#${item.number} (${item.title})`).join(', ')}: comment`, comment(issue, body))
}

// --- Report -------------------------------------------------------------------

const report = [
  `## Status sweep${apply ? '' : ' (dry run)'}`,
  '',
  `${reported.length} \`upstream-reported\` and ${unreported.length} \`upstream\` issues; ${candidates.length} ${UPSTREAM} issues and pull requests updated since ${since}.`,
  '',
  ...(done.length > 0 ? done : ['Nothing new.']),
  ...(notes.length > 0 ? ['', ...notes] : [])
].join('\n')
console.log(report)
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`)
}

// Opens every page of the playground, in light and dark and with every config,
// and once more with Bootstrap's prebuilt dist files (`?css=dist&js=dist`), what
// users install, and fails on anything the page reports: uncaught exceptions, console errors
// and warnings (Bootstrap's deprecation notices included) and same-origin
// requests that fail or return an error status.
//
// Problems caused by an open upstream bug are listed in known-issues.js.
//
// CONSOLE_SCOPE, which `npm run test-scope` prints and console.yml sets on
// pull requests, limits the crawl to what changed: the working copy and dist
// on every page, the changed configs on every page and the changed pages with
// every config. Without it, the crawl opens everything.
import { expect, test } from '@playwright/test'
import { listConfigs } from '../../scripts/lib/configs.mjs'
import { collectPages } from '../../scripts/lib/pages.mjs'
import knownIssues from './known-issues.js'

// Every known problem is an upstream bug with a tracking issue: see
// "Upstream issue tracking" in CLAUDE.md.
for (const { issue, message, pages } of knownIssues) {
  if (!issue || !message || !pages?.length) {
    throw new Error(`tests/console/known-issues.js: each entry needs an \`issue\`, a \`message\` and \`pages\` (${message})`)
  }
}

const THEMES = ['light', 'dark']
const CONFIGS = ['working', ...listConfigs().map(({ name }) => name)]

// Each config compiled from source, then the working copy with dist: a
// config's Sass options don't reach the prebuilt CSS, so one is enough.
const VARIANTS = [
  ...CONFIGS.map(config => ({ name: config, params: { config } })),
  { name: 'dist', params: { config: 'working', css: 'dist', js: 'dist' } }
]

const urls = ['/', '/compare.html', '/matrix.html', '/sizes.html', ...collectPages('/').flatMap(({ pages }) => pages.map(({ url }) => url))]

// How long the network must stay quiet before the page counts as settled.
const QUIET_MS = 500

// Messages that say nothing about the page. Failed resources are reported
// below, with their URL. Firefox warns when layout runs before a document's
// stylesheets have loaded, which depends on how fast the runner is: one frame
// of /matrix.html out of a nightly run's 13,904 loads, never locally (#297).
const IGNORED = [
  /^Failed to load resource/,
  /Layout was forced before the page was fully loaded/
]

// Counts the page's requests in flight, including its frames'. `settled()`
// resolves once none has been in flight for QUIET_MS, like Playwright's
// `networkidle`, which in WebKit sometimes never fires on /matrix.html: its
// off-screen lazy iframes never navigate, and the frame tree never reports
// idle (#259).
function trackRequests(page) {
  let inflight = 0
  let lastActivity = Date.now()
  const done = () => {
    inflight--
    lastActivity = Date.now()
  }

  page.on('request', () => {
    inflight++
    lastActivity = Date.now()
  })
  page.on('requestfinished', done)
  page.on('requestfailed', done)

  return {
    async settled() {
      while (inflight > 0 || Date.now() - lastActivity < QUIET_MS) {
        // eslint-disable-next-line no-await-in-loop
        await page.waitForTimeout(100)
      }
    }
  }
}

// Opens `path` and lists what the page reports.
async function visit(page, baseURL, path) {
  const { origin } = new URL(baseURL)
  const problems = []
  const requests = trackRequests(page)

  // Remote resources (avatars, web fonts) aren't the playground's to fix, and
  // an unreachable one must not fail the run.
  await page.route(target => target.origin !== origin, route => route.abort())

  page.on('pageerror', error => problems.push(`uncaught ${error.name}: ${error.message}`))
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type()) && !IGNORED.some(pattern => pattern.test(message.text()))) {
      problems.push(`console.${message.type() === 'warning' ? 'warn' : 'error'}: ${message.text()}`)
    }
  })
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin) {
      problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`)
    }
  })
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === origin) {
      problems.push(`HTTP ${response.status()}: ${response.url()}`)
    }
  })

  await page.goto(path)
  await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
  // Catches errors thrown by late scripts and timers too.
  await requests.settled()

  return problems
}

const scope = process.env.CONSOLE_SCOPE ? JSON.parse(process.env.CONSOLE_SCOPE) : { full: true }
const inScope = (variant, url) => scope.full || ['working', 'dist'].includes(variant) ||
  scope.configs.includes(variant) || scope.urls.includes(url)

for (const theme of THEMES) {
  for (const { name, params: variant } of VARIANTS) {
    test.describe(`${theme}-${name}`, () => {
      test.use({ colorScheme: theme })

      for (const url of urls.filter(url => inScope(name, url))) {
        test(url, async ({ page, context, baseURL, browserName }) => {
          const path = `${url}?${new URLSearchParams({ theme, ...variant })}`
          const problems = await visit(page, baseURL, path)

          const known = knownIssues.filter(entry => entry.pages.includes(url) && (!entry.engines || entry.engines.includes(browserName)))
          const unexpected = problems.filter(problem => !known.some(({ message }) => message.test(problem)))
          let gone = known.filter(({ message }) => !problems.some(problem => message.test(problem)))

          // An upstream fix makes a known issue go away on every load. Load
          // the page once more before calling it gone, so a single load that
          // missed it fails neither the run nor closes an issue that isn't
          // fixed (#283).
          if (gone.length > 0) {
            const again = await visit(await context.newPage(), baseURL, path)
            gone = gone.filter(({ message }) => !again.some(problem => message.test(problem)))
          }

          expect(unexpected, `${path} reported problems. If Bootstrap causes one, open a tracking issue labeled \`upstream\` ` +
            '(see "Upstream issue tracking" in CLAUDE.md) and add it to tests/console/known-issues.js').toEqual([])
          expect(gone.map(({ issue, message }) => `#${issue} ${message}`),
            'Known issues that no longer happen here: remove them from tests/console/known-issues.js, ' +
            'and if Bootstrap fixed them, mark the tracking issue `upstream-fixed` and close it').toEqual([])
        })
      }
    })
  }
}

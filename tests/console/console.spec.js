// Opens every page of the playground, in light and dark and with every config,
// and once more with Bootstrap's prebuilt dist files (`?css=dist&js=dist`), what
// users install, and fails on anything the page reports: uncaught exceptions, console errors
// and warnings (Bootstrap's deprecation notices included) and same-origin
// requests that fail or return an error status.
//
// Problems caused by an open upstream bug are listed in known-issues.js.
//
// CONSOLE_SCOPE, which `npm run console-scope` prints and console.yml sets on
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

const urls = ['/', '/compare.html', '/sizes.html', ...collectPages('/').flatMap(({ pages }) => pages.map(({ url }) => url))]

const scope = process.env.CONSOLE_SCOPE ? JSON.parse(process.env.CONSOLE_SCOPE) : { full: true }
const inScope = (variant, url) => scope.full || ['working', 'dist'].includes(variant) ||
  scope.configs.includes(variant) || scope.urls.includes(url)

for (const theme of THEMES) {
  for (const { name, params: variant } of VARIANTS) {
    test.describe(`${theme}-${name}`, () => {
      test.use({ colorScheme: theme })

      for (const url of urls.filter(url => inScope(name, url))) {
        test(url, async ({ page, baseURL, browserName }) => {
          const { origin } = new URL(baseURL)
          const problems = []

          // Remote resources (avatars, web fonts) aren't the playground's to
          // fix, and an unreachable one must not fail the run.
          await page.route(target => target.origin !== origin, route => route.abort())

          page.on('pageerror', error => problems.push(`uncaught ${error.name}: ${error.message}`))
          page.on('console', message => {
            // Failed resources are reported below, with their URL.
            if (['error', 'warning'].includes(message.type()) && !message.text().startsWith('Failed to load resource')) {
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

          const params = new URLSearchParams({ theme, ...variant })
          await page.goto(`${url}?${params}`)
          await page.waitForFunction(() => !document.getElementById('playground-config-pending'))
          // Catches errors thrown by late scripts and timers too.
          await page.waitForLoadState('networkidle')

          const known = knownIssues.filter(entry => entry.pages.includes(url) && (!entry.engines || entry.engines.includes(browserName)))
          const unexpected = problems.filter(problem => !known.some(({ message }) => message.test(problem)))
          const gone = known.filter(({ message }) => !problems.some(problem => message.test(problem)))

          expect(unexpected, `${url}?${params} reported problems. If Bootstrap causes one, open a tracking issue labeled \`upstream\` ` +
            '(see "Upstream issue tracking" in CLAUDE.md) and add it to tests/console/known-issues.js').toEqual([])
          expect(gone.map(({ issue, message }) => `#${issue} ${message}`),
            'Known issues that no longer happen here: remove them from tests/console/known-issues.js, ' +
            'and if Bootstrap fixed them, mark the tracking issue `upstream-fixed` and close it').toEqual([])
        })
      }
    })
  }
}

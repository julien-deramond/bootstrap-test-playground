// Playwright suites for the playground. See "Visual regression tests" in
// docs/testing.md. The suites run against a production build served by
// `vite preview`, so they test what gets deployed, with BOOTSTRAP_PATH
// honored like in dev.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4179
// `npm run check-issues` runs the reproductions' specs against its own dev
// server: PLAYWRIGHT_BASE_URL then replaces the build and preview below.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`

// Playwright's three engines, at desktop size. To add a device preset (a
// phone viewport with touch), add an entry like `'iphone': devices['iPhone 15']`.
const ENGINES = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari']
}

export default defineConfig({
  testDir: 'tests',
  outputDir: 'tests/results',
  // Baselines are per platform: fonts and anti-aliasing differ between macOS
  // and Linux, so a baseline only compares with screenshots from the same OS.
  snapshotPathTemplate: '{testDir}/screenshots/{platform}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/report' }]],
  expect: {
    // Strict on purpose: the point is to notice any pixel that moves.
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' }
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    // `?freeze` fixes "today" at noon UTC; UTC keeps it on the same day.
    timezoneId: 'UTC',
    locale: 'en-US'
  },
  // Every suite runs in each engine, as `visual`, `visual-firefox`,
  // `visual-webkit`, `console`, `console-firefox` and so on. The unsuffixed
  // project is Chromium, the default for `npm run test:visual`, `test:console`
  // and `test:smoke`. Visual baselines are per engine: Chromium's stay in
  // screenshots/<platform>/, the others go in screenshots/<platform>/<project>/.
  projects: ['visual', 'console', 'smoke'].flatMap(suite => Object.entries(ENGINES).map(([engine, device]) => ({
    name: engine === 'chromium' ? suite : `${suite}-${engine}`,
    testDir: `tests/${suite}`,
    use: { ...device },
    ...(suite === 'visual' && engine !== 'chromium' ? { snapshotPathTemplate: '{testDir}/screenshots/{platform}/{projectName}/{arg}{ext}' } : {})
  }))).concat(
    // axe-core checks the DOM and computed styles, which don't depend on the
    // engine, so the accessibility scan runs in Chromium only.
    { name: 'a11y', testDir: 'tests/a11y', use: { ...ENGINES.chromium } },
    // The reproductions' own specs, issues/<name>/repro.spec.js (see
    // tests/issues/fixtures.js), in Chromium: `forcePseudoState` needs it.
    { name: 'issues', testDir: 'issues', testMatch: /repro\.spec\.js$/, use: { ...ENGINES.chromium } }
  ),
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
})

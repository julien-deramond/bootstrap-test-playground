// Playwright suites for the playground. See "Visual regression tests" in the
// README. The suites run against a production build served by `vite preview`,
// so they test what gets deployed, with BOOTSTRAP_PATH honored like in dev.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4179

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
    baseURL: `http://localhost:${PORT}`,
    // `?freeze` fixes "today" at noon UTC; UTC keeps it on the same day.
    timezoneId: 'UTC',
    locale: 'en-US'
  },
  // The visual suite runs in Chromium only: its baselines are per engine. The
  // console crawl and the smoke tests run in each engine, as `console`,
  // `console-firefox`, `console-webkit` and so on. The unsuffixed project is
  // Chromium, the default for `npm run test:console` and `npm run test:smoke`.
  projects: [
    { name: 'visual', testDir: 'tests/visual' },
    ...['console', 'smoke'].flatMap(suite => Object.entries(ENGINES).map(([engine, device]) => ({
      name: engine === 'chromium' ? suite : `${suite}-${engine}`,
      testDir: `tests/${suite}`,
      use: { ...device }
    })))
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
})

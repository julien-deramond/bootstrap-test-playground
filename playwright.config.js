// Playwright suites for the playground. See "Visual regression tests" in the
// README. The suites run against a production build served by `vite preview`,
// so they test what gets deployed, with BOOTSTRAP_PATH honored like in dev.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4179

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
  projects: [
    { name: 'visual', testDir: 'tests/visual' },
    { name: 'console', testDir: 'tests/console' },
    { name: 'smoke', testDir: 'tests/smoke' }
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
})

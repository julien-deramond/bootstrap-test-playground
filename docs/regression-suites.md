# Running the suites

A map of the suites: which question each one answers, how to run it and how to update what it compares with. [Test suites](testing.md) and [Checks and audits](audits.md) document each one in full.

Once, after `npm ci`: `npx playwright install chromium`, plus `firefox webkit` for the other engines.

## Which suite answers what

| Question | Run | Details |
| --- | --- | --- |
| Does anything render differently? | `npm run test:visual` | [Visual regression tests](testing.md#visual-regression-tests) |
| Does a page log an error or a warning, or fail to load something? | `npm run test:console` | [Console crawl](testing.md#console-crawl) |
| Does every component open, close and answer the keyboard? | `npm run test:smoke` | [Interaction smoke tests](testing.md#interaction-smoke-tests) |
| Does it pass axe, focus, contrast and reflow checks? | `npm run test:a11y` | [Accessibility scan](testing.md#accessibility-scan) |
| Is a reproduced bug fixed yet? | `npm run check-issues`, `npm run test:issues` | [Reproduction specs](testing.md#reproduction-specs) |
| Same behavior in Firefox and WebKit? | `npm run test:smoke:engines`, `test:console:engines`, `test:visual:engines` | [Browser engines](testing.md#browser-engines) |
| Does everything compile, validate and stay consistent? | `check-configs`, `lint:html`, `check-dist`, the `audit-*` scripts | [Checks and audits](audits.md) |

## Run only what changed

The full console crawl loads about 5,000 pages. `npm run test-scope` prints what your changes need, as values to pass to the suites:

```sh
npm run test-scope
CONSOLE_SCOPE='{"full":false,"configs":["pill"],"urls":["/pages/checkout.html"]}' npm run test:console
```

Pull requests run the same scoped subsets. Filter further with Playwright's `-g`, like `npm run test:console -- -g combobox`. When another run holds port 4179, set `PLAYWRIGHT_PORT=4180`. See [Running two suites at once](testing.md#running-two-suites-at-once).

## When it runs

| Where | What runs |
| --- | --- |
| Your machine | Whatever you run. Baselines are yours: only Linux ones are committed |
| A pull request | The scoped console crawl, scoped smoke tests, the visual suite, the accessibility scan, `check-configs` and `lint:html` |
| Every night | The full crawl, every smoke variant in all three engines, and the [canary](bootstrap.md#nightly-canary) on a new Bootstrap commit |

## Known issues

When a suite fails because of an open Bootstrap bug, don't skip the test. Open a tracking issue first ([CLAUDE.md](../CLAUDE.md#upstream-issue-tracking)), then add an entry with its number:

| Suite | Allowlist |
| --- | --- |
| Console | `tests/console/known-issues.js` |
| Smoke | `tests/smoke/known-issues.js` |
| Accessibility | `tests/a11y/known-issues.js` (`issue` for a bug, `reason` for intended markup, never both) |
| Audits | `scripts/known-*.mjs` |

A suite fails when a listed problem stops happening. That means a fix landed: remove the entry.

## Baselines

Visual baselines are screenshots in `tests/visual/screenshots/<platform>/`. Fonts differ between systems, so only the Linux ones, which CI uses, are committed.

- **Locally**: `npm run test:visual -- -u` records new ones, for your own before and after. Review a failure with `npx playwright show-report tests/report`.
- **In a pull request**: when the rendering changes on purpose, add the `update-baselines` label. CI records the Linux baselines for Chromium, Firefox and WebKit, commits them to your branch and removes the label. Use `update-all-baselines` when a change moves Firefox or WebKit on pages the scope doesn't see. Never merge before the `update` job has pushed: `compare` fails until then.

[In CI](testing.md#in-ci) explains what the label records, and what happens when a branch moves while it runs.

# Contributing

Thanks for helping test Bootstrap v6. This page covers what you need to send a pull request here. For what each tool does, see [docs/](docs/README.md). For the conventions agents and people share, see [CLAUDE.md](CLAUDE.md).

## Set up

You need Node 20.19 or later.

```sh
npm ci
npx playwright install chromium   # once, for the test suites. Add firefox webkit for the other engines
npm run dev
```

Open <http://localhost:5173>. Out of the box the playground renders Bootstrap's defaults, installed from `twbs/bootstrap#main` and pinned by `package-lock.json`. To test a Bootstrap checkout of your own instead, see [Testing a Bootstrap pull request](docs/testing-a-bootstrap-pr.md).

## What to work on

Pick the issue template that fits when you open an issue:

- **Upstream Bootstrap bug**: a bug in Bootstrap itself, found here. See [Reproducing an issue](docs/reproducing-an-issue.md).
- **New config**: a saved setup that stresses part of Bootstrap. See [Adding a config](docs/adding-a-config.md).
- **New page** and **Playground improvement**: pages, tools and checks of the playground.

Bootstrap bugs are tracked in this repository and labeled `upstream`, `upstream-reported` or `upstream-fixed`. Never open an issue or a pull request on `twbs/bootstrap` for one from here: the workflow in [CLAUDE.md](CLAUDE.md#upstream-issue-tracking) says how a bug gets reported, and by whom.

## Commits and pull requests

- Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `chore`, and `chore(deps)` for dependency and Bootstrap updates. Add a scope when one area is concerned, then a lowercase, imperative summary.
- One issue per pull request. Pull requests are squash-merged, so the title becomes the commit on `main`.
- Reference the issue in the body: `Closes #n` when the pull request fixes an issue in this repository, `Refs #n` for partial work and for a reproduction of an upstream issue, whose tracking issue stays open until the fix lands on `twbs/bootstrap`.
- Don't apply the `good first issue` label.

## Checks to run

Run the check that matches what you changed. Every one of them also runs in CI on your pull request.

| You changed | Run |
| --- | --- |
| A page or the kitchen sink | `npm run lint:html` |
| A config, a reproduction's styles or Bootstrap | `npm run check-configs`, then `npm run audit-tokens` |
| A config's README | `npm run configs-table` (CI fails when `configs/README.md` is stale) |
| Anything that changes what a page renders or does | `npm run test-scope`, then the suites it names (see [Running the suites](docs/regression-suites.md)) |

`npm run test-scope` prints what the console crawl, the smoke tests and the accessibility scan have to run for your changes, so you don't need the full run. [CLAUDE.md](CLAUDE.md#conventions) lists the audits to run after a Bootstrap update.

## Visual baselines

Screenshot baselines are per operating system, and only the Linux ones are committed. When your pull request changes the rendering on purpose, add the `update-baselines` label: CI records the Linux baselines the pull request needs and commits them to your branch. Don't merge before its `update` job has pushed them. Details are in [Running the suites](docs/regression-suites.md#baselines).

## When a check finds a Bootstrap bug

Don't silence it. Record a tracking issue first, then add the allowlist entry with `issue: <n>`. The allowlists and the steps are in [CLAUDE.md](CLAUDE.md#upstream-issue-tracking).

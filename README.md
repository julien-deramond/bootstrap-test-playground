# Bootstrap test playground

A test bench for [Bootstrap v6](https://github.com/twbs/bootstrap/tree/v6-dev). It puts every docs example, realistic app screens and bug reproductions on one Vite site, compiles Bootstrap from source under 40+ configs, and runs a set of browser tests and audits against each new upstream commit.

**[Open the live playground →](https://julien-deramond.github.io/bootstrap-test-playground/)**

## Features

- **Kitchen sink**: every component and form example from the v6 docs, generated from the docs source
- **Real screens**: dashboards, forms and app screens ported from [shadcn/ui](https://github.com/shadcn-ui/ui) and Bootstrap's own examples, built with v6 components only
- **Configs**: saved Sass and CSS setups (radii, palettes, type scales, `$enable-*` options, custom color modes, partial builds), switched live on any page
- **Toolbar**: color mode, direction, primary hue, source or dist build, on every page, plus side-by-side *compare* and multi-config *matrix* views
- **Issue reproductions**: one folder per bug, each compiling its own isolated copy of Bootstrap
- **Test suites**: visual regression, a console crawl, interaction smoke tests for every JavaScript component, and an accessibility scan (axe-core, focus rings, color contrast), in Chromium, Firefox and WebKit
- **Audits**: CSS tokens, RTL, reduced motion, cascade layers, partial imports, option combinations, dist drift and bundle sizes
- **Nightly canary**: follows `v6-dev`, runs every check and opens a pull request with what changed

## Quick start

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The home page lists every page, with search and filters. Press <kbd>Ctrl</kbd>+<kbd>K</kbd> on any page to jump to another.

Out of the box, the playground renders **Bootstrap's defaults**. To try a change, edit the working copy in [`src/styles/`](src/styles/) (Sass options, custom rules or CSS tokens) and it hot-reloads, or pick a saved config from the toolbar. See [Customizing](docs/customizing.md).

### Test a local Bootstrap checkout

Bootstrap is installed from GitHub (`twbs/bootstrap#v6-dev`, pinned by the lockfile). To test a branch you're working on instead:

```sh
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Sass and JavaScript then come from that checkout, and edits there hot-reload too. See [Bootstrap versions and updates](docs/bootstrap.md).

## Common tasks

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm run new-issue <name> [-- --config <name>]` | Creates a reproduction in `issues/<name>/` |
| `npm run save-config <name>` / `use-config <name>` | Saves the working copy as a config, or loads one |
| `npm run update-bootstrap` | Moves to the latest `v6-dev` commit and runs the checks that need no browser |
| `npm run test:visual [-- -u]` | Compares every page with its screenshot baselines |
| `npm run test:console` / `test:smoke` / `test:a11y` | Console crawl, interaction smoke tests, accessibility scan |

The test suites need Playwright's browsers once: `npx playwright install chromium` (add `firefox webkit` for the other engines). [docs/README.md](docs/README.md#scripts) lists every script.

## Documentation

- [Customizing](docs/customizing.md): the working copy, where overrides go, saved configs
- [Pages and tools](docs/pages.md): page search, screens, kitchen sink, reproductions, toolbar, compare and matrix views
- [Bootstrap versions and updates](docs/bootstrap.md): updates, comparing commits, the nightly canary, source or dist
- [Test suites](docs/testing.md): visual, console, smoke, accessibility, browser engines
- [Checks and audits](docs/audits.md): configs, HTML, dist, tokens, sizes, options, RTL, motion, layers, partials

## Upstream bugs

Bootstrap bugs found here are tracked as [issues in this repository](https://github.com/julien-deramond/bootstrap-test-playground/issues?q=label%3Aupstream%2Cupstream-reported%2Cupstream-fixed), labeled `upstream` until they're reported to twbs/bootstrap, then `upstream-reported`, then `upstream-fixed`. The checks allowlist a known bug only with its tracking issue, and fail once it's fixed so the entry gets removed. [CLAUDE.md](CLAUDE.md) has the full workflow and the project's conventions.

## License

[MIT](LICENSE). The starter screens and kitchen sink examples are adapted from [Bootstrap](https://github.com/twbs/bootstrap) (MIT). The real screens are adapted from [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT, see [`screens/LICENSE-shadcn-ui.md`](screens/LICENSE-shadcn-ui.md)).

# Bootstrap versions and updates

By default, Bootstrap is installed from GitHub (`github:twbs/bootstrap#v6-dev`), and `package-lock.json` pins the commit. Run `npm run update-bootstrap` to move to the latest commit. The toolbar and home page show which commit is in use.

## Updating Bootstrap

`npm run update-bootstrap` moves to the latest `v6-dev` commit and does what follows every update:

1. installs it: `package.json` keeps `#v6-dev`, and the lockfile pins the commit;
2. lists the upstream commits since the one committed, from the `BOOTSTRAP_PATH` checkout when it has both commits, or the GitHub CLI;
3. resyncs the kitchen sink from that commit's docs, fetched into `.cache/bootstrap/<sha>/` like [`diff-bootstrap`](#comparing-two-commits) does, so no checkout is needed;
4. runs the checks that need no browser through [`canary-report`](#nightly-canary), against `node_modules` whatever `BOOTSTRAP_PATH` says: `check-configs`, `check-dist`, the static audits, `compile-matrix`, `lint:html` and `check-size`. The report, with the end of each failing check's output and the allowlist entries that no longer match, goes to `reports/canary/report.md`;
5. records the commit's sizes in `sizes/history.json`;
6. compares the kitchen sink's rendering at both commits with [`diff-bootstrap`](#comparing-two-commits), a minute or two, unless `--no-diff`;
7. writes [`updates/last-update.json`](#what-changed-in-the-last-update) and prints the commit message, `chore(deps): update bootstrap to v6-dev@<sha>`, with the files to add.

It exits with an error when a check fails. The console crawl, the smoke tests and the visual suite aren't part of it: `npm run canary-report` runs everything.

- `-- --to <ref>` pins a commit (full or short), branch or tag instead, for example to go back after a bad update.
- `-- --pr <n>` installs the head of twbs/bootstrap#<n>, from a fork too, to test an upstream pull request in the playground. Its sizes aren't recorded, and it says how far the branch is behind `v6-dev`, since a check can fail for what the branch misses. Don't commit it: `npm run update-bootstrap` goes back.

## What changed in the last update

[`updates/last-update.json`](../updates/last-update.json) records the last update: its two commits, the upstream commits between them, and the kitchen sink examples it changed. An example changed when the sync changed its markup (*New example*, *Markup changed*), or when `diff-bootstrap`'s screenshots differ with the same markup (*Renders differently*). It's committed with the update, so the deployed playground has it too.

- The home page shows it under the commit in use: *Last update*, the date, the number of upstream commits and of changed examples. Expanded (or opened with `/#last-update`), it lists the commits, linked with their pull requests, and the changed examples by page.
- On kitchen sink pages, each changed section's heading gets the same labels, linked to that panel. They're playground chrome: `?chrome=0` hides them, so screenshots don't change.

`npm run update-bootstrap` and the [nightly canary](#nightly-canary) write it with `npm run record-update -- --from <sha> --to <sha>`, after the sync and `diff-bootstrap`, before committing: markup changes are the sections that differ from `HEAD` (`--base <ref>` for another commit). Without a `diff-bootstrap` report for the same two commits, only markup changes are listed, and the panel says so. After `--pr`, it describes the pull request, which the panel shows as *Testing twbs/bootstrap#n*.

Dependabot updates the playground's other dependencies and its GitHub Actions every week, but never `bootstrap`. Bootstrap updates come from the [nightly canary](#nightly-canary), or from a deliberate `npm run update-bootstrap`.

## Comparing two commits

After an update, the question is what the upstream commits changed. `npm run diff-bootstrap -- <from> <to>` takes two commits, branches or tags of twbs/bootstrap (`npm run diff-bootstrap -- 624c7b9 v6-dev`) and fetches each into `.cache/bootstrap/<sha>/`, shallowly, reused on later runs. It then compares:

- the upstream commits between them;
- the default config's compiled CSS, normalized like [Checking the dist](audits.md#checking-the-dist), as a diff;
- its `--bs-*` tokens: added, removed, and changed values;
- the sizes [`check-size`](audits.md#sizes) measures;
- every kitchen sink example, screenshotted on a dev server per commit and compared pixel by pixel. `--no-screens` skips that part, and `--page=<filter>` narrows it.

```
35 upstream commits. CSS diff +465 −450 lines. Tokens: 22 added, 22 removed, 15 changed.
  dist/bootstrap.bundle.min.js: 49.3 KB +1.9 KB (+4.1%) brotli
5 kitchen sink examples render differently:
   280446 px  /kitchen-sink/forms-datepicker.html#inline-mode-4
```

It writes `reports/diff/<from>-<to>/index.html`, a browsable report with the diff, the token lists and each changed example (both commits and their difference), plus `summary.md` and `changes.json`, which [`record-update`](#what-changed-in-the-last-update) reads. The nightly canary runs it on every update: the summary goes into its pull request, and the full report into the run's artifact. A comparison takes one to two minutes.

To look at the two commits yourself, `npm run diff-bootstrap -- <from> <to> --serve` skips the report and serves the playground with `<from>` at <http://localhost:5198/> and with `<to>` under <http://localhost:5198/b/>, from one origin. The [compare view](pages.md#compare) then gets a *Bootstrap* field in each pane and a *Commit A / B* preset, and keeps both panes in sync as usual:

```sh
npm run diff-bootstrap -- 624c7b9 v6-dev --serve
# Compare: http://localhost:5198/compare.html?page=%2Fkitchen-sink%2Fcomponents-button.html&a=bootstrap%3Da&b=bootstrap%3Db
```

## Nightly canary

[`.github/workflows/canary.yml`](../.github/workflows/canary.yml) runs every night, and on demand from the *Actions* tab. When `v6-dev` has moved, it:

1. updates Bootstrap like `npm run update-bootstrap` (`package.json` keeps `#v6-dev`, the lockfile pins the new commit);
2. fetches that exact commit's docs and resyncs the kitchen sink;
3. runs every check with `npm run canary-report`, then compares the two commits with `npm run diff-bootstrap`: the compile and dist checks, every audit, `lint:html`, the size check (its table goes into the report, and the new sizes into `sizes/history.json`), the rendered audits, the console crawl, the smoke tests in all three engines, and the visual suite. The console crawl and the smoke tests run the working copy and dist only, like a pull request that changes no config: a Bootstrap update is a shared change, so the pull request's own checks run them with every config;
4. records the update in [`updates/last-update.json`](#what-changed-in-the-last-update) with `npm run record-update`;
5. opens a pull request `chore(deps): update bootstrap to v6-dev@<sha>`, or updates the open one. It's labelled `canary`, plus `checks-failing` when a check fails.

The pull request body is the report: the upstream commits since the last update, one row per check, the kitchen sink pages the sync changed, the end of each failing check's output, and the allowlist entries that no longer match. A stale entry usually means Bootstrap fixed a tracked bug, which is step 3 of [Upstream issues](../CLAUDE.md#upstream-issue-tracking). The visual suite is reported as *changed* rather than failed, since a Bootstrap update can change the rendering on purpose; the run's *canary-report* artifact has the diffs. When `v6-dev` hasn't moved, or the open pull request is already at its head, the workflow stops after one `git ls-remote`. When the pull request's branch has commits of your own, it leaves the branch alone and comments with a link to the new report. It never merges.

Upstream pull request numbers in commit subjects are shown as code, not links, so the report doesn't add a cross-reference to twbs/bootstrap every night.

Opening the pull request needs one of these:

- a `CANARY_TOKEN` repository secret (*Settings › Secrets and variables › Actions*, not an environment secret): a fine-grained token limited to this repository, with *Contents*, *Pull requests* and *Issues* read/write. *Issues* covers the labels and the take-over comment. With it, the pull request also starts the other workflows, and shows the token's owner as its author. When the token expires, the canary fails at checkout until the secret is updated. It isn't allowed to read twbs/bootstrap through the API, so only the checkout and the pull request step use it; the other steps list the upstream commits with `GITHUB_TOKEN`.
- *Allow GitHub Actions to create and approve pull requests* in the repository's *Settings › Actions › General*. The pull request then comes from `GITHUB_TOKEN`, which doesn't start other workflows, so the report is its only check run. The console crawl and the smoke tests then never run with every config: start *Console crawl* and *Smoke tests* on the `canary/bootstrap` branch by hand.

From the *Actions* tab, *Run workflow* with *force* runs the checks even when `v6-dev` hasn't moved, and uploads the report without opening a pull request when nothing changed.

`npm run canary-report` runs the same checks locally, against `node_modules/bootstrap`, in about four minutes. `-- --only audit-rtl,lint:html` runs a subset, and `-- --from <sha> --to <sha>` adds the upstream commit range.

## Weekly status sweep

[`.github/workflows/status-sweep.yml`](../.github/workflows/status-sweep.yml) runs the status sweep of [Upstream issues](../CLAUDE.md#upstream-issue-tracking) every Monday, after the canary, and on demand from the *Actions* tab. It runs `npm run status-sweep -- --apply`:

- An open `upstream-reported` issue follows the twbs/bootstrap items of its *Reported upstream: twbs/bootstrap#n* comments. When they're all fixed on `v6-dev` (a pull request merged, or an issue closed as completed by a commit or with a merged pull request linked to close it, whose commit is in `v6-dev`), the issue moves to `upstream-fixed` and is closed with *Fixed upstream in twbs/bootstrap#pr (commit)*. The comment says whether the playground already installs the fix, and which allowlists or checks still reference the issue: remove those entries with the update, when the checks report them gone. While an item is open, it waits. When they're all closed but one isn't fixed (a pull request closed without merging, an issue closed as not planned, or closed by hand), it comments for a human instead.
- An open `upstream` issue that a twbs/bootstrap issue or pull request links to moves to `upstream-reported`, with the *Reported upstream* comment. Otherwise, the twbs/bootstrap items updated in the last eight days (`--since`) whose title shares three keywords with the issue's title, or two backed by code from it or five words of the description, get a comment as possible matches. A human decides: follow step 2 or 3 by hand. These are written as code, not links, so a wrong guess doesn't cross-reference the issue on twbs/bootstrap.

Each comment carries a hidden marker, so a finding is reported once. The job summary lists what the sweep did. It only makes API calls, with `GITHUB_TOKEN` (`CANARY_TOKEN` can't read twbs/bootstrap), in about a minute.

`npm run status-sweep` alone is a dry run: it prints what it would do and changes nothing. `-- --since 2026-09-01` looks further back for possible matches.

## Testing a local checkout

To test a local Bootstrap checkout instead of the GitHub package, such as a branch you're working on, point `BOOTSTRAP_PATH` to it:

```sh
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Vite then resolves every `bootstrap/...` import (Sass and JS) to that folder, and edits there hot-reload too. Delete `.env.local` to go back to GitHub.

The toolbar and the home page then show the checkout's branch, commit and state, like `local checkout: v6-dev@1a2b3c4 (dirty)`, linked to the branch on GitHub when it tracks a GitHub remote. On the home page, the dot turns amber while the checkout has uncommitted changes. In dev, the label follows git operations (checkout, commit, stash…) and edits to the files the playground uses, without reloading the page. Other files, like a new untracked one, show up at the next of those. Editing a docs MDX file also resyncs its [kitchen sink](pages.md#kitchen-sink) page.

## Source or dist

The playground builds Bootstrap from **source**, the way Bootstrap's own build does:

- **CSS** is compiled from `scss/`, then `postcss.config.js` applies the same PostCSS step as Bootstrap's `build/postcss.config.mjs`. That step adds the `--bs-` prefix to every custom property and runs Autoprefixer with Bootstrap's `.browserslistrc`. The output matches `dist/css/bootstrap.css` (see [Checking the dist](audits.md#checking-the-dist)), and the builds keep `light-dark()` intact.
- **JavaScript** is imported from `js/src/index.ts`, so the playground runs the branch's current code even when the committed `js/dist/` hasn't been rebuilt yet.

Users install the package and get its prebuilt files, though, and a stale or broken `dist` is its own kind of bug (#1). The toolbar's **CSS** and **JavaScript** switches, or `?css=dist` and `?js=dist` in the URL, loads those instead:

- **`css=dist`** replaces the compiled `main.scss` with `dist/css/bootstrap.css`. `tokens.css` still applies on top, from the working copy or the selected config, but a config's Sass options can't reach a prebuilt file. Issue reproductions compile their own styles, so they keep them.
- **`js=dist`** loads `js/dist/index.js`, what `import 'bootstrap'` gives users, instead of `js/src/index.ts`. Only one of the two ever loads. The JavaScript can't be swapped live, so the switch reloads the page.

Both honor `BOOTSTRAP_PATH`. The compare view's *Source / Dist* preset puts the default config compiled from source next to the prebuilt files, and the [console crawl](testing.md#console-crawl) and the [smoke tests](testing.md#interaction-smoke-tests) run a `dist` variant too.

`src/js/main.js` imports Bootstrap dynamically, so it runs after `DOMContentLoaded`, and sometimes after `load`. Several components only initialize from those events ([#160](https://github.com/julien-deramond/bootstrap-test-playground/issues/160)), so `main.js` replays the ones that fired while it loaded. A page's own inline scripts are bundled after `main.js` in a build: have them check `document.readyState` rather than only listen for `load`.

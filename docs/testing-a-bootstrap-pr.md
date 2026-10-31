# Testing a Bootstrap pull request

Use this when an open pull request on `twbs/bootstrap` might change how Bootstrap renders or behaves, and you want to know what it breaks. There are two routes. Both end the same way: you run the checks and report what you find here, not on the pull request.

## Pick a route

| Route | Use it when | Needs |
| --- | --- | --- |
| [Install the pull request](#route-1-install-the-pull-request) | You only want to test the pull request as it is | The GitHub CLI, signed in |
| [Use a local checkout](#route-2-use-a-local-checkout) | You want to edit the pull request's code while you test, or the branch isn't one you can install | A clone of `twbs/bootstrap` |

## Route 1: install the pull request

```sh
npm run update-bootstrap -- --pr 42970
```

This installs the head of `twbs/bootstrap#42970`, from a fork too, then resyncs the kitchen sink, runs the checks that need no browser and compares the rendering with the commit you had before. It tells you how far the branch is behind `main`, because a check can fail for something the branch misses. The home page then shows *Testing twbs/bootstrap#42970*.

Never commit this state. `npm run update-bootstrap` with no option goes back to the latest `main`. The options are in [Updating Bootstrap](bootstrap.md#updating-bootstrap).

## Route 2: use a local checkout

```sh
cd ../twbs/bootstrap
gh pr checkout 42970
cd -
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Sass and JavaScript now come from the checkout, and edits there hot-reload. The toolbar shows its branch and commit. Delete `.env.local` to go back to the installed package. See [Testing a local checkout](bootstrap.md#testing-a-local-checkout).

The suites read `.env.local` too, so they test the checkout. Two things differ from route 1: the kitchen sink isn't resynced by `--pr`, so run `npm run sync-kitchen-sink -- ../twbs/bootstrap` when the pull request changes the docs examples, and `update-bootstrap` always checks `node_modules`, not the checkout.

## See what changed

Compare the pull request with the commit it branches from:

```sh
npm run diff-bootstrap -- <base-sha> <pr-sha>
```

It writes `reports/diff/<from>-<to>/index.html`: the CSS diff, the tokens that moved, the sizes and every kitchen sink example that renders differently, with both screenshots. Open that file first. [Comparing two commits](bootstrap.md#comparing-two-commits) explains each part, and `--serve` puts both commits side by side in the [compare view](pages.md#compare).

## Run the checks

```sh
npm run test-scope           # what the pull request touches
npm run check-configs        # every config still compiles
npm run check-dist           # the playground's build still matches Bootstrap's
npm run audit-tokens         # and the other audit-* scripts, see Checks and audits
npm run test:smoke
npm run test:console
npm run test:a11y
```

Run the suites with the scope that `test-scope` printed rather than in full. [Running the suites](regression-suites.md) says which suite answers which question. For a change that moves pixels on purpose, record baselines before and compare after:

```sh
npm run test:visual -- -u    # on the commit you start from
npm run test:visual          # on the pull request
```

## Report what you find

A failure that Bootstrap causes becomes a tracking issue in this repository, with the `upstream` label and the pull request's number in its body. Use the *Upstream Bootstrap bug* form. Don't comment on the upstream pull request: the workflow in [CLAUDE.md](../CLAUDE.md#upstream-issue-tracking) says when and by whom something is reported there.

A failure that a pull request's author already knows about still gets an issue, because the allowlists need one before they accept an entry. See [Reproducing an issue](reproducing-an-issue.md) to add a page that shows it.

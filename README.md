# Bootstrap test playground

A Vite multi-page playground for testing [Bootstrap v6](https://github.com/twbs/bootstrap/tree/v6-dev) (`v6-dev` branch) and reproducing issues. Every screen or reproduction is a plain HTML file, and Sass and CSS changes hot-reload.

Out of the box it renders **Bootstrap's defaults**: nothing is configured in Sass and no CSS custom property is overridden. The customization entry points are already wired up, so testing a change means uncommenting a few lines.

## Quick start

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The home page lists every page.

| Script | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` / `npm run preview` | Builds every page to `dist/` and serves the build |
| `npm run new-issue 42928 [-- --config <name>]` | Creates `issues/42928/` from the reproduction template and a config |
| `npm run save-config <name> [-- "Description"]` | Saves the working copy (`src/styles/`) as `configs/<name>/` |
| `npm run use-config <name>` | Replaces the working copy with `configs/<name>/` |
| `npm run update-bootstrap` | Moves `node_modules/bootstrap` to the latest `v6-dev` commit |
| `npm run sync-kitchen-sink -- ../twbs/bootstrap` | Regenerates `kitchen-sink/` from a Bootstrap checkout's docs |

## Where Bootstrap comes from

By default, Bootstrap is installed from GitHub (`github:twbs/bootstrap#v6-dev`), and `package-lock.json` pins the commit. Run `npm run update-bootstrap` to move to the latest commit. The toolbar and home page show which commit is in use.

To test a **local checkout** instead, such as a branch you're working on:

```sh
cp .env.example .env.local   # BOOTSTRAP_PATH=../twbs/bootstrap
npm run dev
```

Vite then resolves every `bootstrap/...` import (Sass and JS) to that folder, and edits there hot-reload too. Delete `.env.local` to go back to GitHub.

The playground builds Bootstrap from **source**, the way Bootstrap's own build does:

- **CSS** is compiled from `scss/`, then `postcss.config.js` applies the same PostCSS step as Bootstrap's `build/postcss.config.mjs`. That step adds the `--bs-` prefix to every custom property and runs Autoprefixer with Bootstrap's `.browserslistrc`. The output matches `dist/css/bootstrap.css`, and the builds keep `light-dark()` intact.
- **JavaScript** is imported from `js/src/index.ts`, so the playground runs the branch's current code even when the committed `js/dist/` hasn't been rebuilt yet. To test the prebuilt files instead, import `'bootstrap'` in `src/js/main.js`.

## Customizing

The styles for the shared pages come from three files in `src/styles/`, the **working copy**. Out of the box they're empty or commented out, so the output is Bootstrap's defaults.

| File | Use it for |
| --- | --- |
| [`main.scss`](src/styles/main.scss) | **Sass configuration**: swap `@use "bootstrap/scss/bootstrap";` for the commented `with (...)` version (options, `$root-tokens`, `$theme-colors`, component `$*-tokens`) |
| [`_custom.scss`](src/styles/_custom.scss) | **Custom Sass rules**, in Bootstrap's `custom` cascade layer, with access to Bootstrap's mixins and functions |
| [`tokens.css`](src/styles/tokens.css) | **Runtime CSS custom properties**, no Sass needed |

In `tokens.css`, write tokens unprefixed like the Sass docs (`--border-radius`) or prefixed like the dist CSS (`--bs-border-radius`). Both end up as `--bs-*`. Where you put an override matters:

- **Global tokens** (`:root`) must stay **unlayered**. Bootstrap outputs its `:root` tokens unlayered, so an override inside `@layer custom { :root { … } }` loses.
- **Component tokens and rules** go in `@layer custom`, after `components` and before `helpers` and `utilities`.

### Configs

Once the working copy holds a good test case, save it as a **config**, a folder in [`configs/`](configs/) with the same three files:

```sh
npm run save-config rounded-dark -- "Large radii and a dark-first palette"
```

Then:

- **Preview it on any page** with the toolbar's *Styles* menu, or with `?config=rounded-dark` in the URL. The shared stylesheets are swapped live, and the page doesn't need a reload.
- **Start a reproduction from it**: `npm run new-issue 42928 -- --config rounded-dark`
- **Make it the working copy**: `npm run use-config rounded-dark`. This refuses to run if `src/styles/` has uncommitted changes, unless you pass `-- --force`.

`configs/default/` holds Bootstrap's defaults. Keep it pristine; `npm run use-config default` resets the working copy.

## Pages

```text
index.html               Home: lists every page
pages/                   Starter screens (dashboard, checkout and sign-in forms, product and pricing marketing)
kitchen-sink/            One page per component or form doc, with all of its docs examples (generated)
compare.html             Side-by-side comparison of any page
issues/<name>/           Issue reproductions (index.html + the three config files)
src/styles/              Working copy of the styles (see Customizing)
configs/<name>/          Saved configs; configs/default/ is Bootstrap's defaults
src/js/main.js           Shared entry: Bootstrap JS, demo wiring, config switcher, toolbar
public/                  Favicon and the early preferences script
scripts/                 new-issue, save-config, use-config, sync-kitchen-sink, issue template
```

Every `.html` file under `pages/`, `kitchen-sink/` and `issues/` is picked up automatically. There's no list to maintain.

### Starter screens

Adapted from Bootstrap's own examples (`site/src/assets/examples/`). They load the shared styles, so they show the working copy, or whichever config you pick in the toolbar.

### Kitchen sink

`kitchen-sink/*.html` is generated from the live examples in the v6 docs (`site/src/content/docs/{components,forms}/*.mdx`), so it always uses the current markup. The npm package doesn't ship the docs, so regenerating needs a Bootstrap checkout:

```sh
npm run sync-kitchen-sink -- ../twbs/bootstrap   # or rely on BOOTSTRAP_PATH in .env.local
```

Don't edit these files by hand. They're overwritten on every sync.

### Issue reproductions

```sh
npm run new-issue 42928                          # from configs/default (Bootstrap's defaults)
npm run new-issue pg-3 -- --config rounded-dark  # from a saved config
npm run new-issue pg-4 -- --config working       # from the working copy
```

This creates `issues/<name>/` with an `index.html` and a copy of the config's three files, served at `/issues/<name>/`. A numeric name links to `twbs/bootstrap#<name>`. Each reproduction **compiles its own copy of Bootstrap**, so its styles stay isolated from the shared files, from other reproductions, and from the toolbar's *Styles* menu.

To share a reproduction, push the repository and link to the folder on GitHub, or open it in StackBlitz: `https://stackblitz.com/github/julien-deramond/bootstrap-test-playground`.

## Toolbar

Each page has a small floating toolbar. It renders in a shadow root, so it doesn't pick up or leak any styles.

| Control | Effect | Shortcut | URL override |
| --- | --- | --- | --- |
| Color mode | Auto (system), Light or Dark, through `data-bs-theme` on `<html>` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>T</kbd> cycles | `?theme=dark` |
| Direction | LTR or RTL, through `dir` on `<html>` | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> toggles | `?dir=rtl` |
| Primary | Remaps the `--bs-primary-*` tokens to another hue at runtime | | `?primary=teal` |
| Styles | Swaps the working copy for a saved config | | `?config=<name>` |
| Compare | Opens the current page in the compare view | | |
| Reset | Back to Bootstrap's defaults | | |

Toolbar choices are saved in `localStorage` and applied before first paint by `public/playground-prefs.js`. URL parameters override them for that view only, without saving, which makes links like `/pages/dashboard.html?theme=dark&dir=rtl` shareable. `window.bootstrap` is available in the console on every page.

### Compare

[`/compare.html`](compare.html) shows any page twice, side by side, with separate theme, direction, primary and config settings, and keeps the two panes' scroll positions in sync. Presets cover Light / Dark, LTR / RTL, and Working / Default. The whole setup lives in the URL, so a comparison can be shared as a link.

## Upstream issues

Potential Bootstrap bugs found here are tracked as issues in this repository. Each one carries one of three labels as it moves through the process: `upstream` (not reported yet), then `upstream-reported`, then `upstream-fixed`, when the issue is closed. The workflow is in [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE). The starter screens and kitchen sink examples are adapted from [Bootstrap](https://github.com/twbs/bootstrap), which is also MIT-licensed.

# Configs

Each folder here is a saved **config**: a snapshot of the three style files that shape Bootstrap in this playground.

| File | Role |
| --- | --- |
| `main.scss` | Compiles Bootstrap, optionally with a Sass `with (...)` configuration |
| `_custom.scss` | Custom Sass rules, in Bootstrap's `custom` cascade layer |
| `tokens.css` | Runtime CSS custom properties |
| `README.md` | Optional. Its first paragraph is the description shown in the toolbar |

The working copy in `src/styles/` has the same layout, and so does every reproduction in `issues/`.

## Workflow

```sh
# Snapshot the working copy (src/styles/) once it holds a good test case
npm run save-config rounded-dark -- "Large radii and a dark-first palette"

# Preview any config live: pick it in the toolbar's "Styles" menu, or add ?config=rounded-dark to the URL

# Start an issue reproduction from a config (default: `default`)
npm run new-issue 42928 -- --config rounded-dark

# Make a config the working copy, replacing src/styles/
npm run use-config rounded-dark
```

`default` holds Bootstrap's defaults. Keep it pristine.

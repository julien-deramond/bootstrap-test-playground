# Fonts

Web fonts for the configs, served from the playground itself so pages never load a font from another origin: they render the same offline, and screenshots don't depend on the network. Configs declare them with `@font-face` in their `tokens.css`, with root-relative URLs (`/fonts/…`), which Vite prefixes with the base path in builds.

Each font is a variable font, copied from its [Fontsource](https://fontsource.org/) package, Latin and Latin Extended subsets only, normal style only (browsers synthesize italics). Every folder keeps the font's license as `OFL.txt`.

| Folder | Font | Axes | Used by | Source | License |
| --- | --- | --- | --- | --- | --- |
| `geist/` | Geist | wght 100–900 | `shadcn` | `@fontsource-variable/geist` 5.3.0 | SIL OFL 1.1 |
| `geist-mono/` | Geist Mono | wght 100–900 | `shadcn` | `@fontsource-variable/geist-mono` 5.3.0 | SIL OFL 1.1 |
| `inter/` | Inter | wght 100–900, opsz 14–32 | `web-font` | `@fontsource-variable/inter` 5.3.0 | SIL OFL 1.1 |
| `jetbrains-mono/` | JetBrains Mono | wght 100–800 | `web-font` | `@fontsource-variable/jetbrains-mono` 5.3.0 | SIL OFL 1.1 |

To add a font, copy its `files/<name>-latin-*-normal.woff2` and `LICENSE` (as `OFL.txt`) from `npm pack @fontsource-variable/<name>`, and take each subset's `unicode-range` from the package's CSS. Only fonts whose license allows redistribution belong here.

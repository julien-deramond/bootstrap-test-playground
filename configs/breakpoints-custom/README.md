# breakpoints-custom

Breakpoints `xs`, `sm`, `tablet`, `lg`, `xl` and `3xl`: `md` renamed to `tablet`, `2xl` removed and `3xl: 1920px` added. Use it to see what follows `$breakpoints` and what hard-codes the default names. Every `md:` and `2xl:` class in the pages stops responding, which is expected.

Category: layout

## What it stresses

- `$breakpoints` isn't merged over its defaults, unlike the other layout maps: the map passed replaces it, so the config lists every tier. Upstream chose this on purpose ([twbs/bootstrap#42850](https://github.com/twbs/bootstrap/pull/42850)).
- Responsive classes follow the names: `tablet:d-none`, `tablet:col-6`, `tablet:g-col-4`, `tablet:navbar-expand`, `3xl:container`. A leading digit is escaped (`.\33 xl\:container`). The `--breakpoint-*` tokens follow too.
- `$container-max-widths` is merged over its defaults, so `md` and `2xl` are removed with `null` and `tablet` and `3xl` are added. The known gap below keeps `.container` 720px wide from 768px to 1920px.
- Tooltips, popovers and menus: their responsive placement ignores `tablet:` and `3xl:` and keeps reacting to `md:` at 768px (the known gap below). Nav overflow's `collapseBelow` reads the tokens and follows the config.
- Expected breakage: the markup that hard-codes `md:` or `2xl:` keeps its mobile layout. That's 10 kitchen sink pages (Button, Card, Floating labels, Layout, List group, Menu, Navbar, Popover, Tooltip, Validation), the 4 pages in `pages/` and 15 of the screens.

## Pages to check

- [Checkout](../../pages/checkout.html) at 1024px or wider, for the container width, and at any width for the `md:` grid
- [Tooltip](../../kitchen-sink/components-tooltip.html), [Popover](../../kitchen-sink/components-popover.html) and [Menu](../../kitchen-sink/components-menu.html), for responsive placement
- [Navbar](../../kitchen-sink/components-navbar.html), whose `md:navbar-expand` example stays collapsed
- [Dashboard](../../screens/dashboard.html), which uses `md:` for its layout and its menus' placement

## Known gaps

- [#190](https://github.com/julien-deramond/bootstrap-test-playground/issues/190): the `tablet` container width is output after the `lg` and `xl` ones, so `.container` stays 720px wide from 768px to 1920px instead of growing to 960px and 1200px.
- [#191](https://github.com/julien-deramond/bootstrap-test-playground/issues/191): responsive placement only knows the default breakpoints: `tablet:` and `3xl:` are ignored, and `md:` still applies at 768px.

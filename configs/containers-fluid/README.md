# containers-fluid

No `$container-max-widths`: `.container` is as wide as the viewport at every size, like `.container-fluid`, and the responsive `sm:container` to `2xl:container` classes aren't generated. Unlike `no-containers`, containers keep their padding and centering.

## What it stresses

- Removing every key of a map merged over its defaults: `$container-max-widths: ()` changes nothing, so each key is set to `null`.
- Pages built on `.container`, whose content now runs as wide as the window: line lengths, grids and cards on wide screens.
- Markup that uses `md:container` or another responsive container gets no styles at all, since those classes are gone. None of the pages here does.

## Pages to check

- [Checkout](../../pages/checkout.html), [Pricing](../../pages/marketing-pricing.html) and [Product](../../pages/marketing-product.html) on a wide screen
- [Navbar](../../kitchen-sink/components-navbar.html), whose examples nest containers

## Known gaps

None known.

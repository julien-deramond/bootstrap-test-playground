# no-containers

`$enable-container-classes: false`: no `.container`, `.container-fluid` or responsive containers. Almost every page here wraps its content in `.container`, so content runs edge to edge; that's expected, not a bug.

Category: layout

## What it stresses

- That no component depends on `.container`: the navbar and every other component should render the same, only wider.

## Pages to check

- [Navbar](../../kitchen-sink/components-navbar.html), whose examples nest `.container-fluid`
- [Starter screens](../../pages/), whose layout is built on containers

## Known gaps

None known.

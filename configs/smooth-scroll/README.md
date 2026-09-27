# smooth-scroll

`$enable-smooth-scroll: true`: `:root` gets `scroll-behavior: smooth` unless the reader prefers reduced motion. Use it to check in-page navigation and scrollspy with smooth scrolling on.

## What it stresses

- The `scroll-behavior` rule, which has to stay under `prefers-reduced-motion: no-preference`.
- Scrollspy, which has to follow a scroll that takes time.

## Pages to check

- [Scrollspy](../../kitchen-sink/components-scrollspy.html)
- In-page links, like the heading anchors of any kitchen sink page

## Known gaps

None known.

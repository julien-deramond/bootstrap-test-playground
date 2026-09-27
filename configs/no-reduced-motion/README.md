# no-reduced-motion

`$enable-reduced-motion: false`: transitions and animations ignore `prefers-reduced-motion`. Use it to check that the option removes every reduced-motion query (`npm run audit-motion`), and to see all motion even with the OS setting on.

## What it stresses

- Every `prefers-reduced-motion` query Bootstrap emits: none may be left. `npm run audit-motion` lists the ones that are.
- With the OS setting on, everything should move as if it were off: spinners at full speed, collapses and carousels animated.

## Pages to check

- [Accordion](../../kitchen-sink/components-accordion.html), [Collapse](../../kitchen-sink/components-collapse.html) and [Carousel](../../kitchen-sink/components-carousel.html), whose queries survive
- [Spinner](../../kitchen-sink/components-spinner.html) and [Placeholder](../../kitchen-sink/components-placeholder.html)

## Known gaps

- [#146](https://github.com/julien-deramond/bootstrap-test-playground/issues/146): four `prefers-reduced-motion` queries stay in the CSS, on the accordion, collapse and carousel.

# no-transitions

`$enable-transitions: false`: no transitions, no progress bar stripes or carousel progress indicator; spinners and placeholders still animate. Use it to check that turning transitions off removes every one of them (`npm run audit-motion`), and that components still open and close without them.

Category: options

## What it stresses

- Every `transition()` and `transition-props()` mixin: none may emit a transition. `npm run audit-motion` fails on one that survives, and its `--render` run on one the browser sees.
- JavaScript that waits for `transitionend`: collapse, accordion, carousel, dialogs, drawers, toasts, tooltips and popovers must still open and close, and fire their `shown` and `hidden` events.
- Animations that aren't transitions stay on purpose: spinners and placeholders.

## Pages to check

- [Collapse](../../kitchen-sink/components-collapse.html) and [Accordion](../../kitchen-sink/components-accordion.html)
- [Carousel](../../kitchen-sink/components-carousel.html) and [Progress](../../kitchen-sink/components-progress.html)
- [Dialog](../../kitchen-sink/components-dialog.html), [Drawer](../../kitchen-sink/components-drawer.html) and [Toasts](../../kitchen-sink/components-toasts.html)
- [Tooltip](../../kitchen-sink/components-tooltip.html) and [Popover](../../kitchen-sink/components-popover.html)

## Known gaps

None known.

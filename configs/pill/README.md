# pill

`$radius: 2rem`: controls turn into pills and the radius scale runs from .5rem to 4rem. Use it to check nested and joined corners, which small radii hide.

Category: shape

## What it stresses

- The `$radii` scale: `--radius-5` is 2rem, `--radius-7` (large controls, cards) 3rem, `--radius-9` 4rem.
- Inner radii: card images and headers, list groups inside cards, accordion items and dialog headers subtract the border width from the outer radius.
- Joined corners: input groups, button groups, OTP slots and horizontal list groups only round their outer ends.
- Short or tall boxes: a radius larger than half the box caps it into a pill, and multi-line textareas and cards round their corners deeply.

## Pages to check

- [Input group](../../kitchen-sink/forms-input-group.html), [Button group](../../kitchen-sink/components-button-group.html) and [OTP input](../../kitchen-sink/forms-otp-input.html)
- [Card](../../kitchen-sink/components-card.html), [List group](../../kitchen-sink/components-list-group.html) and [Accordion](../../kitchen-sink/components-accordion.html)
- [Tabs](../../kitchen-sink/components-tab.html), whose active tab rounds only its top corners

## Known gaps

None known.

// Accessibility violations that the scan expects. Each entry names the axe
// rule (`color-contrast`), optionally a `target` regular expression matched
// against the node's selector and, for color-contrast, the `colors` axe
// measured (`#ffffff on #0087fe`), the exact pages it happens on, and `themes`
// to limit it to light or dark. Then either `issue`, the tracking issue of an
// upstream bug in this repository, or `reason` when the markup is intended,
// never both. If an entry stops matching on one of its pages, the run fails,
// so the entry gets removed and the tracking issue checked (see "Upstream
// issue tracking" in CLAUDE.md).
export default [
  {
    rule: 'color-contrast',
    colors: '#006ac9 on #c9eaff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-accordion.html',
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008c45 on #cff1dd',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008c45 on #f6f7f8',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-navbar.html',
      '/pages/checkout.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008c45 on #ffffff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-pagination.html',
      '/kitchen-sink/forms-field.html',
      '/kitchen-sink/forms-validation.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008ec4 on #cbf2ff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-drawer.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008ec4 on #ffffff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-pagination.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#77828c on #171a1d',
    themes: ['dark'],
    pages: [
      '/screens/cards.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#a87700 on #fff6d3',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#a87700 on #ffffff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-pagination.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #0087fe',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-card.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #0087fe',
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-carousel.html',
      '/kitchen-sink/components-collapse.html',
      '/kitchen-sink/components-dialog.html',
      '/kitchen-sink/components-drawer.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-placeholder.html',
      '/kitchen-sink/components-popover.html',
      '/kitchen-sink/components-progress.html',
      '/kitchen-sink/components-scrollspy.html',
      '/kitchen-sink/components-spinner.html',
      '/kitchen-sink/components-tab.html',
      '/kitchen-sink/components-toasts.html',
      '/kitchen-sink/components-toggler.html',
      '/kitchen-sink/components-tooltip.html',
      '/kitchen-sink/forms-chips.html',
      '/kitchen-sink/forms-datepicker.html',
      '/kitchen-sink/forms-field.html',
      '/kitchen-sink/forms-form-control.html',
      '/kitchen-sink/forms-layout.html',
      '/kitchen-sink/forms-overview.html',
      '/kitchen-sink/forms-validation.html',
      '/pages/checkout.html',
      '/pages/marketing-pricing.html',
      '/pages/marketing-product.html',
      '/pages/sign-in.html',
      '/pages/utilities-only.html',
      '/screens/authentication.html',
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/login-01.html',
      '/screens/login-02.html',
      '/screens/login-03.html',
      '/screens/login-04.html',
      '/screens/login-05.html',
      '/screens/playground.html',
      '/screens/signup-01.html',
      '/screens/signup-02.html',
      '/screens/signup-03.html',
      '/screens/signup-04.html',
      '/screens/signup-05.html',
      '/screens/tasks.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #00b15a',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-card.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #00b15a',
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-carousel.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-progress.html',
      '/kitchen-sink/forms-chips.html',
      '/pages/color-modes.html',
      '/pages/custom-property-prefix.html',
      '/pages/utility-api.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #e62845',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-card.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #e62845',
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-progress.html',
      '/pages/color-modes.html',
      '/pages/custom-property-prefix.html',
      '/pages/utility-api.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#8b8d8e on #ffffff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/forms-datepicker.html'
    ],
    issue: 208
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #ebe2ff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-scrollspy.html'
    ],
    issue: 253
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #f1f2f3',
    themes: ['light'],
    pages: [
      '/pages/marketing-product.html'
    ],
    issue: 253
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #f6f7f8',
    themes: ['light'],
    pages: [
      '/pages/checkout.html',
      '/screens/login-03.html',
      '/screens/login-04.html',
      '/screens/signup-03.html',
      '/screens/signup-04.html'
    ],
    issue: 253
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #ffffff',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-pagination.html',
      '/kitchen-sink/components-scrollspy.html',
      '/kitchen-sink/components-stepper.html',
      '/kitchen-sink/components-tooltip.html',
      '/pages/color-modes.html',
      '/pages/custom-property-prefix.html',
      '/pages/reboot-only.html',
      '/pages/utility-api.html',
      '/screens/authentication.html',
      '/screens/login-01.html',
      '/screens/login-02.html',
      '/screens/login-03.html',
      '/screens/login-04.html',
      '/screens/login-05.html',
      '/screens/signup-01.html',
      '/screens/signup-02.html',
      '/screens/signup-03.html',
      '/screens/signup-04.html',
      '/screens/signup-05.html'
    ],
    issue: 253
  },
  {
    rule: 'color-contrast',
    colors: '#dedede on #0070fa',
    pages: [
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html'
    ],
    issue: 254
  },
  {
    rule: 'color-contrast',
    colors: '#dedede on #dc0028',
    pages: [
      '/kitchen-sink/components-button-group.html'
    ],
    issue: 254
  },
  {
    rule: 'scrollable-region-focusable',
    target: /\.carousel-inner/,
    pages: [
      '/kitchen-sink/components-carousel.html'
    ],
    issue: 255
  },
  {
    rule: 'target-size',
    target: /\[data-bs-slide-to=/,
    pages: [
      '/kitchen-sink/components-carousel.html'
    ],
    issue: 255
  },
  {
    rule: 'label',
    pages: [
      '/kitchen-sink/forms-checkbox.html',
      '/kitchen-sink/forms-radio.html',
      '/kitchen-sink/forms-switch.html'
    ],
    issue: 256
  },
  {
    rule: 'link-name',
    pages: [
      '/kitchen-sink/components-breadcrumb.html'
    ],
    issue: 256
  },
  {
    rule: 'color-contrast',
    target: /aria-labelledby="disabled"/,
    colors: '#0873b0 on #081b32',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/forms-chips.html'
    ],
    reason: 'disabled chip input: WCAG 1.4.3 exempts inactive controls, and its chips have no disabled state for axe to see'
  },
  {
    rule: 'color-contrast',
    target: /\.sidebar|^\.active$/,
    colors: '#2470dc on #171a1d',
    themes: ['dark'],
    pages: [
      '/pages/dashboard.html'
    ],
    reason: 'pages/dashboard.css hard-codes the active link color of Bootstrap 5\'s dashboard example'
  },
  {
    rule: 'color-contrast',
    target: /\.sidebar|^\.active$/,
    colors: '#2470dc on #f1f2f3',
    themes: ['light'],
    pages: [
      '/pages/dashboard.html'
    ],
    reason: 'pages/dashboard.css hard-codes the active link color of Bootstrap 5\'s dashboard example'
  },
  {
    rule: 'color-contrast',
    target: /aria-labelledby="disabled"/,
    colors: '#5499d8 on #d7edfb',
    themes: ['light'],
    pages: [
      '/kitchen-sink/forms-chips.html'
    ],
    reason: 'disabled chip input: WCAG 1.4.3 exempts inactive controls, and its chips have no disabled state for axe to see'
  },
  {
    rule: 'color-contrast',
    target: /\.disabled > \.page-link/,
    colors: '#77828c on #171a1d',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-pagination.html'
    ],
    reason: 'disabled pagination link: WCAG 1.4.3 exempts inactive controls, and the docs markup has no aria-disabled for axe to see'
  },
  {
    rule: 'color-contrast',
    target: /^#case-/,
    colors: '#f1f2f3 on #0087fe',
    themes: ['dark'],
    pages: [
      '/pages/utility-api.html'
    ],
    reason: 'check page sample: it tests which background applies, the body text on a primary fill is incidental'
  }
]

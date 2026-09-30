// Accessibility violations that the scan expects. Each entry names the axe
// rule (`color-contrast`), optionally a `target` regular expression matched
// against the node's selector and, for color-contrast, the `colors` axe
// measured (`#ffffff on #0087fe`), the exact pages it happens on, `themes`
// to limit it to light or dark, and `configs` to limit it to some configs.
// `state: 'open'` puts an entry in the scan of open overlays
// (overlays.spec.js) instead of the page scan, and `rule: 'focus-appearance'`
// in the focus ring check (focus.spec.js).
// Without `configs`, an entry is expected with the default config and allowed
// with every other one; with it, it's expected with exactly those. An
// element that violates the same rule with the default config, under an
// entry, is that entry's with every config, whatever its colors. Then
// either `issue`, the tracking issue of an upstream bug in this repository,
// or `reason` when the markup or a config's choice is intended, never both.
// If an entry stops matching on one of its pages, the run fails, so the entry
// gets removed and the tracking issue checked (see "Upstream issue tracking"
// in CLAUDE.md).
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
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html'
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
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008c45 on #f6f7f8',
    themes: ['light'],
    pages: [
      '/kitchen-sink/components-navbar.html',
      '/pages/checkout.html',
      '/pages/focus.html'
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
      '/kitchen-sink/forms-validation.html',
      '/pages/focus.html'
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
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html'
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
      '/kitchen-sink/components-pagination.html',
      '/pages/focus.html'
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
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html'
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
      '/kitchen-sink/components-pagination.html',
      '/pages/focus.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #0087fe',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-card.html',
      '/pages/focus.html'
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
      '/pages/focus.html',
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
      '/kitchen-sink/components-card.html',
      '/pages/focus.html'
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
      '/pages/focus.html',
      '/pages/utility-api.html'
    ],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #e62845',
    themes: ['dark'],
    pages: [
      '/kitchen-sink/components-card.html',
      '/pages/focus.html'
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
      '/pages/focus.html',
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
      '/pages/focus.html',
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
      '/pages/focus.html',
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
      '/pages/focus.html',
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
  },
  // Violations of one config only, beyond what it inherits from the default
  // config's entries (A11Y_CONFIGS=all).
  {
    rule: 'color-contrast',
    colors: '#006ac9 on #c9eaff',
    themes: ['light'],
    configs: [
      'breakpoints-custom',
      'root-62-5'
    ],
    pages: ['/kitchen-sink/components-stepper.html'],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#008c45 on #cff1dd',
    themes: ['light'],
    configs: ['breakpoints-custom'],
    pages: ['/kitchen-sink/components-stepper.html'],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #0087fe',
    configs: ['no-gradients'],
    pages: ['/kitchen-sink/components-nav.html'],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #00b15a',
    themes: ['light'],
    configs: ['shadcn'],
    pages: ['/kitchen-sink/components-card.html'],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #ffffff',
    themes: ['light'],
    configs: ['brand'],
    pages: [
      '/kitchen-sink/components-menu.html',
      '/pages/marketing-pricing.html',
      '/pages/marketing-product.html'
    ],
    issue: 253
  },
  {
    rule: 'scrollable-region-focusable',
    target: /\.stepper-overflow/,
    configs: [
      'breakpoints-custom',
      'large-type',
      'spacious'
    ],
    pages: ['/kitchen-sink/components-stepper.html'],
    issue: 262
  },
  {
    rule: 'target-size',
    configs: ['compact'],
    pages: [
      '/kitchen-sink/components-pagination.html',
      '/pages/marketing-product.html'
    ],
    reason: 'compact config: its denser controls, pagination and link lists go under WCAG 2.2\'s 24px target size on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#657383 on #06080a',
    themes: ['dark'],
    configs: ['gray-cool'],
    pages: [
      '/kitchen-sink/components-breadcrumb.html',
      '/kitchen-sink/components-card.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-placeholder.html',
      '/kitchen-sink/components-stepper.html',
      '/kitchen-sink/components-tooltip.html',
      '/kitchen-sink/forms-datepicker.html',
      '/kitchen-sink/forms-password-strength.html',
      '/pages/custom-property-prefix.html',
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/playground.html',
      '/screens/tasks.html'
    ],
    reason: 'gray-cool config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#657383 on #0b0f12',
    themes: ['dark'],
    configs: ['gray-cool'],
    pages: [
      '/screens/cards.html',
      '/screens/dashboard.html'
    ],
    reason: 'gray-cool config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#828e9b on #252b32',
    themes: ['dark'],
    configs: ['gray-cool'],
    pages: [
      '/kitchen-sink/components-accordion.html',
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/components-stepper.html',
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html',
      '/screens/cards.html',
      '/screens/playground.html',
      '/screens/tasks.html'
    ],
    reason: 'gray-cool config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#7f6e60 on #0a0705',
    themes: ['dark'],
    configs: ['gray-warm'],
    pages: [
      '/kitchen-sink/components-breadcrumb.html',
      '/kitchen-sink/components-card.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/components-placeholder.html',
      '/kitchen-sink/components-stepper.html',
      '/kitchen-sink/components-tooltip.html',
      '/kitchen-sink/forms-datepicker.html',
      '/kitchen-sink/forms-password-strength.html',
      '/pages/custom-property-prefix.html',
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/playground.html',
      '/screens/tasks.html'
    ],
    reason: 'gray-warm config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#7f6e60 on #110d0a',
    themes: ['dark'],
    configs: ['gray-warm'],
    pages: [
      '/screens/cards.html',
      '/screens/dashboard.html'
    ],
    reason: 'gray-warm config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#98897e on #302923',
    themes: ['dark'],
    configs: ['gray-warm'],
    pages: [
      '/kitchen-sink/components-accordion.html',
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/components-stepper.html',
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html',
      '/screens/cards.html',
      '/screens/playground.html',
      '/screens/tasks.html'
    ],
    reason: 'gray-warm config: its `$gray` moves the muted text (`fg-3`) and subtle secondary steps, which drop under 4.5:1 in dark on purpose'
  },
  {
    rule: 'color-contrast',
    colors: '#007f8d on #c3eef0',
    themes: ['light'],
    configs: ['hue-shift'],
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html',
      '/pages/focus.html'
    ],
    reason: 'hue-shift config: every hue rotated 180° with the theme maps\' fixed `contrast` keys, whose WCAG ratios move with the hue (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#ea7300 on #2d3136',
    themes: ['dark'],
    configs: ['hue-shift'],
    pages: [
      '/pages/focus.html',
      '/pages/marketing-product.html'
    ],
    reason: 'hue-shift config: every hue rotated 180° with the theme maps\' fixed `contrast` keys, whose WCAG ratios move with the hue (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #887700',
    themes: ['dark'],
    configs: ['hue-shift'],
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-card.html',
      '/pages/focus.html'
    ],
    reason: 'hue-shift config: every hue rotated 180° with the theme maps\' fixed `contrast` keys, whose WCAG ratios move with the hue (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#ffffff on #887700',
    themes: ['light'],
    configs: ['hue-shift'],
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/pages/focus.html'
    ],
    reason: 'hue-shift config: every hue rotated 180° with the theme maps\' fixed `contrast` keys, whose WCAG ratios move with the hue (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#19191d on #6159e1',
    themes: ['dark'],
    configs: ['mono'],
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-card.html',
      '/kitchen-sink/components-progress.html',
      '/pages/focus.html'
    ],
    reason: 'mono config: one base color for every hue, with the fixed `contrast` keys under 4.5:1 on it (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#19191d on #6159e1',
    themes: ['light'],
    configs: ['mono'],
    pages: [
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button-group.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-progress.html',
      '/pages/focus.html'
    ],
    reason: 'mono config: one base color for every hue, with the fixed `contrast` keys under 4.5:1 on it (see its README)'
  },
  {
    rule: 'color-contrast',
    colors: '#7b7dea on #303036',
    themes: ['dark'],
    configs: ['mono'],
    pages: [
      '/pages/focus.html',
      '/pages/marketing-product.html'
    ],
    reason: 'mono config: one base color for every hue, with the fixed `contrast` keys under 4.5:1 on it (see its README)'
  },
  {
    rule: 'target-size',
    configs: ['root-62-5'],
    pages: [
      '/pages/dashboard.html',
      '/pages/focus.html',
      '/screens/cards.html'
    ],
    reason: 'root-62-5 config: checks, radios, switches and pages/dashboard.css size themselves in `rem`, so a 62.5% root shrinks them under the 24px target size (see its README)'
  },
  {
    rule: 'color-contrast',
    target: /#overlay-datepicker/,
    themes: ['light'],
    configs: ['shadcn'],
    pages: ['/pages/color-modes.html'],
    reason: 'shadcn config: shadcn/ui\'s translucent dark input background (`dark:bg-input/30`) shows the light page through when only the input is dark'
  },
  {
    rule: 'color-contrast',
    colors: '#737373 on #ededed',
    themes: ['light'],
    configs: ['shadcn'],
    pages: [
      '/kitchen-sink/components-pagination.html',
      '/screens/cards.html'
    ],
    reason: 'shadcn config: shadcn/ui\'s own neutral and destructive colors, under 4.5:1 in these pairings'
  },
  {
    rule: 'color-contrast',
    colors: '#737373 on #f5f5f5',
    themes: ['light'],
    configs: ['shadcn'],
    pages: [
      '/kitchen-sink/forms-field.html',
      '/screens/dashboard.html'
    ],
    reason: 'shadcn config: shadcn/ui\'s own neutral and destructive colors, under 4.5:1 in these pairings'
  },
  {
    rule: 'color-contrast',
    colors: '#e7000b on #fde6e7',
    themes: ['light'],
    configs: ['shadcn'],
    pages: [
      '/kitchen-sink/components-alert.html',
      '/kitchen-sink/components-avatar.html',
      '/kitchen-sink/components-badge.html',
      '/kitchen-sink/components-button.html',
      '/kitchen-sink/components-list-group.html',
      '/kitchen-sink/forms-chips.html'
    ],
    reason: 'shadcn config: shadcn/ui\'s own neutral and destructive colors, under 4.5:1 in these pairings'
  },
  {
    rule: 'target-size',
    configs: ['shadcn'],
    pages: ['/screens/cards.html'],
    reason: 'shadcn config: shadcn/ui\'s 16px checks and radios, closer together than WCAG 2.2\'s 24px target size allows'
  },

  // Open overlays (overlays.spec.js)
  {
    rule: 'color-contrast',
    colors: '#ffffff on #0087fe',
    state: 'open',
    pages: [
      '/kitchen-sink/components-dialog.html',
      '/kitchen-sink/components-menu.html',
      '/kitchen-sink/forms-datepicker.html',
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/playground.html'
    ],
    issue: 183
  },
  {
    rule: 'aria-allowed-attr',
    target: /\[data-bs-value=|^\.selected$/,
    state: 'open',
    pages: [
      '/kitchen-sink/forms-combobox.html',
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/playground.html'
    ],
    issue: 261
  },
  {
    rule: 'color-contrast',
    colors: '#8b8d8e on #ffffff',
    themes: ['light'],
    state: 'open',
    pages: ['/kitchen-sink/forms-datepicker.html'],
    issue: 265
  },
  {
    rule: 'color-contrast',
    colors: '#def0ff on #339ffe',
    themes: ['light'],
    state: 'open',
    pages: ['/kitchen-sink/forms-datepicker.html'],
    issue: 265
  },
  {
    rule: 'color-contrast',
    colors: '#cddeed on #026ece',
    themes: ['dark'],
    state: 'open',
    pages: ['/kitchen-sink/forms-datepicker.html'],
    issue: 265
  },
  {
    rule: 'color-contrast',
    colors: '#009bf3 on #e5e6e7',
    themes: ['dark'],
    state: 'open',
    pages: ['/kitchen-sink/components-tooltip.html'],
    issue: 266
  },
  {
    rule: 'scrollable-region-focusable',
    target: /#scrollableBodyDialog/,
    state: 'open',
    pages: ['/kitchen-sink/components-dialog.html'],
    issue: 267
  },
  // pages/focus.html puts every theme's text colors on bg-1 to bg-3 too.
  {
    rule: 'color-contrast',
    target: /^\.bg-[123] .*data-focus="btn-(outline|text|link|check)-(primary|accent|success|danger|warning|info)"/,
    pages: ['/pages/focus.html'],
    issue: 183
  },
  {
    rule: 'color-contrast',
    colors: '#0087fe on #e2e5e7',
    themes: ['light'],
    pages: ['/pages/focus.html'],
    issue: 253
  },
  {
    rule: 'color-contrast',
    target: /^\.bg-(primary|accent|success|danger|warning|info|inverse|secondary) .*data-focus="(link|nav-tabs-link)"/,
    pages: ['/pages/focus.html'],
    reason: 'pages/focus.html puts links and nav links on solid fills for their focus rings, a pairing their text colors aren\'t meant for'
  },
  // The focus ring check (focus.spec.js): `target` matches `<surface>
  // <component>`, as pages/focus.html names them.
  {
    rule: 'focus-appearance',
    target: / chip-input-chip(-\w+)?$/,
    pages: ['/pages/focus.html'],
    issue: 7
  },
  {
    rule: 'focus-appearance',
    target: / btn-close$/,
    pages: ['/pages/focus.html'],
    issue: 271
  },
  {
    rule: 'focus-appearance',
    target: / ((menu-item|list-group-action)(-\w+)?|link)$/,
    pages: ['/pages/focus.html'],
    issue: 272
  },
  {
    rule: 'focus-appearance',
    target: / range$/,
    pages: ['/pages/focus.html'],
    reason: 'the ring surrounds the thumb, a sub-component that the check can\'t measure apart from the track'
  },
  // Every component that draws Bootstrap's ring. Its contrast depends on the
  // surface, the mode and the config's palette, radii and sizes, so one entry
  // covers them all: the visual captures (tests/visual/focus.spec.js) show
  // any change to a ring.
  {
    rule: 'focus-appearance',
    target: / (?!(chip-input-chip|menu-item|list-group-action)(-|$)|(btn-close|link|range)$)/,
    pages: ['/pages/focus.html'],
    issue: 270
  }
]

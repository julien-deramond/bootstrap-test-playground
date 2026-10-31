/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-twbs-bootstrap'
  ],
  plugins: [
    'stylelint-order'
  ],
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  rules: {
    'selector-not-notation': 'complex',
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*(-[a-z0-9]+)*:)?([a-z][a-z0-9]*)(-[a-z0-9]+)*$',
      { message: 'Expected class selector "%s" to be kebab-case (with optional breakpoint prefix)' }
    ],
    'order/order': [
      [
        { type: 'at-rule', name: 'use' },
        { type: 'at-rule', name: 'forward' },
        'dollar-variables',
        'custom-properties',
        'declarations',
        'rules'
      ]
    ]
  },
  overrides: [
    {
      files: '**/*.scss',
      rules: {
        'function-disallowed-list': [
          'lighten',
          'darken'
        ]
      }
    }
  ]
}

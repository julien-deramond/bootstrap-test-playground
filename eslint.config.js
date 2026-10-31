import eslintConfigXo from 'eslint-config-xo'
import unicorn from 'eslint-plugin-unicorn'
import importXPlugin from 'eslint-plugin-import-x'
import globals from 'globals'

const importRules = {
  'import/extensions': [
    'error',
    'ignorePackages',
    {
      js: 'always'
    }
  ],
  'import/first': 'error',
  'import/newline-after-import': 'error',
  // Vite resolves root-relative imports such as '/src/js/reproduction.js'
  'import/no-absolute-path': 'off',
  'import-x/no-absolute-path': 'off',
  'import/no-amd': 'error',
  'import/no-cycle': [
    'error',
    {
      ignoreExternal: true
    }
  ],
  'import/no-duplicates': 'error',
  'import/no-extraneous-dependencies': 'error',
  'import/no-mutable-exports': 'error',
  'import/no-named-as-default': 'error',
  'import/no-named-as-default-member': 'error',
  'import/no-named-default': 'error',
  'import/no-self-import': 'error',
  'import/no-unassigned-import': [
    'error'
  ],
  'import/no-useless-path-segments': 'error',
  'import/order': 'error'
}

const localRules = {
  'arrow-body-style': 'off',
  'capitalized-comments': 'off',
  '@stylistic/comma-dangle': [
    'error',
    'never'
  ],
  ...importRules,
  '@stylistic/indent': [
    'error',
    2,
    {
      MemberExpression: 'off',
      SwitchCase: 1
    }
  ],
  'logical-assignment-operators': 'off',
  'max-params': 'off',
  '@stylistic/multiline-ternary': 'off',
  'new-cap': [
    'error',
    {
      properties: false
    }
  ],
  'no-console': 'error',
  'no-negated-condition': 'off',
  '@stylistic/object-curly-spacing': [
    'error',
    'always'
  ],
  '@stylistic/operator-linebreak': [
    'error',
    'after'
  ],
  'prefer-object-has-own': 'off',
  'prefer-template': 'error',
  '@stylistic/semi': [
    'error',
    'never'
  ],
  strict: 'error',
  'unicorn/explicit-length-check': 'off',
  'unicorn/filename-case': 'off',
  'unicorn/no-anonymous-default-export': 'off',
  'unicorn/no-array-callback-reference': 'off',
  'unicorn/no-array-method-this-argument': 'off',
  'unicorn/no-null': 'off',
  'unicorn/no-typeof-undefined': 'off',
  'unicorn/no-unused-properties': 'error',
  'unicorn/numeric-separators-style': 'off',
  'unicorn/prefer-array-flat': 'off',
  'unicorn/prefer-at': 'error',
  'unicorn/prefer-dom-node-dataset': 'off',
  'unicorn/prefer-global-this': 'off',
  'unicorn/prefer-module': 'off',
  'unicorn/prefer-query-selector': 'off',
  'unicorn/prefer-string-raw': 'off',
  'unicorn/prefer-string-replace-all': 'off',
  'unicorn/prefer-structured-clone': 'off',
  'unicorn/prevent-abbreviations': 'off',
  // Rules new/changed in ESLint 10 / updated plugins — disable to preserve old behavior
  'xo/import-specifier-newline': 'off',
  '@eslint-community/eslint-comments/require-description': 'off',
  'import-x/no-anonymous-default-export': 'off',
  'import-x/no-extraneous-dependencies': 'off',
  'import-x/no-unassigned-import': 'off',
  'n/file-extension-in-import': 'off',
  'n/no-deprecated-api': 'off',
  'n/no-extraneous-import': 'off',
  'n/prefer-global/buffer': 'off',
  'n/prefer-global/process': 'off',
  'n/prefer-promises/fs': 'off',
  'no-shadow': 'off',
  'require-unicode-regexp': 'off',
  '@stylistic/indent-binary-ops': 'off',
  '@stylistic/curly-newline': 'off',
  '@stylistic/function-paren-newline': 'off',
  'unicorn/better-dom-traversing': 'off',
  'unicorn/class-reference-in-static-methods': 'off',
  'unicorn/consistent-boolean-name': 'off',
  'unicorn/consistent-class-member-order': 'off',
  'unicorn/consistent-compound-words': 'off',
  'unicorn/consistent-conditional-object-spread': 'off',
  'unicorn/default-export-style': 'off',
  'unicorn/dom-node-dataset': 'off',
  'unicorn/explicit-timer-delay': 'off',
  'unicorn/logical-assignment-operators': 'off',
  'unicorn/max-nested-calls': 'off',
  'unicorn/name-replacements': 'off',
  'unicorn/no-break-in-nested-loop': 'off',
  'unicorn/no-computed-property-existence-check': 'off',
  'unicorn/no-declarations-before-early-exit': 'off',
  'unicorn/no-duplicate-if-branches': 'off',
  'unicorn/no-for-each': 'off',
  'unicorn/no-global-object-property-assignment': 'off',
  'unicorn/no-incorrect-query-selector': 'off',
  'unicorn/no-return-array-push': 'off',
  'unicorn/no-this-outside-of-class': 'off',
  'unicorn/no-unnecessary-splice': 'off',
  'unicorn/no-unused-array-method-return': 'off',
  'unicorn/no-unreadable-for-of-expression': 'off',
  'unicorn/no-subtraction-comparison': 'off',
  'unicorn/prefer-add-event-listener-options': 'off',
  'unicorn/prefer-array-from-map': 'off',
  'unicorn/prefer-await': 'off',
  'unicorn/prefer-classlist-toggle': 'off',
  'unicorn/prefer-continue': 'off',
  'unicorn/prefer-early-return': 'off',
  'unicorn/prefer-global-number-constants': 'off',
  'unicorn/prefer-includes-over-repeated-comparisons': 'off',
  'unicorn/prefer-iterator-to-array': 'off',
  'unicorn/prefer-minimal-ternary': 'off',
  'unicorn/prefer-number-coercion': 'off',
  'unicorn/prefer-object-define-properties': 'off',
  'unicorn/prefer-object-iterable-methods': 'off',
  'unicorn/prefer-private-class-fields': 'off',
  'unicorn/prefer-scoped-selector': 'off',
  'unicorn/prefer-split-limit': 'off',
  'unicorn/prefer-string-repeat': 'off',
  'unicorn/prefer-ternary': 'off',
  'unicorn/prefer-unicode-code-point-escapes': 'off',
  'unicorn/no-array-sort': 'off',
  'unicorn/no-top-level-assignment-in-function': 'off',
  'unicorn/no-top-level-side-effects': 'off',
  'unicorn/no-useless-coercion': 'off',
  'unicorn/no-useless-template-literals': 'off',
  'unicorn/no-unsafe-string-replacement': 'off',
  'unicorn/require-array-sort-compare': 'off',
  'unicorn/require-css-escape': 'off',
  // Playground scripts are one-off tools and test steps, not library code
  complexity: 'off',
  'max-depth': 'off',
  'max-nested-callbacks': 'off',
  'no-await-in-loop': 'off',
  '@stylistic/max-len': 'off',
  '@stylistic/max-statements-per-line': 'off',
  '@stylistic/no-mixed-operators': 'off',
  'unicorn/consistent-function-scoping': 'off',
  'no-multi-assign': 'off',
  'no-promise-executor-return': 'off',
  'no-return-assign': 'off',
  'no-unmodified-loop-condition': 'off',
  'operator-assignment': 'off',
  'unicorn/no-array-from-fill': 'off',
  'unicorn/no-incorrect-template-string-interpolation': 'off',
  'unicorn/no-new-array': 'off',
  'unicorn/no-nonstandard-builtin-properties': 'off',
  'unicorn/no-useless-spread': 'off',
  'unicorn/operator-assignment': 'off',
  'unicorn/prefer-add-event-listener': 'off',
  'unicorn/prefer-math-trunc': 'off',
  'unicorn/no-array-reduce': 'off',
  'unicorn/prefer-spread': 'off',
  'unicorn/no-array-reverse': 'off',
  'unicorn/no-duplicate-loops': 'off',
  'unicorn/no-negated-comparison': 'off',
  'unicorn/no-nested-ternary': 'off',
  'unicorn/no-unreadable-array-destructuring': 'off',
  'unicorn/prefer-array-flat-map': 'off',
  'unicorn/prefer-code-point': 'off',
  'unicorn/prefer-dom-node-append': 'off',
  'unicorn/prefer-dom-node-text-content': 'off',
  'unicorn/prefer-single-call': 'off'
}

// Base config: xo/browser + unicorn + import-x, as in twbs/bootstrap
const xoBrowserConfigs = eslintConfigXo({ browser: true, space: false })
const xoBrowserConfig = xoBrowserConfigs.find(config => config.name === 'xo/base') ?? xoBrowserConfigs[0]
const unicornConfig = unicorn.configs['flat/recommended']

export default [
  {
    ignores: [
      '**/*.min.js',
      '**/dist/**',
      '**/vendor/**',
      'reports/**',
      'sizes/**',
      'updates/**',
      // Generated by `npm run sync-kitchen-sink`
      'kitchen-sink/**',
      '.cache/**',
      'tests/results/**',
      'tests/report/**'
    ]
  },

  // Everything: ES modules in the browser
  {
    ...xoBrowserConfig,
    files: ['**/*.{js,mjs}'],
    plugins: {
      ...xoBrowserConfig.plugins,
      unicorn,
      import: importXPlugin
    },
    languageOptions: {
      ...xoBrowserConfig.languageOptions,
      sourceType: 'module'
    },
    rules: {
      ...xoBrowserConfig.rules,
      ...unicornConfig.rules,
      ...localRules
    }
  },

  // Node tooling: scripts, configs and Playwright suites
  {
    files: [
      'scripts/**',
      'tests/**',
      'issues/**/repro.spec.js',
      '*.config.js',
      'configs/**/*.js'
    ],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-await-in-loop': 'off',
      'no-bitwise': 'off',
      'no-console': 'off',
      'no-promise-executor-return': 'off',
      // postcss and other packages come with the tools in devDependencies
      'import/no-extraneous-dependencies': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prefer-uint8array-base64': 'off'
    }
  },

  // Unit tests of the scripts quote template syntax in plain strings
  {
    files: ['scripts/__tests__/**'],
    rules: {
      'no-template-curly-in-string': 'off'
    }
  },

  // Playground pages and reproductions run in the browser
  {
    files: ['public/**', 'src/js/**', 'issues/**/assert.js', 'pages/**/*.js', 'tests/**'],
    rules: {
      'no-bitwise': 'off',
      'no-console': 'off',
      'no-new': 'off',
      'no-restricted-globals': 'off'
    }
  }
]

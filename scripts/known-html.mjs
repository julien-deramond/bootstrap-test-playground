// Errors of scripts/lint-html.mjs that are known: tracked as an upstream bug
// (`issue`, a tracking issue in this repository) or intended (`reason`). Each
// entry matches one rule, a file (a path, or a RegExp) and optionally a
// message pattern.
//
// When an upstream fix lands, remove its entries: the lint fails on an entry
// that no longer matches anything (see "Upstream issue tracking" in CLAUDE.md).
export default [
  { rule: 'element-name', file: 'kitchen-sink/components-alert.html', message: /<vstack>/, issue: 153 },
  { rule: 'element-permitted-content', file: 'kitchen-sink/components-menu.html', message: /<div> element is not permitted as content under <button>/, issue: 153 },
  { rule: 'element-permitted-content', file: /^kitchen-sink\/forms-(form-adorn|validation)\.html$/, message: /<div> element is not permitted as content under <label>/, issue: 153 },
  {
    rule: 'valid-autocomplete',
    file: /^(kitchen-sink|screens)\//,
    message: /cannot be used on <input type="(checkbox|radio)">/,
    reason: 'Bootstrap’s toggle buttons set autocomplete="off" on checkboxes and radios, so Firefox doesn’t restore their state on reload'
  }
]

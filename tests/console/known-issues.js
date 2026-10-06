// Console output that the crawl expects, because an upstream Bootstrap bug
// causes it. Each entry names its tracking issue in this repository and the
// exact pages it happens on. On those pages, a matching problem doesn't fail
// the run. If it stops happening on one of them, the run fails, so the entry
// gets removed and the tracking issue checked (see "Upstream issue tracking"
// in CLAUDE.md). The crawl runs in each engine (`console`, `console-firefox`,
// `console-webkit`); `engines` limits an entry to some of them (chromium,
// firefox, webkit).
export default [
  {
    issue: 2,
    message: /more than one instance per element\. Bound instance: bs\.combobox/,
    pages: [
      '/screens/cards.html',
      '/screens/dashboard.html',
      '/screens/playground.html',
      '/kitchen-sink/forms-combobox.html',
      '/kitchen-sink/forms-field.html',
      '/issues/pg-2/',
      '/issues/pg-6/',
      '/pages/js-api.html'
    ]
  }
]

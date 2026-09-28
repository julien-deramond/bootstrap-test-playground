// What the console crawl and the smoke tests have to run for a set of changed
// files. A pull request that changes a config needs every page with that
// config, and one that changes a page needs that page with every config.
// Anything shared, or not recognized, needs everything. Used by
// scripts/test-scope.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { configsDir, root } from './configs.mjs'
import { findHtmlFiles, PAGE_GROUPS } from './pages.mjs'

// Files a suite (`console` or `smoke`) can't see: docs, the other suites and
// workflows, and the scripts and allowlists that the build doesn't import
// (scripts/lib/ is). A suite's own tests/<suite>/ and workflow are shared.
const noEffect = suite => [
  /\.md$/,
  /^LICENSE$/,
  new RegExp(`^\\.(claude|github)/(?!workflows/${suite}\\.yml$)`),
  /^\.(editorconfig|env\.example|gitignore)$/,
  /^reports\//,
  /^scripts\/[^/]+\.mjs$/,
  /^scripts\/templates\//,
  new RegExp(`^tests/(?!${suite}/)`),
  // The working copy: every page opens with it anyway.
  /^src\/styles\//
]

// Pages outside PAGE_GROUPS, and the data they read.
const ROOT_PAGES = {
  'index.html': '/',
  'compare.html': '/compare.html',
  'sizes.html': '/sizes.html',
  'sizes/history.json': '/sizes.html'
}

const urlOf = file => '/' + path.relative(root, file).split(path.sep).join('/').replace(/index\.html$/, '')

// Pages of a folder that use `file`, like `pages/dashboard.css`: those whose
// HTML names it, or else every page next to it.
function pagesUsing(file) {
  const dir = path.dirname(path.join(root, file))
  const pages = findHtmlFiles(dir)
  const users = pages.filter(page => fs.readFileSync(page, 'utf8').includes(path.basename(file)))
  return (users.length ? users : pages).map(urlOf)
}

// `files`: paths relative to the repository root, as `git diff --name-only`
// prints them. Resolves to `{ full: true, reason }` or `{ full: false,
// configs, urls }`: the configs to open on every page, and the pages to open
// with every config.
export function testScope(files, suite) {
  const configs = new Set()
  const urls = new Set()
  const ignored = noEffect(suite)

  for (const file of files) {
    if (ignored.some(pattern => pattern.test(file))) {
      continue
    }

    if (file in ROOT_PAGES) {
      urls.add(ROOT_PAGES[file])
      continue
    }

    const [top, name] = file.split('/')

    // A removed config or page has nothing left to open.
    if (top === 'configs') {
      if (fs.existsSync(path.join(configsDir, name, 'main.scss'))) {
        configs.add(name)
      }

      continue
    }

    if (PAGE_GROUPS.some(({ dir }) => dir === top)) {
      if (!fs.existsSync(path.join(root, file))) {
        continue
      }

      // A reproduction's own styles only reach its own page.
      const pages = file.endsWith('.html') ?
        [urlOf(path.join(root, file))] :
        top === 'issues' && file.split('/').length > 2 ? findHtmlFiles(path.join(root, top, name)).map(urlOf) : pagesUsing(file)
      for (const url of pages) {
        urls.add(url)
      }

      continue
    }

    return { full: true, reason: file }
  }

  return { full: false, configs: [...configs].sort(), urls: [...urls].sort() }
}

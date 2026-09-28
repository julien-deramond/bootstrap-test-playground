// The last Bootstrap update, from updates/last-update.json (written by
// `npm run update-bootstrap` and the nightly canary, see
// scripts/lib/last-update.mjs): the home page lists it, and kitchen sink pages
// mark the sections it changed.
import record from '../../updates/last-update.json'

export { record }

// Record URLs are root-relative; builds can be served from a subfolder.
export const pageUrl = url => `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`

const withoutHtml = pathname => pathname.replace(/\.html$/, '')

// What changed about one example, most notable first.
export function changeLabels(example) {
  const labels = []
  if (example.markup === 'added') {
    labels.push({ text: 'New example', title: 'Added to the docs in this update' })
  } else if (example.markup === 'changed') {
    labels.push({ text: 'Markup changed', title: 'Its markup changed in the docs in this update' })
  }

  if (example.pixels) {
    labels.push({ text: 'Renders differently', title: `${example.pixels} pixels differ between the two commits, with the same markup` })
  }

  return labels
}

// The page's examples that changed, in section order.
export const changedExamples = pathname =>
  record.examples.filter(example => withoutHtml(pageUrl(example.url)) === withoutHtml(pathname))

// Adds the labels of each changed example to its section heading, which is
// playground chrome, so `?chrome=0` hides them with it. They link to the home
// page's panel.
export function markChangedSections() {
  for (const example of changedExamples(location.pathname)) {
    const heading = document.getElementById(example.id)
    if (!heading || heading.tagName !== 'H2') {
      continue
    }

    for (const { text, title } of changeLabels(example)) {
      const badge = document.createElement('a')
      badge.className = 'badge badge-subtle theme-warning ms-2 align-middle text-decoration-none'
      badge.href = `${import.meta.env.BASE_URL}#last-update`
      badge.title = `${title}. See the last update on the home page.`
      badge.textContent = text
      heading.append(badge)
    }
  }
}

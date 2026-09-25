// Lists every page found by vite.config.js (see `virtual:playground-pages`).
import groups from 'virtual:playground-pages'

const escapeHtml = value => value.replace(/[&<>"]/g, char => `&#${char.charCodeAt(0)};`)

document.getElementById('bootstrap-source').textContent = __BOOTSTRAP_SOURCE__

document.getElementById('page-groups').innerHTML = groups.map(({ label, dir, pages }) => `
  <section aria-labelledby="group-${dir}">
    <h2 class="h4" id="group-${dir}">${label} <span class="badge badge-subtle theme-secondary">${pages.length}</span></h2>
    ${pages.length === 0 ?
      `<p class="fg-3">Nothing here yet.${dir === 'issues' ? ' Run <code>npm run new-issue 12345</code> to create one.' : ''}</p>` :
      `<ul class="list-group">
        ${pages.map(({ url, title, source }) => `<li class="list-group-item"><a href="${url}">${escapeHtml(title)}</a> <code class="fg-3 ms-2">${url}</code>${source ? ` <span class="fg-3 fs-sm ms-2">from <a class="fg-3" href="${escapeHtml(source.url)}">${escapeHtml(source.label)}</a></span>` : ''}</li>`).join('')}
      </ul>`}
  </section>`).join('')

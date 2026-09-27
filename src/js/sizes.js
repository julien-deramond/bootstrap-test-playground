// The sizes page: the latest entry of sizes/history.json, its change from the
// previous one, and a sparkline of each file's brotli size over the history.
// Brotli, because gzip sizes vary slightly with the platform that measured
// them (see scripts/check-size.mjs).
// scripts/check-size.mjs writes the history.
import history from '../../sizes/history.json'

const latest = history.at(-1)
const previous = history.at(-2)
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`
const short = sha => sha.slice(0, 7)

function change(now, before) {
  if (before === undefined) {
    return ''
  }

  const diff = now - before
  if (diff === 0) {
    return '±0'
  }

  const ratio = (diff / before) * 100
  const sign = diff > 0 ? '+' : '−'
  return `<span class="${diff > 0 ? 'size-up' : 'size-down'}">${sign}${kb(Math.abs(diff))} (${sign}${Math.abs(ratio).toFixed(1)}%)</span>`
}

// Brotli size over the history, scaled to the file's own range.
function sparkline(file) {
  const values = history.map(entry => entry.sizes[file]?.brotli).filter(value => value !== undefined)
  if (values.length < 2) {
    return '<span class="fg-3">one entry</span>'
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = index => (index / (values.length - 1)) * 160
  const y = value => (max === min ? 16 : 30 - ((value - min) / (max - min)) * 28)
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  return `<svg class="size-chart" viewBox="0 0 160 32" role="img" aria-label="${values.map(kb).join(', ')}">
    <polyline points="${points}"/><circle cx="${x(values.length - 1)}" cy="${y(values.at(-1))}" r="2.5"/></svg>`
}

const commitLink = sha => `<a href="https://github.com/twbs/bootstrap/commit/${sha}"><code>${short(sha)}</code></a>`
document.getElementById('sizes-summary').innerHTML = latest ?
  `${history.length} ${history.length === 1 ? 'entry' : 'entries'}. Latest: ${commitLink(latest.commit)}, recorded ${latest.date.slice(0, 10)}${previous ? `, compared with ${commitLink(previous.commit)}` : ''}.` :
  'No sizes recorded yet.'

document.getElementById('sizes-rows').innerHTML = latest ? Object.entries(latest.sizes).map(([file, size]) => `
  <tr>
    <th scope="row"><code>${file}</code></th>
    <td class="num">${kb(size.min)}</td>
    <td class="num">${kb(size.gzip)}</td>
    <td class="num">${kb(size.brotli)}</td>
    <td class="num">${change(size.brotli, previous?.sizes[file]?.brotli)}</td>
    <td>${sparkline(file)}</td>
  </tr>`).join('') : ''

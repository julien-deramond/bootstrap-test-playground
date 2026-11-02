// pages/states.html: an indeterminate checkbox looks like a checked one in
// the same state. A pixel baseline records whatever renders, so a state that
// was wrong from the start passes it; these compare the computed styles of
// the cells instead (#436).
//
// - The check table: in every row, each indeterminate column has the
//   background color, border color and opacity of its checked twin.
// - The form field cards: an indeterminate checkbox highlights its card like
//   a checked one.
//
// Checked + indeterminate covers an engine difference: WebKit matches
// `:checked` on that checkbox, Chromium doesn't. Chromium also keeps the
// styles a `:has(:checked)` ancestor got before src/js/examples.js set
// `indeterminate`, so each table is inserted again before it's measured. Not
// a component scenario, so it runs once per engine with the working copy. A
// failing pair that an open upstream bug explains is a `states …` scenario in
// known-issues.js.
import { expect, test } from '@playwright/test'
import { known, knownFor, load } from './shared.js'

// Each indeterminate column of the check table, and the checked column it
// must look like.
const CHECK_PAIRS = {
  indeterminate: 'checked',
  'checked indeterminate': 'checked',
  ':disabled indeterminate': ':disabled checked',
  '.is-invalid indeterminate': '.is-invalid checked',
  '.is-valid indeterminate': '.is-valid checked'
}
const CARD_PAIRS = { indeterminate: 'checked', 'checked indeterminate': 'checked' }

// Every row of a [data-states] table, as { row, cells: { column: styles } },
// with each cell's checkbox state and the colors and opacity of the checkbox
// or, with `closest`, of its ancestor. Moving the table keeps `indeterminate`.
const readTable = (page, table, closest) => page.locator(`[data-states="${table}"] table`).evaluate((element, closest) => {
  element.parentNode.append(element)
  const columns = [...element.tHead.rows[0].cells].slice(1).map(cell => cell.textContent)
  return [...element.tBodies[0].rows].map(tr => ({
    row: tr.cells[0].textContent,
    cells: Object.fromEntries(columns.map((column, index) => {
      const input = tr.cells[index + 1].querySelector('input')
      const { backgroundColor, borderTopColor, opacity } = getComputedStyle(closest ? input.closest(closest) : input)
      return [column, {
        indeterminate: input.indeterminate, backgroundColor, borderColor: borderTopColor, opacity
      }]
    }))
  }))
}, closest)

// The rows where `column` doesn't look like `twin`, with both styles.
function mismatches(rows, column, twin) {
  const styles = ({ indeterminate: _, ...rest }) => rest
  for (const { row, cells } of rows) {
    expect(cells[column].indeterminate, `${row} ${column} is indeterminate`).toBe(true)
  }

  return rows
    .filter(({ cells }) => JSON.stringify(styles(cells[column])) !== JSON.stringify(styles(cells[twin])))
    .map(({ row, cells }) => ({ row, [column]: styles(cells[column]), [twin]: styles(cells[twin]) }))
}

test.describe('states', () => {
  test.beforeEach(async ({ page }) => {
    await load(page, '/pages/states.html', 'config=working')
    await page.waitForFunction(() => document.querySelector('[id*="Indeterminate"]')?.indeterminate)
  })

  const tables = [
    ['check', CHECK_PAIRS, null],
    ['form-field-card', CARD_PAIRS, '.form-field-card']
  ]

  for (const [table, pairs, closest] of tables) {
    for (const [column, twin] of Object.entries(pairs)) {
      const name = `${table} ${column}`
      test(`${name} looks like ${twin}`, async ({ page, browserName }) => {
        const [issue] = knownFor(known.filter(entry => entry.scenario === `states ${name}`), 'working', browserName)
        test.fail(Boolean(issue), issue && `known upstream bug #${issue.issue}`)
        const rows = await readTable(page, table, closest)
        expect(rows.length).toBeGreaterThan(0)
        expect(mismatches(rows, column, twin)).toEqual([])
      })
    }
  }
})

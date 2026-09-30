// Checks the contrast of every documented color pairing and of the components
// that embed one, with pages/contrast.html, which measures them in every
// color mode of the config: text under WCAG AA's 4.5:1 is a
// `pairing-contrast` violation, named after the pairing or component as the
// page names them (`primary fg on bg-subtle`, `btn-solid primary`), with its
// colors (`#ffffff on #0087fe`). Disabled controls are exempt.
//
// Light and dark, like the rest of the scan; `npm run report:contrast` also
// lists the configs' custom color modes. Runs with the configs A11Y_CONFIGS
// names, like a11y.spec.js. Known violations are the `pairing-contrast`
// entries of known-issues.js, and the report goes to
// reports/a11y/<config>/<theme>/contrast/pages/contrast.json.
import { expect, test } from '@playwright/test'
import { ALL_CONFIGS, CONTRAST_RULE, THEMES, describe, describeEntry, expectedWith, goneMessage, knownOn, load, matches, report, unexpectedMessage } from './shared.js'

const URL = '/pages/contrast.html'
const HELP = 'Text must contrast at least 4.5:1 with its background (WCAG 1.4.3)'

const list = (name, fallback) => (process.env[name] || fallback).split(',').map(value => value.trim()).filter(Boolean)
const CONFIGS = process.env.A11Y_CONFIGS === 'all' ? ALL_CONFIGS : list('A11Y_CONFIGS', 'default')

const scope = process.env.A11Y_SCOPE ? JSON.parse(process.env.A11Y_SCOPE) : { full: true }
const inScope = config => scope.full || config === 'default' || scope.configs.includes(config) || scope.urls.includes(URL)

for (const config of CONFIGS.filter(inScope)) {
  test(`contrast ${config}`, async ({ page }, testInfo) => {
    // The page switches color modes itself; loading it in light keeps the
    // live samples in light.
    const params = await load(page, URL, 'light', config)
    const { results } = await page.evaluate(() => window.playgroundContrast)
    const unexpected = []
    const gone = []

    for (const theme of THEMES) {
      const nodes = results.filter(result => result.mode === theme && !result.aa && !result.exempt).map(result => ({
        rule: CONTRAST_RULE,
        selector: result.name,
        colors: `${result.fg} on ${result.bg}`,
        help: HELP,
        summary: `${result.ratio}:1, APCA Lc ${result.apca}`
      }))
      const known = knownOn(URL, theme, config, 'contrast')
      const entryOf = new Map(nodes.map(node => [node, known.find(entry => matches(entry, node))]))
      await report(testInfo, { config, theme, url: URL, state: 'contrast' }, nodes.map(node => {
        const entry = entryOf.get(node)
        return { ...node, known: entry ? entry.issue ?? entry.reason : null }
      }))

      unexpected.push(...nodes.filter(node => !entryOf.get(node)).map(node => `${theme}: ${describe(node)}: ${node.summary}`))
      gone.push(...known.filter(entry => expectedWith(entry, config) && !nodes.some(node => matches(entry, node))).map(entry => `${theme}: ${describeEntry(entry)}`))
    }

    expect(unexpected, unexpectedMessage(`${URL}?${params}`)).toEqual([])
    expect(gone, goneMessage).toEqual([])
  })
}

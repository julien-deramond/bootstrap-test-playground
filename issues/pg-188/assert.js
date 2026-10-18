// Fixed when every checkbox, radio and switch, at the three sizes, is centered
// on the first line of its label, within 0.5px.
export const environment = { viewport: { width: 1100, height: 900 } }

export async function assert() {
  const { measureOffsets, format } = await import('./measure.js')
  const results = measureOffsets()
  return {
    pass: results.every(({ offset }) => Math.abs(offset) <= 0.5),
    details: format(results)
  }
}

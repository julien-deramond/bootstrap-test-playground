// Fixed when the primary focus ring contrasts at least 3:1 with every surface
// (bg-body to bg-3), in light and in dark mode (WCAG 1.4.11).
export async function assert() {
  const { measureRings, format } = await import('./measure.js')
  const results = measureRings()
  return {
    pass: results.every(({ ratio }) => ratio >= 3),
    details: format(results)
  }
}

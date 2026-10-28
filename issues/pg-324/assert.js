// Fixed when Datepicker.dispose() leaves the input in the document, so that a
// new instance on it can show its calendar. Today dispose() replaces the input
// with a copy made at init, the page's input is detached, and the second
// instance fires `shown` without a calendar on screen.
export async function assert() {
  const stage = document.getElementById('stage') ?? document.body
  const input = document.createElement('input')
  input.type = 'text'
  input.setAttribute('aria-label', 'Date')
  input.className = 'form-control'
  stage.append(input)

  const { Datepicker } = window.bootstrap
  Datepicker.getOrCreateInstance(input).dispose()
  const stillConnected = input.isConnected

  let calendarShown = false
  let error = ''
  try {
    const picker = Datepicker.getOrCreateInstance(input)
    await picker.show()
    calendarShown = Boolean(picker._calendar?.context?.mainElement?.isConnected)
    picker.dispose()
  } catch (e) {
    error = `, then ${e.message}`
  }

  // Clean up both the page's input and any copy that replaced it.
  stage.replaceChildren()

  return {
    pass: stillConnected && calendarShown,
    details: `input in the document after dispose(): ${stillConnected}; calendar in the document after re-init and show(): ${calendarShown}${error}`
  }
}

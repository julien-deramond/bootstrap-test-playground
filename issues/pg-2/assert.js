// Fixed when creating a combobox logs no "more than one instance per element"
// error: it no longer creates a Menu on its own element. A fresh combobox is
// built for the check, since the page's own was created at load.
export async function assert() {
  const { Combobox, Menu } = window.bootstrap
  const container = document.createElement('div')
  container.innerHTML = `<button class="form-control combobox-toggle" type="button" data-bs-name="probe" data-bs-placeholder="Probe"><span class="combobox-value">Probe</span></button>
    <div class="menu"><button class="menu-item" type="button" data-bs-value="1">Option one</button></div>`
  document.body.append(container)
  const toggle = container.querySelector('.combobox-toggle')

  const errors = []
  const original = console.error
  console.error = (...args) => errors.push(args.map(String).join(' '))
  let combobox
  try {
    combobox = new Combobox(toggle)
  } finally {
    console.error = original
  }

  const menu = Menu.getInstance(toggle)
  const logged = errors.find(message => /more than one instance/i.test(message))
  combobox?.dispose()
  container.remove()
  return {
    pass: !logged,
    details: logged ? `creating a combobox logged "${logged}"` : `no error logged; Menu.getInstance(toggle): ${menu ? 'a Menu' : 'null'}`
  }
}

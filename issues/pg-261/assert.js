// Fixed when every item of the open combobox menu has a role that supports
// the selected state: option in a listbox, or menuitemradio/menuitemcheckbox
// (with aria-checked) in a menu.
const until = (condition, ms = 3000) => new Promise(resolve => {
  const started = Date.now()
  const check = () => (condition() || Date.now() - started > ms ? resolve(condition()) : setTimeout(check, 50))
  check()
})

export async function assert() {
  const root = document.querySelector('[data-playground-repro]')
  const menu = root.querySelector('.menu')
  const items = [...menu.querySelectorAll('.menu-item[data-bs-value]')]
  // The combobox marks its selected item once it's initialized.
  const rendered = await until(() => items.some(item => item.hasAttribute('aria-selected') || item.hasAttribute('aria-checked')))
  const roles = items.map(item => item.getAttribute('role') || 'none')
  const menuRole = menu.getAttribute('role') || 'none'
  const options = menuRole === 'listbox' && roles.every(role => role === 'option')
  const menuItems = menuRole === 'menu' && roles.every(role => role === 'menuitemradio' || role === 'menuitemcheckbox')
  return {
    pass: rendered && (options || menuItems),
    details: `${rendered ? '' : 'the selection never rendered; '}menu role: ${menuRole}; item roles: ${[...new Set(roles)].join(', ')}`
  }
}

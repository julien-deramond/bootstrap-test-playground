// Demo wiring for the examples, ported from Bootstrap's docs
// (site/src/assets/partials/snippets.js). Everything is opt-in and guarded, so
// pages without these elements are unaffected.
export function initExamples({ Carousel, Popover, Toast, Tooltip }) {
  // Tooltips and popovers are opt-in.
  for (const element of document.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    new Tooltip(element)
  }

  for (const element of document.querySelectorAll('[data-bs-toggle="popover"]')) {
    new Popover(element)
  }

  // Show static toast examples. Toasts inside dialogs have their own trigger.
  for (const element of document.querySelectorAll('.playground-example .toast')) {
    if (!element.closest('dialog')) {
      new Toast(element, { autohide: false }).show()
    }
  }

  const liveToasts = {
    liveToastBtn: 'liveToast',
    dialogToastBtn: 'dialogToast'
  }

  for (const [triggerId, toastId] of Object.entries(liveToasts)) {
    const trigger = document.getElementById(triggerId)
    const toast = document.getElementById(toastId)
    if (trigger && toast) {
      trigger.addEventListener('click', () => Toast.getOrCreateInstance(toast).show())
    }
  }

  const toastPlacement = document.getElementById('toastPlacement')
  const toastPlacementSelect = document.getElementById('selectToastPlacement')
  if (toastPlacement && toastPlacementSelect) {
    const originalClass = toastPlacement.className
    toastPlacementSelect.addEventListener('change', () => {
      toastPlacement.className = `${originalClass} ${toastPlacementSelect.value}`
    })
  }

  // Live alert
  const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
  const alertTrigger = document.getElementById('liveAlertBtn')
  if (alertPlaceholder && alertTrigger) {
    alertTrigger.addEventListener('click', () => {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = [
        '<div class="alert theme-success" role="alert">',
        '  <p>Nice, you triggered this alert message!</p>',
        '  <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
      ].join('')
      alertPlaceholder.append(wrapper)
    })
  }

  // Accordion expand / collapse all
  const accordion = document.getElementById('accordionExpandCollapse')
  const toggleAll = document.getElementById('btnAccordionToggleAll')
  if (accordion && toggleAll) {
    toggleAll.addEventListener('click', () => {
      const expand = toggleAll.getAttribute('aria-expanded') !== 'true'
      for (const item of accordion.querySelectorAll('.accordion-item')) {
        if (expand) {
          item.removeAttribute('name')
          item.open = true
        } else {
          item.open = false
          item.setAttribute('name', 'accordionExpandCollapse')
        }
      }

      toggleAll.setAttribute('aria-expanded', String(expand))
      toggleAll.textContent = expand ? 'Collapse all' : 'Expand all'
    })
  }

  // Non-autoplaying carousels
  for (const element of document.querySelectorAll('.carousel:not([data-bs-autoplay="true"])')) {
    Carousel.getOrCreateInstance(element)
  }

  // Indeterminate checkboxes
  for (const checkbox of document.querySelectorAll('[type="checkbox"][id*="Indeterminate"]')) {
    checkbox.indeterminate = true
  }

  // Empty links don't jump to the top of the page.
  document.addEventListener('click', event => {
    if (event.target.closest('a[href="#"]')) {
      event.preventDefault()
    }
  })

  // Demo forms never submit.
  for (const form of document.querySelectorAll('form:not([action])')) {
    form.addEventListener('submit', event => event.preventDefault())
  }
}

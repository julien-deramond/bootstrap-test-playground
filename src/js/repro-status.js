// A reproduction's upstream status, from its
// <meta name="playground-upstream" data-status="…"> (see
// scripts/lib/repro-status.mjs), for its header, the home page and the page
// switcher. `theme` is a Bootstrap theme color, `short` fits a card.
export const STATUSES = {
  unreported: { text: 'Not reported upstream', short: 'Not reported', theme: 'warning' },
  reported: { text: 'Reported upstream', short: 'Reported', theme: 'info' },
  fixed: { text: 'Fixed upstream', short: 'Fixed', theme: 'success' }
}

// `twbs/bootstrap#42754` → its URL. GitHub redirects /issues/ to /pull/.
export const githubUrl = reference => {
  const [, repo, number] = reference?.match(/^([\w.-]+\/[\w.-]+)#(\d+)$/) ?? []
  return repo ? `https://github.com/${repo}/issues/${number}` : undefined
}

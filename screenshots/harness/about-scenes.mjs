export function isAboutScene(scene) {
  return scene.startsWith('settings-about') || scene.startsWith('changelog-') || scene.startsWith('bug-report-')
}

export function configureAboutFixture(api, scene, now, registry) {
  if (!isAboutScene(scene)) return

  const service = registry.getNavigatorAboutServices(api)

  if (!service) throw new Error('Synthetic About service was not registered')

  const status = scene === 'settings-about-update' ? 'available'
    : scene === 'settings-about-error' ? 'error' : scene === 'settings-about-checking' ? 'checking' : 'current'
  const transport = {
    probe: async () => scene === 'bug-report-browser'
      ? { status: 'missing', message: 'GitHub CLI is not installed. Open the browser to send your report.' }
      : { status: 'ready', message: 'Ready through the synthetic GitHub CLI.' },
    send: async () => ({ status: 'failed', message: 'Synthetic GitHub refusal. Check access, then retry.' }),
    open: async () => true,
  }
  const dispose = registry.registerNavigatorAboutServices(api, {
    ...service, checkState: () => ({ status, latest: status === 'available' ? '9.99.0' : service.navigatorVersion, checkedAt: now }),
    checking: () => status === 'checking', updating: () => false, installed: () => {},
    check: async () => {}, update: () => {}, bugReportTransport: transport,
    changelog: async () => [
      { version: service.navigatorVersion, changes: ['Synthetic release: keep toolbar hints inside the existing gap.', 'Browse release history without consuming the first-launch upgrade notes.'] },
      { version: '0.0.1', changes: [] },
    ],
  })

  api.lifecycle.onDispose(dispose)
}

export function openAboutScene(api, scene, dispatch, schedule = setTimeout) {
  if (!isAboutScene(scene)) return

  dispatch('opencode-navigator.settings')
  schedule(() => { for (let index = 0; index < 5; index++) dispatch('opencode-navigator.settings.next-tab') }, 350)

  if (scene.startsWith('settings-about')) return

  schedule(() => {
    for (let index = 0; index < (scene.startsWith('changelog-') ? 2 : 3); index++) dispatch('opencode-navigator.settings.next')
    dispatch('opencode-navigator.settings.select')
  }, 850)

  if (scene === 'changelog-version') schedule(() => dispatch('opencode-navigator.selection-menu.select'), 1300)

  if (!scene.startsWith('bug-report-')) return

  schedule(async () => {
    const title = api.renderer.currentFocusedRenderable

    if (!title || !('value' in title)) throw new Error('Synthetic Bug report title did not focus')

    title.value = 'Synthetic toolbar hint moves sections'
    await dispatch('opencode-navigator.bug-report.next')
    const body = api.renderer.currentFocusedRenderable

    if (!body || typeof body.setText !== 'function') throw new Error('Synthetic Bug report body did not focus')

    body.setText('## What happened\nA toolbar hint moves the next section.\n\n## Steps to reproduce\nHover a pinned action.\n\n## Expected behavior\nSection positions remain unchanged.\n\n## Environment\nFully synthetic screenshot fixture.')
    body.cursorOffset = 0
  }, 1350)

  if (['bug-report-confirmation', 'bug-report-error'].includes(scene)) schedule(() => dispatch('opencode-navigator.bug-report.send'), 1850)

  if (scene === 'bug-report-error') schedule(() => {
    dispatch('opencode-navigator.bug-report.confirm.switch')
    dispatch('opencode-navigator.bug-report.confirm.activate')
  }, 2350)

  schedule(() => {
    const control = api.renderer.currentFocusedRenderable

    if (control && 'showCursor' in control) control.showCursor = false
    else control?.blur()
  }, 3000)
}

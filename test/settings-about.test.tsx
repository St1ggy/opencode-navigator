/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import metadata from '../package.json'
import { openSettings } from '../src/features/sidebar-settings'
import { createVersionUpdateActions } from '../src/features/version-footer'

import { aboutServicesFixture } from './fixtures/about-services'
import { toolbarHarness } from './fixtures/toolbar-harness'

test('About shares update state, preserves nested release navigation, and never claims startup notes', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)
  let claims = 0

  h.preferences.claimNavigatorUpgrade = async () => {
    claims++
  }
  try {
    openSettings(h.api, h.preferences, 'about:check')
    await h.wait('Updates have not been checked yet')
    expect(h.captureCharFrame()).toContain(`Navigator ${metadata.version}`)
    expect(h.captureCharFrame()).toContain(metadata.devDependencies['@opencode/plugin'])
    await h.click('Check for updates')
    await h.wait('Navigator is up to date')
    expect(info.checks()).toBe(1)
    info.setState({ status: 'error' })
    await h.wait('Could not check updates')
    await h.click('Changelog by version')
    await h.wait(`Navigator ${metadata.version}`)
    await h.wait('No user-facing changes')
    h.mockInput.pressEnter()
    await h.wait('Synthetic visible change')
    h.mockInput.pressEscape()
    await h.wait('Navigator changelog')
    h.mockInput.pressEscape()
    await h.wait('Could not check updates')
    expect(claims).toBe(0)
    expect(info.reads()).toBe(1)
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

test('manual release browsing shows technical versions and retains About on read errors', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)

  try {
    openSettings(h.api, h.preferences, 'about:changelog')
    await h.wait('Changelog by version')
    h.mockInput.pressEnter()
    await h.wait('Navigator changelog')
    h.mockInput.pressArrow('down')
    h.mockInput.pressEnter()
    await h.wait('No user-facing changes in this version')
    h.mockInput.pressEscape()
    await h.wait('Navigator changelog')
    h.mockInput.pressEscape()
    await h.wait('Changelog by version')
    info.fail()
    await h.click('Changelog by version')
    await h.wait('Could not read the bundled changelog')
    h.mockInput.pressEscape()
    await h.wait('Navigator settings')
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

test('the packaged deferred About tab reads the main runtime service registry', async () => {
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
  const built = await import('../dist/tui.js')
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)
  const unregister = built.registerNavigatorAboutServices(h.api, info.service)

  try {
    expect(built.getNavigatorAboutServices(h.api)).toBe(info.service)
    built.openSettings(h.api, h.preferences, 'about:check')
    await h.wait(`Navigator ${metadata.version}`)
    await h.click('Check for updates')
    await h.wait('Navigator is up to date')
    expect(info.checks()).toBe(1)
  } finally {
    unregister()
    info.dispose()
    h.renderer.destroy()
  }
})

test('About update confirmation restores its parent on Cancel and shares the existing install guards', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  let installs = 0
  let remembered = 0
  const target = '9.0.0'
  const updates = createVersionUpdateActions(
    h.api,
    { openCodeUpdate: () => {}, navigatorUpdate: () => target },
    {
      openCode: async () => {},
      navigator: async () => {
        installs++
      },
    },
    async () => {
      remembered++
    },
  )
  const info = aboutServicesFixture(h.api, (dialogs) => updates.navigator(target, dialogs))

  info.service.installed = updates.navigatorInstalled
  info.setState({ status: 'available', latest: target })

  try {
    openSettings(h.api, h.preferences, 'about:update')
    await h.wait('Update Navigator')
    await h.click('Update Navigator')
    await h.wait(`Install Navigator ${target}`)
    h.mockInput.pressEscape()
    await h.wait('Navigator settings')
    expect(installs).toBe(0)
    expect(remembered).toBe(0)
    await h.click('Update Navigator')
    await h.wait(`Install Navigator ${target}`)
    h.mockInput.pressArrow('down')
    h.mockInput.pressEnter()
    await h.wait(`Restart OpenCode to use Navigator ${target}`)
    expect(installs).toBe(1)
    expect(remembered).toBe(1)
    updates.navigator(target)
    await h.flush()
    expect(installs).toBe(1)
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

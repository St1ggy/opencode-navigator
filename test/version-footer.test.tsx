/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import packageJSON from '../package.json' with { type: 'json' }
import { VersionFooter, VersionSummary, createVersionStatus, isNewerVersion } from '../src/features/version-footer'
import { IconProvider, uiIcon } from '../src/shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const theme = {
  text: '#ffffff',
  textMuted: '#888888',
  warning: '#ffff00',
}

function nextPatch(version: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)

  if (!match) throw new Error('Expected a stable semantic version in package metadata')

  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

test('version comparison handles stable and prerelease versions', () => {
  expect(isNewerVersion('1.3.0', '1.2.3')).toBe(true)
  expect(isNewerVersion('2.0.0', '1.2.3')).toBe(true)
  expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false)
  expect(isNewerVersion('1.2.3', '1.2.3-beta.1')).toBe(true)
  expect(isNewerVersion('not-a-version', '1.2.3')).toBe(false)
})

test('version status tracks OpenCode events and the Navigator registry release', async () => {
  const hostVersion = packageJSON.devDependencies['@opencode-ai/plugin']
  const hostUpdate = nextPatch(hostVersion)
  const navigatorVersion = packageJSON.version
  const navigatorUpdate = nextPatch(navigatorVersion)
  let onUpdate: ((event: { properties: { version: string } }) => void) | undefined
  const disposers: (() => void)[] = []
  const api = {
    app: { version: hostVersion },
    event: {
      on(_name: string, handler: typeof onUpdate) {
        onUpdate = handler

        return () => {}
      },
    },
    lifecycle: { onDispose: (dispose: () => void) => disposers.push(dispose) },
  } as unknown as TuiPluginApi
  const request = Object.assign(() => Promise.resolve(Response.json({ version: navigatorUpdate })), { preconnect() {} })
  const status = createVersionStatus(api, navigatorVersion, request)

  await Bun.sleep(0)
  onUpdate?.({ properties: { version: hostUpdate } })

  expect(status.openCodeUpdate()).toBe(hostUpdate)
  expect(status.navigatorUpdate()).toBe(navigatorUpdate)

  for (const dispose of disposers) dispose()
})

test('footer keeps each label, version, and update icon independently clickable', async () => {
  const updates: string[] = []
  const hostVersion = packageJSON.devDependencies['@opencode-ai/plugin']
  const navigatorVersion = packageJSON.version
  const openCodeTarget = nextPatch(hostVersion)
  const navigatorTarget = nextPatch(navigatorVersion)
  const api = {
    app: { version: hostVersion },
    state: {
      path: { directory: '/workspace/project' },
      vcs: { branch: 'main' },
      session: { get: () => ({ directory: '/workspace/project' }) },
    },
    theme: { current: theme },
  } as unknown as TuiPluginApi
  const view = await testRender(
    () => (
      <IconProvider style={() => 'text'}>
        <VersionFooter
          api={api}
          sessionID="session"
          navigatorVersion={navigatorVersion}
          status={{ openCodeUpdate: () => openCodeTarget, navigatorUpdate: () => navigatorTarget }}
          onOpenCodeUpdate={(target) => updates.push(`opencode:${target}`)}
          onNavigatorUpdate={(target) => updates.push(`navigator:${target}`)}
        />
      </IconProvider>
    ),
    { width: 50, height: 4 },
  )

  try {
    await view.renderOnce()
    const frame = view.captureCharFrame()

    expect(frame).toContain('/workspace/project:main')
    expect(frame).toMatch(/OpenCode \d+\.\d+\.\d+\^ \| Navigator \d+\.\d+\.\d+\^/)

    const lines = frame.split('\n')
    const row = lines.findIndex((line) => line.includes('OpenCode'))
    const openCodeLabel = lines[row].indexOf('OpenCode')
    const openCodeVersion = lines[row].indexOf(hostVersion)
    const openCodeIcon = lines[row].indexOf('^')
    const separator = lines[row].indexOf('|')
    const navigatorLabel = lines[row].indexOf('Navigator')
    const navigatorVersionColumn = lines[row].indexOf(navigatorVersion)
    const navigatorIcon = lines[row].indexOf('^', openCodeIcon + 1)

    await view.mockMouse.click(openCodeLabel, row)
    await view.mockMouse.click(openCodeVersion, row)
    await view.mockMouse.click(openCodeIcon, row)
    await view.mockMouse.click(separator, row)
    await view.mockMouse.click(navigatorLabel, row)
    await view.mockMouse.click(navigatorVersionColumn, row)
    await view.mockMouse.click(navigatorIcon, row)
    expect(updates).toEqual([
      `opencode:${openCodeTarget}`,
      `opencode:${openCodeTarget}`,
      `opencode:${openCodeTarget}`,
      `navigator:${navigatorTarget}`,
      `navigator:${navigatorTarget}`,
      `navigator:${navigatorTarget}`,
    ])
  } finally {
    view.renderer.destroy()
  }
})

test('available versions render the prominent Nerd Font update indicator', async () => {
  const hostVersion = packageJSON.devDependencies['@opencode-ai/plugin']
  const navigatorVersion = packageJSON.version
  const api = { app: { version: hostVersion }, theme: { current: theme } } as unknown as TuiPluginApi
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <VersionSummary
          api={api}
          navigatorVersion={navigatorVersion}
          status={{ openCodeUpdate: () => nextPatch(hostVersion), navigatorUpdate: () => nextPatch(navigatorVersion) }}
          onOpenCodeUpdate={() => {}}
          onNavigatorUpdate={() => {}}
        />
      </IconProvider>
    ),
    { width: 50, height: 2 },
  )

  try {
    await view.renderOnce()
    const frame = view.captureCharFrame()

    expect(frame).toMatch(/OpenCode \d+\.\d+\.\d+/)
    expect(frame).toContain(' | Navigator')
    expect(frame.split(uiIcon('update'))).toHaveLength(3)
  } finally {
    view.renderer.destroy()
  }
})

/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { VersionFooter, VersionSummary, createVersionStatus, isNewerVersion } from '../src/features/version-footer'
import { IconProvider, uiIcon } from '../src/shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const theme = {
  text: '#ffffff',
  textMuted: '#888888',
  warning: '#ffff00',
}

test('version comparison handles stable and prerelease versions', () => {
  expect(isNewerVersion('1.19.0', '1.18.31')).toBe(true)
  expect(isNewerVersion('2.0.0', '1.18.31')).toBe(true)
  expect(isNewerVersion('1.18.31', '1.18.31')).toBe(false)
  expect(isNewerVersion('1.18.31', '1.18.31-beta.1')).toBe(true)
  expect(isNewerVersion('not-a-version', '1.18.31')).toBe(false)
})

test('version status tracks OpenCode events and the Navigator registry release', async () => {
  let onUpdate: ((event: { properties: { version: string } }) => void) | undefined
  const disposers: (() => void)[] = []
  const api = {
    app: { version: '1.18.31' },
    event: {
      on(_name: string, handler: typeof onUpdate) {
        onUpdate = handler

        return () => {}
      },
    },
    lifecycle: { onDispose: (dispose: () => void) => disposers.push(dispose) },
  } as unknown as TuiPluginApi
  const request = Object.assign(() => Promise.resolve(Response.json({ version: '0.16.0' })), { preconnect() {} })
  const status = createVersionStatus(api, '0.15.0', request)

  await Bun.sleep(0)
  onUpdate?.({ properties: { version: '1.19.0' } })

  expect(status.openCodeUpdate()).toBe('1.19.0')
  expect(status.navigatorUpdate()).toBe('0.16.0')

  for (const dispose of disposers) dispose()
})

test('footer keeps each label, version, and update icon independently clickable', async () => {
  const updates: string[] = []
  const hostVersion = '1.18.31'
  const navigatorVersion = '0.15.0'
  const openCodeTarget = '1.19.0'
  const navigatorTarget = '0.16.0'
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
  const api = { app: { version: '1.18.31' }, theme: { current: theme } } as unknown as TuiPluginApi
  const view = await testRender(
    () => (
      <IconProvider style={() => 'nerd'}>
        <VersionSummary
          api={api}
          navigatorVersion="0.15.0"
          status={{ openCodeUpdate: () => '1.19.0', navigatorUpdate: () => '0.16.0' }}
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

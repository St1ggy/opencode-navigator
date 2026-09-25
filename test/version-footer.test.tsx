/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'

import { VersionFooter, createVersionStatus, isNewerVersion } from '../src/features/version-footer'
import { IconProvider } from '../src/shared/ui'

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

test('footer preserves path and branch and places each update icon by its version', async () => {
  const updates: string[] = []
  const api = {
    app: { version: '1.18.31' },
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
          navigatorVersion="0.15.0"
          status={{ openCodeUpdate: () => '1.19.0', navigatorUpdate: () => '0.16.0' }}
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
    expect(frame).toContain('OpenCode 1.18.31^ | Navigator 0.15.0^')

    const lines = frame.split('\n')
    const row = lines.findIndex((line) => line.includes('OpenCode 1.18.31'))
    const openCodeIcon = lines[row].indexOf('^')

    await view.mockMouse.click(openCodeIcon, row)
    await view.mockMouse.click(lines[row].indexOf('^', openCodeIcon + 1), row)
    expect(updates).toEqual(['opencode:1.19.0', 'navigator:0.16.0'])
  } finally {
    view.renderer.destroy()
  }
})

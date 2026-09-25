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

  expect(status.openCodeUpdate()).toBe(true)
  expect(status.navigatorUpdate()).toBe(true)

  for (const dispose of disposers) dispose()
})

test('footer preserves path and branch and places each update icon by its version', async () => {
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
          status={{ openCodeUpdate: () => true, navigatorUpdate: () => true }}
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
  } finally {
    view.renderer.destroy()
  }
})

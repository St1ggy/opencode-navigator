/** @jsxImportSource @opentui/solid */
import { createDefaultOpenTuiKeymap } from '@opentui/keymap/opentui'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sectionIcon } from '../src/icons/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from '@opentui/solid'

type SlotRegistration = {
  order: number
  slots: {
    app?: () => JSX.Element
    sidebar_title?: (context: unknown, props: { session_id: string; title: string }) => JSX.Element
    sidebar_content?: (context: unknown, props: { session_id: string }) => JSX.Element
    sidebar_footer?: (context: unknown, props: { session_id: string }) => JSX.Element
  }
}

const theme = {
  primary: '#7aa2f7',
  secondary: '#bb9af7',
  accent: '#ff9e64',
  error: '#f7768e',
  warning: '#e0af68',
  success: '#9ece6a',
  info: '#7dcfff',
  text: '#c0caf5',
  textMuted: '#a9b1d6',
  selectedListItemText: '#16161e',
  background: '#1a1b26',
  backgroundPanel: '#16161e',
  backgroundElement: '#292e42',
  backgroundMenu: '#24283b',
  border: '#565f89',
  borderActive: '#7aa2f7',
  borderSubtle: '#3b4261',
}

test('the packaged plugin mounts every slot and aborts in-flight work on disposal', async () => {
  // @ts-expect-error The package intentionally publishes JavaScript without declarations.
  const { default: plugin } = await import('../dist/tui.js')
  const stateDirectory = await mkdtemp(join(tmpdir(), 'opencode-pretty-sidebar-smoke-'))
  const lifecycle = new AbortController()
  const disposers: (() => void | Promise<void>)[] = []
  const requestSignals: AbortSignal[] = []
  const registrations: SlotRegistration[] = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = Object.assign(() => Promise.resolve(Response.json({ version: '0.14.0' })), {
    preconnect() {},
  })

  function pending(_input: unknown, options?: { signal?: AbortSignal }) {
    const signal = options?.signal

    if (signal) requestSignals.push(signal)

    return new Promise<never>((_resolve, reject) => {
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })
  }

  let api!: TuiPluginApi

  function Harness() {
    const renderer = useRenderer()
    const keymap = createDefaultOpenTuiKeymap(renderer)
    const registerLayer = keymap.registerLayer.bind(keymap)

    keymap.registerLayer = (layer) => {
      // OpenCode supplies the mode extension; this fixture uses a raw OpenTUI keymap.
      const copy = { ...layer }

      Reflect.deleteProperty(copy, 'mode')

      return registerLayer(copy)
    }
    const values = new Map<string, unknown>([['opencode-pretty-sidebar.onboarding', true]])

    api = {
      renderer,
      keymap,
      keys: { formatBindings: () => {} },
      route: {
        current: { name: 'session', params: { sessionID: 'session' } },
        navigate: () => {},
      },
      state: {
        ready: true,
        config: { lsp: false },
        path: {
          state: stateDirectory,
          config: stateDirectory,
          worktree: '/workspace',
          directory: '/workspace',
        },
        session: {
          get: () => ({ id: 'session', directory: '/workspace', title: 'Smoke session' }),
          todo: () => [{ content: 'Render the sidebar', status: 'pending' }],
          status: () => ({ type: 'idle' }),
        },
        lsp: () => [],
        mcp: () => [],
      },
      kv: {
        ready: true,
        get: (key: string) => values.get(key),
        set: (key: string, value: unknown) => values.set(key, value),
      },
      client: {
        session: {
          todo: pending,
          children: pending,
          status: pending,
        },
        app: { skills: pending },
        mcp: { status: pending },
      },
      event: { on: () => () => {} },
      lifecycle: {
        signal: lifecycle.signal,
        onDispose(dispose: () => void | Promise<void>) {
          disposers.push(dispose)

          return () => {}
        },
      },
      slots: {
        register(value: SlotRegistration) {
          registrations.push(value)

          return 'opencode-navigator'
        },
      },
      theme: { current: theme },
      app: { version: '1.18.30' },
      ui: {
        toast: () => {},
        dialog: { replace: () => {}, setSize: () => {}, clear: () => {} },
      },
    } as unknown as TuiPluginApi

    return <></>
  }

  const bootstrap = await testRender(() => <Harness />, { width: 50, height: 40 })
  let sidebar: Awaited<ReturnType<typeof testRender>> | undefined

  try {
    await bootstrap.renderOnce()
    await plugin.tui(api, {})
    expect(registrations).toHaveLength(2)

    const slots = Object.assign({}, ...registrations.map((registration) => registration.slots))

    sidebar = await testRender(
      () => (
        <box>
          {slots.app?.()}
          {slots.sidebar_title?.({}, { session_id: 'session', title: 'Smoke session' })}
          {slots.sidebar_content?.({}, { session_id: 'session' })}
          {slots.sidebar_footer?.({}, { session_id: 'session' })}
        </box>
      ),
      { width: 50, height: 40 },
    )
    await sidebar.flush()
    for (let attempt = 0; attempt < 20 && requestSignals.length < 5; attempt++) {
      await Bun.sleep(10)
      await sidebar.flush()
    }

    const frame = sidebar.captureCharFrame()

    expect(frame).toContain('Smoke session')
    expect(frame).toContain('TODO')
    expect(frame).toContain(`${sectionIcon('todo')} TODO`)
    expect(frame).toContain('SKILLS')
    expect(frame).toContain(`${sectionIcon('skills')} SKILLS`)
    expect(frame).toContain('QUICK ACTIONS')
    expect(frame).toContain(`${sectionIcon('quick_actions')} QUICK ACTIONS`)
    expect(frame).toContain('LSP')
    expect(frame).toContain(`${sectionIcon('lsp')} LSP`)
    expect(frame).toContain('MCP')
    expect(frame).toContain(`${sectionIcon('mcp')} MCP`)
    expect(frame).toContain(`${sectionIcon('subagents')} SUBAGENTS`)
    expect(frame).toContain('OpenCode 1.18.30 | Navigator 0.14.0')
    expect(requestSignals.length).toBeGreaterThanOrEqual(5)

    lifecycle.abort()
    await Promise.all(disposers.map((dispose) => dispose()))
    await Promise.resolve()
    expect(requestSignals.every((signal) => signal.aborted)).toBe(true)
  } finally {
    globalThis.fetch = originalFetch
    sidebar?.renderer.destroy()
    bootstrap.renderer.destroy()
    await rm(stateDirectory, { recursive: true, force: true })
  }
})

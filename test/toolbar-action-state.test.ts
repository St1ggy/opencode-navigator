import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { bindToolbarActionState } from '../src/app/opencode-v2/toolbar-action-state'
import { quickActionState, quickActionStates } from '../src/entities/quick-action'
import { createSkillController } from '../src/entities/skill'

import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('uses only observed permission and public compaction states, including revert and session changes', () => {
  createRoot((dispose) => {
    const [title, setTitle] = createSignal('Enable auto-approve permissions')
    const api = {
      keymap: { getCommands: () => [{ name: 'permission.mode', title: title() }] },
    } as unknown as TuiPluginApi

    expect(quickActionStates(api, 'permission.mode')).toHaveLength(2)
    expect(quickActionState(api, 'permission.mode')).toBe('off')
    setTitle('Disable auto-approve permissions')
    expect(quickActionState(api, 'permission.mode')).toBe('on')
    setTitle('Session permission settings')
    expect(quickActionStates(api, 'permission.mode')).toEqual([])
    expect(quickActionState(api, 'permission.mode')).toBeUndefined()
    const [session, setSession] = createSignal('one')
    const [revert, setRevert] = createSignal<string>()
    const [status, setStatus] = createSignal('running')
    const context = {
      ui: { router: { current: () => ({ type: 'session', sessionID: session() }) } },
      data: {
        session: {
          get: () => ({ revert: revert() ? { messageID: revert() } : undefined }),
          message: { list: (id: string) => (id === 'one' ? [{ type: 'compaction', id: 'm2', status: status() }] : []) },
        },
      },
    } as unknown as Plugin.Context

    bindToolbarActionState(context, api)
    expect(quickActionState(api, 'session.compact')).toBe('compacting')
    setStatus('completed')
    expect(quickActionState(api, 'session.compact')).toBe('idle')
    setStatus('running')
    setRevert('m1')
    expect(quickActionState(api, 'session.compact')).toBe('idle')
    setRevert(undefined)
    setSession('two')
    expect(quickActionState(api, 'session.compact')).toBe('idle')
    expect(quickActionStates(api, 'session.rename')).toEqual([])
    dispose()
  })
})

test('a Skill consumer releasing its lease does not abort another consumer on the same target', async () => {
  const signals: AbortSignal[] = []
  let resolve!: (result: { data: [] }) => void
  const api = {
    route: { current: { name: 'home' } },
    state: { path: { directory: '/synthetic' } },
    event: { on: () => () => {} },
    lifecycle: { onDispose() {} },
    client: {
      app: {
        skills: (_input: unknown, options: { signal: AbortSignal }) => {
          signals.push(options.signal)

          return new Promise<{ data: [] }>((done) => {
            resolve = done
          })
        },
      },
    },
  } as unknown as TuiPluginApi
  const controller = createSkillController(api)
  const releaseSection = controller.activate()
  const releaseToolbar = controller.activate()
  const request = controller.refresh()

  releaseSection()
  expect(signals[0].aborted).toBe(false)
  resolve({ data: [] })
  await request
  const next = controller.refresh()

  releaseToolbar()
  expect(signals[1].aborted).toBe(true)
  resolve({ data: [] })
  await next
  expect(controller.state().status).toBe('ready')
})

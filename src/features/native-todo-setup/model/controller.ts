import { createSignal } from 'solid-js'

import { todoConfig } from './config'
import { enableTodoConfig } from './config-patch'

import type { NativeTodoSetupState } from '../../../entities/todo/model'
import type { SetupTarget, TodoSetupPreview, TodoSetupSource } from './types'

export function createTodoSetupController(input: {
  source: TodoSetupSource
  target(sessionID: string): SetupTarget
  route(): string
  signal: AbortSignal
}) {
  const [states, setStates] = createSignal<Record<string, NativeTodoSetupState>>({})
  const [files, setFiles] = createSignal<Record<string, string[]>>({})
  const revisions = new Map<string, number>()
  const writes = new Set<string>()
  let active: SetupTarget | undefined
  const state = (sessionID: string): NativeTodoSetupState => {
    const target = input.target(sessionID)
    const value = states()[target.key] ?? { status: 'idle' as const }
    const capabilities = input.source.capabilities?.(target)

    if (capabilities?.read === false)
      return {
        status: 'idle',
        configurationUnavailable: 'This OpenCode server does not expose the effective Todo configuration.',
        enableUnavailable: 'This OpenCode server does not expose Todo configuration editing.',
      }

    return capabilities?.edit === false
      ? { ...value, enableUnavailable: 'This OpenCode server does not expose Todo configuration editing.' }
      : value
  }
  const set = (key: string, value: NativeTodoSetupState) => setStates((previous) => ({ ...previous, [key]: value }))
  const signal = () => AbortSignal.any([input.signal, AbortSignal.timeout(10_000)])
  const current = (preview: Pick<TodoSetupPreview, 'target' | 'route'>) =>
    !input.signal.aborted &&
    input.route() === preview.route &&
    input.target(preview.target.sessionID).key === preview.target.key
  const requireCurrent = (preview: Pick<TodoSetupPreview, 'target' | 'route'>) => {
    if (!current(preview)) throw new Error('Session or workspace changed; reopen Todo setup.')
  }
  const requireEditing = (sessionID: string) => {
    const reason = state(sessionID).enableUnavailable

    if (reason) throw new Error(reason)
  }

  async function refresh(sessionID: string) {
    const target = input.target(sessionID)
    const revision = (revisions.get(target.key) ?? 0) + 1

    active = target
    revisions.set(target.key, revision)

    if (state(sessionID).configurationUnavailable) return

    set(target.key, { ...states()[target.key], status: 'loading', error: undefined })
    try {
      const config = todoConfig(await input.source.entries(target, signal()))

      if (input.signal.aborted || revisions.get(target.key) !== revision) return

      setFiles((previous) => ({ ...previous, [target.key]: config.files }))
      set(target.key, { status: 'ready', enabled: config.enabled, error: config.unavailable })
    } catch {
      if (!input.signal.aborted && revisions.get(target.key) === revision)
        set(target.key, {
          ...states()[target.key],
          status: 'error',
          error: 'Could not read OpenCode Todo configuration. Retry.',
        })
    }
  }
  const unsubscribe = input.source.subscribe((directory) => {
    if (active && (!directory || directory === active.routing.directory)) void refresh(active.sessionID)
  })

  input.signal.addEventListener('abort', unsubscribe, { once: true })

  async function prepare(sessionID: string, path: string): Promise<TodoSetupPreview> {
    requireEditing(sessionID)
    const target = input.target(sessionID)
    const route = input.route()
    const config = todoConfig(await input.source.entries(target, signal()))

    requireCurrent({ target, route })

    if (config.enabled) throw new Error('Native Todo is already enabled. Refresh the section.')

    if (!config.files.includes(path)) throw new Error('The configuration source changed; choose its current file.')

    const original = await input.source.read(target, path, signal())

    requireCurrent({ target, route })

    return { target, route, path, original, updated: enableTodoConfig(original), sources: config.signature }
  }

  async function apply(preview: TodoSetupPreview) {
    requireCurrent(preview)
    requireEditing(preview.target.sessionID)

    if (writes.has(preview.path)) throw new Error('This configuration is already being saved.')

    writes.add(preview.path)
    set(preview.target.key, { status: 'saving', enabled: false })
    try {
      const config = todoConfig(await input.source.entries(preview.target, signal()))

      if (config.signature !== preview.sources || !config.files.includes(preview.path))
        throw new Error('Configuration sources changed; reopen the preview.')

      const original = await input.source.read(preview.target, preview.path, signal())

      requireCurrent(preview)
      requireEditing(preview.target.sessionID)

      if (original !== preview.original) throw new Error('The configuration file changed; reopen the preview.')

      await input.source.write(preview.target, preview.path, preview.updated, signal())
      const saved = await input.source.read(preview.target, preview.path, signal())

      if (saved !== preview.updated) throw new Error('The file changed while saving. Review it before trying again.')

      for (let attempt = 0; attempt < 6; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 150))
        const effective = todoConfig(await input.source.entries(preview.target, signal()))

        if (effective.enabled) {
          set(preview.target.key, { status: 'ready', enabled: true })

          return
        }
      }
      throw new Error('Saved experimental.todo=true, but the host has not enabled it. Refresh or restart OpenCode.')
    } catch (error) {
      set(preview.target.key, {
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Could not enable Todo. Refresh to check the current configuration before retrying.',
      })
      throw error
    } finally {
      writes.delete(preview.path)
    }
  }

  return {
    state,
    files: (sessionID: string) => files()[input.target(sessionID).key] ?? [],
    refresh,
    prepare,
    apply,
    current,
  }
}

export type TodoSetupController = ReturnType<typeof createTodoSetupController>

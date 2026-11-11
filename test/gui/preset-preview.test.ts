import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createMcpPresetPreview } from '../../src/features/sidebar-settings/model'

test('shared MCP preview stops reading a stale GUI source and cannot apply after a visit changes', () => {
  let reads = 0
  let writes = 0
  const root = createRoot((dispose) => {
    const [current, setCurrent] = createSignal(true)
    const model = createMcpPresetPreview(
      {
        target: () => ({
          key: 'server-location',
          scope: '/synthetic/project',
          routing: { directory: '/synthetic/project' },
        }),
        list: () => {
          if (!current()) throw new Error('A stale source was read')

          reads++

          return [{ name: 'synthetic-server', status: 'disabled' }]
        },
        state: () => ({ status: 'ready' }),
        mutating: () => false,
        refresh: async () => [],
        applyPreset: async () => {
          writes++
        },
      },
      { mcpPresets: () => ({ Synthetic: { 'synthetic-server': 'enabled' } }) },
      'Synthetic',
      current,
    )

    return { dispose, model, setCurrent }
  })

  try {
    expect(root.model.preview().changes).toEqual([{ name: 'synthetic-server', action: 'connect' }])
    const previousReads = reads

    root.setCurrent(false)
    expect(root.model.valid()).toBe(false)
    expect(root.model.preview().changes).toEqual([])
    expect(root.model.blocked()).toContain('Session or server changed')
    root.model.refresh()
    expect(root.model.apply()).toBeUndefined()
    expect(writes).toBe(0)
    expect(reads).toBe(previousReads)
  } finally {
    root.dispose()
  }
})

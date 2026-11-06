import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { createOpenCodeV2Sources } from '../src/app/opencode-v2'
import { createMcpController } from '../src/entities/mcp'
import { createSkillController, skillUnavailable } from '../src/entities/skill'
import { createSubagentController } from '../src/entities/subagent'

import { nativeHostFixture } from './fixtures/native-host'

test('native Skill cache stays authoritative and exact IDs disambiguate identical names', async () => {
  const h = nativeHostFixture()
  const sources = createOpenCodeV2Sources(h.context, h.api)
  const skills = createSkillController(h.api, sources.skills)
  const target = skills.target()

  await skills.refresh(target)
  const selected = skills.list()[1]

  expect(skillUnavailable(skills, selected)).toBeUndefined()
  expect(await skills.use(target, selected.name, selected)).toBe(true)
  expect(h.calls).toContainEqual(['skill', { sessionID: 'parent', id: 'skill-b' }])
  h.setState('skills', 1, 'content', 'Changed')
  expect(skills.list()[1]).toBe(selected)
  expect(selected.content).toBe('Changed')
  h.setSkills([{ id: 'replacement', name: 'review', path: '/synthetic/b', content: 'New source' }])
  expect(skillUnavailable(skills, { ...selected, id: 'skill-b' })).toBe('Skill source changed')
  await Promise.resolve(
    expect(skills.use(target, selected.name, { ...selected, id: 'skill-b' })).rejects.toThrow('target changed'),
  )
  await h.dispose()
})

test('native MCP reads reactively without a duplicate status fetch and preserves pending', async () => {
  const h = nativeHostFixture()
  const source = createOpenCodeV2Sources(h.context, h.api).mcp
  const mcp = createMcpController(
    h.api,
    () => false,
    { load: async () => {}, desiredMcpState: () => {}, setDesiredMcpState() {} },
    source,
  )

  await mcp.refresh()
  const row = mcp.list()[0]

  h.setState('servers', 0, 'status', 'status', 'pending')
  expect(mcp.list()[0]).toBe(row)
  expect(row.status).toBe('pending')
  await mcp.toggle('docs')
  expect(h.calls.filter((call) => call[0] === 'connect')).toHaveLength(0)
  h.setState('servers', 0, 'status', 'status', 'disabled')
  await mcp.toggle('docs')
  expect(h.calls).toContainEqual(['connect', { server: 'docs', location: { directory: '/synthetic' } }])
  expect(h.calls).toContainEqual(['invalidate', 'servers'])
  await h.dispose()
})

test('native policy denials propagate without alternate Skill or MCP mutations', async () => {
  const h = nativeHostFixture()
  const denied = new Error('Managed policy denied skill.use and mcp.use')
  const calls: unknown[] = []
  const reject = async (input: unknown, options: unknown) => {
    calls.push([input, options])
    throw denied
  }

  h.context.client.experimental.session.skill = reject
  h.context.client.experimental.mcp.connect = reject
  h.context.client.experimental.mcp.disconnect = reject
  const source = createOpenCodeV2Sources(h.context, h.api).skills
  const skills = createSkillController(h.api, source)
  const target = skills.target()
  const signal = new AbortController().signal

  try {
    await skills.refresh(target)
    const selected = skills.list()[1]

    await Promise.resolve(expect(source.use(target, selected, signal)).rejects.toBe(denied))
    for (const action of ['connect', 'disconnect'] as const)
      await Promise.resolve(
        expect(h.api.client.mcp[action]({ directory: '/synthetic', name: 'docs' }, { signal })).rejects.toBe(denied),
      )
    expect(calls).toEqual([
      [{ sessionID: 'parent', id: 'skill-b' }, { signal }],
      [{ server: 'docs', location: { directory: '/synthetic' } }, { signal }],
      [{ server: 'docs', location: { directory: '/synthetic' } }, { signal }],
    ])
    expect(skills.list()[1]).toBe(selected)
    expect(h.calls.some(([name]) => name === 'skill' || name === 'connect')).toBe(false)
  } finally {
    await h.dispose()
  }
})

test('native Subagent status comes from host state while execution events feed observed history', async () => {
  const h = nativeHostFixture()
  let dispose!: () => void
  const controller = createRoot((cleanup) => {
    dispose = cleanup

    return createSubagentController(h.api, { source: createOpenCodeV2Sources(h.context, h.api).subagents })
  })
  const deactivate = controller.activate('parent')

  await controller.refresh('parent')
  expect(controller.list('parent')).toHaveLength(1)
  h.setState('sessions', 1, 'title', 'Live child')
  expect(controller.list('parent')[0].session.title).toBe('Live child')
  h.setState('running', false)
  h.emit('session.execution.succeeded', { sessionID: 'child' })
  expect(controller.list('parent')).toEqual([])
  expect(controller.recent('parent')).toHaveLength(1)
  deactivate()
  dispose()
  await h.dispose()
})

test('native execution timing ignores the previous idle/outcome and survives retries, restart and cancellation', async () => {
  const h = nativeHostFixture({ childTime: { busy: 100, idle: 90 } })
  const sources = createOpenCodeV2Sources(h.context, h.api)
  const controller = createSubagentController(h.api, { source: sources.subagents, now: () => 1000 })
  const leave = controller.activate('parent')

  try {
    await controller.refresh('parent')
    const row = controller.list('parent')[0]

    expect(row.run).toMatchObject({ startedAt: 100, startedBeforeObservation: false })
    expect(controller.recent('parent')).toEqual([])
    h.emit('session.retry.scheduled', { sessionID: 'child', attempt: 1, at: 500, error: { message: 'retry' } })
    expect(controller.list('parent')[0].run).toBe(row.run)
    await controller.refresh('parent')
    expect(controller.list('parent')[0].run).toBe(row.run)
    h.setState('sessions', 1, 'time', { ...h.state.sessions[1].time, busy: 700 })
    h.emit('session.execution.started', { sessionID: 'child' })
    expect(controller.list('parent')[0].run?.startedAt).toBe(700)
    h.setState('running', false)
    h.emit('session.execution.interrupted', { sessionID: 'child' })
    expect(controller.list('parent')).toEqual([])
    expect(controller.recent('parent')[0].run).toMatchObject({ startedAt: 700, outcome: 'cancelled' })
    expect(sources.subagents.startedAt?.('child')).toBeUndefined()
    h.setState('running', true)
    h.setState('sessions', 1, 'time', { ...h.state.sessions[1].time, idle: 800 })
    expect(sources.subagents.startedAt?.('child')).toBeUndefined()
    h.setState('sessions', 1, 'time', { ...h.state.sessions[1].time, busy: 900 })
    h.emit('session.execution.started', { sessionID: 'child' })
    expect(controller.list('parent')[0].run?.startedAt).toBe(900)
    expect(h.calls.some(([name]) => name === 'transcript')).toBe(false)
  } finally {
    leave()
    await h.dispose()
  }
})

test('an execution event during native refresh retains its captured start instead of newer cached metadata', async () => {
  const h = nativeHostFixture({ childTime: { busy: 100 } })
  const native = createOpenCodeV2Sources(h.context, h.api).subagents
  let finish!: () => void
  const controller = createSubagentController(h.api, {
    now: () => 1000,
    source: {
      ...native,
      refresh: () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    },
  })
  const leave = controller.activate('parent')

  try {
    const refreshing = controller.refresh('parent')

    h.emit('session.execution.started', { sessionID: 'child' })
    h.setState('sessions', 1, 'time', { ...h.state.sessions[1].time, busy: 800 })
    finish()
    await refreshing
    expect(controller.list('parent')[0].run?.startedAt).toBe(100)
    h.emit('session.execution.started', { sessionID: 'child' })
    expect(controller.list('parent')[0].run?.startedAt).toBe(800)
  } finally {
    leave()
    await h.dispose()
  }
})

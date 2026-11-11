import { expect, test } from 'bun:test'

import { createOpenCodeV2Sources } from '../src/app/opencode-v2'
import { buildSubagentView, createSubagentHistory } from '../src/entities/subagent/model'
import { buildTodoView } from '../src/entities/todo/model'
import { locationTarget, sessionTarget } from '../src/shared/lib/location/identity'

import { nativeHostFixture } from './fixtures/native-host'

test('server-aware identity separates matching paths/sessions without retaining host credentials', () => {
  const base = {
    serverID: 'server-a',
    directory: '/synthetic/project',
    sessionID: 'same',
    password: crypto.randomUUID(),
  }
  const first = sessionTarget(base)!
  const remote = sessionTarget({ ...base, serverID: 'server-b' })!
  const worktree = sessionTarget({ ...base, workspace: 'other' })!

  expect(first.sessionKey).not.toBe(remote.sessionKey)
  expect(first.sessionKey).not.toBe(worktree.sessionKey)
  expect(first).not.toHaveProperty('password')
  expect(JSON.stringify(first)).not.toContain(base.password)
  expect(locationTarget({ serverID: '', directory: '/synthetic' })).toBeUndefined()
  expect(locationTarget({ serverID: 'server', directory: '' })).toBeUndefined()
  expect(sessionTarget({ ...base, sessionID: '' })).toBeUndefined()
})

test('real native host sources satisfy headless Skill, MCP and Subagent contracts', async () => {
  const host = nativeHostFixture({ childTime: { busy: 100 } })
  const sources = createOpenCodeV2Sources(host.context, host.api)
  const target = { key: 'synthetic', routing: { directory: '/synthetic' } }
  const lifecycle = new AbortController()

  try {
    const skills = await sources.skills.refresh(target, false, lifecycle.signal)

    expect(skills.map((skill) => [skill.id, skill.location])).toEqual([
      ['skill-a', '/synthetic/a'],
      ['skill-b', '/synthetic/b'],
    ])
    expect(sources.mcp.list(target)[0]).toMatchObject({ name: 'docs', status: 'connected' })
    await sources.subagents.refresh('parent', lifecycle.signal)
    const child = sources.subagents.list('parent')[0]
    const history = createSubagentHistory()

    history.observeStatus(
      'synthetic',
      child.id,
      sources.subagents.status(child.id),
      1000,
      sources.subagents.startedAt?.(child.id),
    )
    const rows = buildSubagentView(
      [{ session: child, status: sources.subagents.status(child.id), run: history.active('synthetic', child.id) }],
      [],
    )

    expect(rows[0].session.id).toBe('child')
    expect(rows[0].run?.startedAt).toBe(100)
    expect(buildTodoView([{ content: 'Synthetic native task', status: 'in_progress' }], 'active').counts.active).toBe(1)
  } finally {
    await host.dispose()
  }
})

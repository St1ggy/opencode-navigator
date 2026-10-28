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
  await expect(skills.use(target, selected.name, { ...selected, id: 'skill-b' })).rejects.toThrow('target changed')
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

import { expect, test } from 'bun:test'

import { DEFAULT_SECTION_EXPANSION } from '../src/constants'
import { layoutPresetPreview, mcpPresetPreview } from '../src/preset-preview'
import { SIDEBAR_SECTIONS, parseSectionVisibility } from '../src/state'

test('layout preview merges partial presets and describes the exact applied layout', () => {
  const current = {
    sections: parseSectionVisibility(undefined),
    expanded: { ...DEFAULT_SECTION_EXPANSION },
    order: [...SIDEBAR_SECTIONS],
  }
  const before = structuredClone(current)
  const result = layoutPresetPreview(current, {
    sections: { mcp: false },
    expanded: { skills: true },
    order: ['skills'],
  })

  expect(result.next.order).toEqual(['skills', ...SIDEBAR_SECTIONS.filter((section) => section !== 'skills')])
  expect(result.next.sections).toEqual({ ...current.sections, mcp: false })
  expect(result.next.expanded).toEqual({ ...current.expanded, skills: true })
  expect(result.rows.find((row) => row.section === 'mcp')?.visibility).toEqual([true, false])
  expect(result.rows.find((row) => row.section === 'skills')?.expansion).toEqual([false, true])
  expect(result.rows.find((row) => row.section === 'skills')?.position).toEqual([3, 1])
  expect(current).toEqual(before)
  const same = layoutPresetPreview(current, current)

  expect(same.next).toEqual(current)
  expect(
    same.rows.every(
      (row) =>
        row.visibility[0] === row.visibility[1] &&
        row.expansion[0] === row.expansion[1] &&
        row.position[0] === row.position[1],
    ),
  ).toBe(true)
  expect(() => layoutPresetPreview(current, { sections: {}, expanded: {} })).toThrow('Invalid layout preset')
})

test('MCP preview separates changes, omitted servers, missing servers and unavailable states', () => {
  const items = [
    { name: 'on', status: 'connected' },
    { name: 'off', status: 'disabled' },
    { name: 'already', status: 'connected' },
    { name: 'failed', status: 'failed' },
    { name: 'unavailable', status: 'pending' },
    { name: 'constructor', status: 'connected' },
  ]
  const result = mcpPresetPreview(items, {
    on: 'disabled',
    off: 'enabled',
    already: 'enabled',
    failed: 'enabled',
    unavailable: 'disabled',
    missing: 'enabled',
  })

  expect(result.changes).toEqual([
    { name: 'failed', action: 'connect' },
    { name: 'off', action: 'connect' },
    { name: 'on', action: 'disconnect' },
  ])
  expect(result.rows.find((row) => row.name === 'constructor')).toMatchObject({
    desired: undefined,
    change: 'unchanged',
  })
  expect(result.rows.find((row) => row.name === 'already')?.change).toBe('unchanged')
  expect(result.rows.find((row) => row.name === 'unavailable')?.change).toBe('unavailable')
  expect(result.rows.find((row) => row.name === 'missing')?.change).toBe('missing')
  expect(mcpPresetPreview(items, {}).changes).toEqual([])
})

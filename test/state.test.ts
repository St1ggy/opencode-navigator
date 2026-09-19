import { describe, expect, test } from 'bun:test'

import { mcpToggleAction, parseSectionVisibility } from '../src/state'

describe('section visibility', () => {
  test('shows every section by default', () => {
    expect(parseSectionVisibility(undefined)).toEqual({
      todo: true,
      subagents: true,
      skills: true,
      quick_actions: true,
      lsp: true,
      mcp: true,
    })
  })

  test('accepts boolean overrides and ignores invalid values', () => {
    expect(parseSectionVisibility({ todo: false, skills: 'no', mcp: false })).toEqual({
      todo: false,
      subagents: true,
      skills: true,
      quick_actions: true,
      lsp: true,
      mcp: false,
    })
  })
})

describe('MCP toggle action', () => {
  test('disconnects connected servers', () => {
    expect(mcpToggleAction('connected')).toBe('disconnect')
  })

  test('connects disabled and recoverable servers', () => {
    expect(mcpToggleAction('disabled')).toBe('connect')
    expect(mcpToggleAction('failed')).toBe('connect')
    expect(mcpToggleAction('needs_auth')).toBe('connect')
  })

  test('ignores pending servers', () => {
    expect(mcpToggleAction('pending')).toBeUndefined()
  })
})

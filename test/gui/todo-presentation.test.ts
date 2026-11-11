import { expect, test } from 'bun:test'

import { todoPresentation } from '../../src/pages/navigator/ui/gui/todo-presentation'

test('completed and cancelled Todo content follows native muted strikethrough semantics', () => {
  for (const status of ['completed', 'cancelled'] as const) {
    expect(todoPresentation(status).decoration).toBe('line-through')
    expect(todoPresentation(status).text).toBe('var(--v2-text-text-faint)')
  }
  expect(todoPresentation('completed').icon).toBe('var(--v2-icon-icon-muted)')
  expect(todoPresentation('cancelled').icon).toBe('var(--v2-icon-icon-faint)')
})

test('pending and running Todo remain distinct without strikethrough', () => {
  expect(todoPresentation('pending').decoration).toBe('none')
  expect(todoPresentation('pending').text).toBe('var(--v2-text-text-muted)')
  expect(todoPresentation('in_progress').decoration).toBe('none')
  expect(todoPresentation('in_progress').text).toBe('var(--v2-text-text-base)')
  expect(todoPresentation('in_progress').icon).toBe('var(--v2-state-fg-warning)')
})

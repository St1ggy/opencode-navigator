import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createSidebarStartup } from '../../src/pages/navigator/model'
import { SIDEBAR_SECTIONS } from '../../src/shared/config'

import type { SidebarSection } from '../../src/shared/config'

function fixture(ready = true) {
  return createRoot((dispose) => {
    const [isReady, setReady] = createSignal(ready)
    const [expanded, setExpanded] = createSignal(
      Object.fromEntries(SIDEBAR_SECTIONS.map((id) => [id, true])) as Record<SidebarSection, boolean>,
    )
    const [visible, setVisible] = createSignal(expanded())
    const [placement, setPlacement] = createSignal<'mcp' | 'section'>('section')
    const startup = createSidebarStartup({
      ready: isReady,
      expanded,
      sections: visible,
      codeModePlacement: placement,
    })

    return { dispose, startup, setReady, setExpanded, setVisible, setPlacement }
  })
}

test('startup masks every initially visible expanded section only until completion', () => {
  const root = fixture()

  try {
    for (const id of SIDEBAR_SECTIONS) expect(root.startup.loading(id)).toBe(true)
    root.startup.complete()
    for (const id of SIDEBAR_SECTIONS) expect(root.startup.loading(id)).toBe(false)
    root.setExpanded((value) => ({ ...value }))
    expect(root.startup.loading('todo')).toBe(false)
  } finally {
    root.dispose()
  }
})

test('preferences load once before the initial open set is captured; later expansion does not add masks', () => {
  const root = fixture(false)

  try {
    root.setExpanded((value) => ({ ...value, skills: false }))
    root.setVisible((value) => ({ ...value, subagents: false }))
    expect(root.startup.loading('todo')).toBe(true)
    root.setReady(true)
    expect(root.startup.loading('todo')).toBe(true)
    expect(root.startup.loading('skills')).toBe(false)
    expect(root.startup.loading('subagents')).toBe(false)
    root.setExpanded((value) => ({ ...value, skills: true }))
    root.setVisible((value) => ({ ...value, subagents: true }))
    expect(root.startup.loading('skills')).toBe(false)
    expect(root.startup.loading('subagents')).toBe(false)
  } finally {
    root.dispose()
  }
})

test('inline Code Mode is not initially open under a collapsed MCP section', () => {
  const root = fixture(false)

  try {
    root.setPlacement('mcp')
    root.setExpanded((value) => ({ ...value, mcp: false }))
    root.setReady(true)
    expect(root.startup.loading('code_mode')).toBe(false)
  } finally {
    root.dispose()
  }
})

test('a failed startup can finish before preferences arrive without starting another loading phase', () => {
  const root = fixture(false)

  try {
    root.startup.complete()
    root.setReady(true)
    expect(root.startup.loading('todo')).toBe(false)
    root.startup.complete()
    expect(root.startup.loading('todo')).toBe(false)
  } finally {
    root.dispose()
  }
})

test('only the first runtime can claim startup; later sessions and placements cannot restart it', () => {
  const root = fixture()

  try {
    const initial = root.startup.claim()

    expect(initial?.loading('mcp')).toBe(true)
    expect(root.startup.claim()).toBeUndefined()
    initial?.complete()
    expect(root.startup.claim()).toBeUndefined()
    expect(initial?.loading('mcp')).toBe(false)
  } finally {
    root.dispose()
  }
})

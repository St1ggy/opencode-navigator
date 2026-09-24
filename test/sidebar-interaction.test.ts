import { type RGBA, type Renderable, ScrollBoxRenderable } from '@opentui/core'
import { expect, test } from 'bun:test'

import { createSidebarInteraction, isEffectivelyVisible, sidebarInteractiveColors } from '../src/pages/session-sidebar'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function testApi() {
  const layers: Record<string, unknown>[] = []
  const dispatched: { command: string; options?: unknown }[] = []
  const renderer = {
    currentFocusedRenderable: null as Renderable | null,
    on: () => renderer,
    off: () => renderer,
  }
  const api = {
    renderer,
    route: { current: { name: 'session', params: { sessionID: 'session' } } },
    keymap: {
      registerLayer(layer: Record<string, unknown>) {
        layers.push(layer)

        return () => {}
      },
      dispatchCommand(command: string, options?: unknown) {
        dispatched.push({ command, options })

        return { ok: true as const }
      },
    },
    ui: { dialog: { replace: () => {}, setSize: () => {} } },
  } as unknown as TuiPluginApi

  return { api, renderer, layers, dispatched }
}

function renderable(
  renderer: { currentFocusedRenderable: Renderable | null },
  id: string,
  parent: Renderable | null = null,
) {
  const value = {
    id,
    parent,
    visible: true,
    isDestroyed: false,
    focused: false,
    focus() {
      const previous = renderer.currentFocusedRenderable as unknown as { focused: boolean } | null

      if (previous) previous.focused = false

      value.focused = true
      renderer.currentFocusedRenderable = value as unknown as Renderable
    },
    blur() {
      value.focused = false

      if (renderer.currentFocusedRenderable === (value as unknown as Renderable))
        renderer.currentFocusedRenderable = null
    },
  }

  return value as unknown as Renderable
}

test('interaction orders rows, wraps vertically, activates, blocks disabled items, and falls back after unmount', () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const outside = renderable(renderer, 'outside', renderable(renderer, 'app'))
  const root = renderable(renderer, 'sidebar', renderable(renderer, 'host'))
  const actions: string[] = []

  interaction.setContentRoot(root)
  const unregisterB = interaction.register({
    id: 'b',
    position: { section: 1, row: 2, column: 0 },
    renderable: renderable(renderer, 'b', root),
    activate: () => actions.push('b'),
  })

  interaction.register({
    id: 'a',
    position: { section: 1, row: 1, column: 0 },
    renderable: renderable(renderer, 'a', root),
    activate: () => actions.push('a'),
  })
  interaction.register({
    id: 'disabled',
    position: { section: 1, row: 3, column: 0 },
    renderable: renderable(renderer, 'disabled', root),
    disabled: () => true,
    activate: () => actions.push('disabled'),
  })

  outside.focus()
  interaction.focus(outside)
  expect(interaction.selectedId()).toBe('a')
  interaction.move(-1)
  expect(interaction.selectedId()).toBe('disabled')
  expect(interaction.activate()).toBe(false)
  interaction.move(1)
  interaction.move(1)
  expect(interaction.selectedId()).toBe('b')
  expect(interaction.activate()).toBe(true)
  expect(actions).toEqual(['b'])

  unregisterB()
  expect(interaction.selectedId()).toBe('disabled')
  expect(interaction.leave()).toBe(true)
  expect(renderer.currentFocusedRenderable).toBe(outside)
})

test('interaction reevaluates dynamic positions after a section move', () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const root = renderable(renderer, 'sidebar', renderable(renderer, 'host'))
  let firstSection = 1
  let secondSection = 2

  interaction.setContentRoot(root)
  interaction.register({
    id: 'first-row',
    position: () => ({ section: firstSection, row: 0, column: 0 }),
    renderable: renderable(renderer, 'first-row', root),
    activate: () => {},
  })
  interaction.register({
    id: 'second-row',
    position: () => ({ section: secondSection, row: 0, column: 0 }),
    renderable: renderable(renderer, 'second-row', root),
    activate: () => {},
  })

  expect(interaction.available().map((item) => item.id)).toEqual(['first-row', 'second-row'])
  firstSection = 2
  secondSection = 1
  expect(interaction.available().map((item) => item.id)).toEqual(['second-row', 'first-row'])
})

test('500 rows and their controls stay inside their navigation section', () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  let section = 1

  for (let index = 0; index < 500; index++) {
    for (const [suffix, column] of [
      ['', 0],
      ['.star', 1],
    ] as const) {
      const id = `row-${index}${suffix}`

      interaction.register({
        id,
        position: () => ({ section, row: 10 + index, column }),
        renderable: renderable(renderer, id),
        activate() {},
      })
    }
  }
  interaction.register({
    id: 'next-section',
    position: { section: 2, row: 0, column: 0 },
    renderable: renderable(renderer, 'next'),
    activate() {},
  })
  const ids = interaction.available().map((item) => item.id)

  expect(ids.slice(0, 2)).toEqual(['row-0', 'row-0.star'])
  expect(ids.slice(-3)).toEqual(['row-499', 'row-499.star', 'next-section'])
  section = 3
  expect(interaction.available()[0].id).toBe('next-section')
  interaction.dispose()
})

test('horizontal movement stays on a row and vertical movement preserves the nearest column', () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)

  for (const [id, row, column] of [
    ['first-main', 1, 0],
    ['first-favorite', 1, 2],
    ['second-main', 2, 0],
    ['second-details', 2, 1],
    ['third-main', 3, 0],
    ['third-favorite', 3, 2],
  ] as const) {
    interaction.register({
      id,
      position: { section: 1, row, column },
      renderable: renderable(renderer, id),
      activate() {},
    })
  }

  interaction.select('first-favorite')
  interaction.move(1)
  expect(interaction.selectedId()).toBe('second-details')
  interaction.move(1)
  expect(interaction.selectedId()).toBe('third-favorite')
  interaction.moveHorizontal(1)
  expect(interaction.selectedId()).toBe('third-main')
  interaction.moveHorizontal(-1)
  expect(interaction.selectedId()).toBe('third-favorite')
})

test('interaction defers hidden focus, supports direct sections, and passes return context to commands', async () => {
  const { api, renderer, dispatched } = testApi()
  const interaction = createSidebarInteraction(api)
  const host = renderable(renderer, 'host')
  const outside = renderable(renderer, 'outside', host)
  const root = renderable(renderer, 'sidebar', host)

  ;(root as unknown as { visible: boolean }).visible = false
  interaction.setContentRoot(root)
  interaction.register({
    id: 'opencode-navigator.section.skills',
    position: { section: 3, row: 0, column: 0 },
    renderable: renderable(renderer, 'skills', root),
    activate: () => {},
  })

  outside.focus()
  expect(interaction.focusSection('skills', outside)).toBe(false)
  expect(interaction.pendingFocus()).toBe(true)
  expect(dispatched[0].command).toBe('session.sidebar.toggle')
  ;(root as unknown as { visible: boolean }).visible = true
  expect(interaction.fulfillPendingFocus()).toBe(true)
  expect(interaction.selectedId()).toBe('opencode-navigator.section.skills')

  const todo = renderable(renderer, 'todo', root)

  interaction.register({
    id: 'opencode-navigator.section.todo',
    position: { section: 1, row: 0, column: 0 },
    renderable: todo,
    activate: () => {},
  })
  const direct = interaction.baseCommands().find((command) => command.name.endsWith('.focus.todo'))

  direct?.run()
  await Bun.sleep(60)
  expect(interaction.selectedId()).toBe('opencode-navigator.section.todo')

  ;(todo as unknown as { visible: boolean }).visible = false
  interaction.focusSection('todo', outside)
  expect(interaction.selectedId()).toBe('opencode-navigator.section.skills')

  interaction.dispatchFromReturnTarget('session.rename')
  expect(dispatched.at(-1)).toEqual({
    command: 'session.rename',
    options: { focused: outside, target: outside },
  })
})

test('selection scrolls through the nearest ScrollBox ancestor', () => {
  const { api, renderer } = testApi()
  const interaction = createSidebarInteraction(api)
  const calls: string[] = []
  const scroll = {
    id: 'scroll',
    parent: null,
    visible: true,
    isDestroyed: false,
    scrollChildIntoView: (id: string) => calls.push(id),
  } as unknown as Renderable

  Object.setPrototypeOf(scroll, ScrollBoxRenderable.prototype)
  const row = renderable(renderer, 'row', scroll)

  interaction.register({
    id: 'row',
    position: { section: 1, row: 0, column: 0 },
    renderable: row,
    activate: () => {},
  })

  expect(interaction.select('row')).toBe(true)
  expect(calls).toEqual(['row'])
  ;(scroll as unknown as { visible: boolean }).visible = false
  expect(isEffectivelyVisible(row)).toBe(false)
})

test('shared interactive colors prioritize enabled focus, hover, and disabled muting', () => {
  const primary = {} as RGBA
  const selected = {} as RGBA
  const hover = {} as RGBA
  const panel = {} as RGBA
  const text = {} as RGBA
  const muted = {} as RGBA
  const theme = {
    primary,
    selectedListItemText: selected,
    backgroundElement: hover,
    backgroundPanel: panel,
    text,
    textMuted: muted,
  } as unknown as TuiPluginApi['theme']['current']

  expect(sidebarInteractiveColors(theme, { focused: true, hovered: true, disabled: false })).toEqual({
    backgroundColor: primary,
    foregroundColor: selected,
  })
  expect(sidebarInteractiveColors(theme, { focused: false, hovered: true, disabled: false })).toEqual({
    backgroundColor: hover,
    foregroundColor: text,
  })
  expect(sidebarInteractiveColors(theme, { focused: true, hovered: false, disabled: true })).toEqual({
    backgroundColor: hover,
    foregroundColor: muted,
  })
  expect(sidebarInteractiveColors(theme, { focused: false, hovered: false, disabled: false }, text, 'control')).toEqual(
    {
      backgroundColor: 'transparent',
      foregroundColor: text,
    },
  )
  expect(sidebarInteractiveColors(theme, { focused: false, hovered: true, disabled: false }, text, 'control')).toEqual({
    backgroundColor: primary,
    foregroundColor: selected,
  })
  expect(sidebarInteractiveColors(theme, { focused: false, hovered: true, disabled: true }, text, 'control')).toEqual({
    backgroundColor: 'transparent',
    foregroundColor: muted,
  })
})

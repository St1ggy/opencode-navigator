/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'
import { createComponent } from 'solid-js'

import { createNativeTodoController } from '../src/app/opencode-v2/native-todo-controller'
import { NativeTodoSetupDialog, createTodoSetupController } from '../src/features/native-todo-setup'
import { EnableTodoConfirmation } from '../src/features/native-todo-setup/ui/enable-confirmation'
import { TodoSection, createSidebarInteraction } from '../src/pages/session-sidebar'
import { createDialogStack } from '../src/shared/ui'

import { todoSetupFixture } from './fixtures/todo-setup'
import { toolbarHarness } from './fixtures/toolbar-harness'

import type { TodoController } from '../src/entities/todo'
import type { SidebarInteraction } from '../src/pages/session-sidebar/model/sidebar-interaction'
import type { BoxRenderable } from '@opentui/core'

async function harness(enabled = false) {
  const fixture = todoSetupFixture()

  if (enabled) fixture.changeText(fixture.text().replace('false', 'true'))

  let interaction!: SidebarInteraction
  const h = await toolbarHarness((api, preferences) => {
    const expandedPreferences = { ...preferences, expanded: () => ({ ...preferences.expanded(), todo: true }) }

    interaction = createSidebarInteraction(api, () => {})
    const controller = {
      source: 'native',
      target: (sessionID: string) => ({ key: sessionID, sessionID, routing: { directory: '/synthetic' } }),
      list: () => [],
      refresh: async () => [],
      retry: async () => [],
      state: () => ({ status: 'ready' }),
      setup: {
        state: fixture.model.state,
        refresh: fixture.model.refresh,
        configure(sessionID: string) {
          createDialogStack(api, preferences.lspIconStyle, () => true, preferences.cornerFont).open(() => (
            <NativeTodoSetupDialog api={api} model={fixture.model} sessionID={sessionID} />
          ))
        },
      },
    } as unknown as TodoController

    return (
      <box ref={interaction.setContentRoot} focusable>
        <TodoSection
          api={api}
          preferences={expandedPreferences}
          controller={controller}
          sessionID="session"
          interaction={interaction}
        />
      </box>
    )
  })

  return {
    ...h,
    fixture,
    interaction,
    dispose() {
      interaction.dispose()
      fixture.lifecycle.abort()
      h.renderer.destroy()
    },
  }
}

test('disabled native Todo offers mouse enablement with a source preview and Cancel preserves configuration', async () => {
  const h = await harness()

  try {
    await h.wait('Enable Todo')
    expect(h.captureCharFrame()).toContain('is disabled')
    await h.click('Enable Todo')
    await h.wait('Choose Todo configuration')
    await h.click(h.fixture.path)
    await h.wait('experimental.todo')
    expect(h.fixture.writes).toEqual([])
    h.mockInput.pressEnter()
    await h.wait('Choose Todo configuration')
    expect(h.fixture.writes).toEqual([])
    h.mockInput.pressEscape()
    await h.wait('Enable Todo')
  } finally {
    h.dispose()
  }
})

test('native Todo enablement works through sidebar and dialog keyboard navigation only after explicit confirmation', async () => {
  const h = await harness()

  try {
    await h.wait('Enable Todo')
    h.interaction.focus()
    h.interaction.select('opencode-navigator.todo.setup')
    h.mockInput.pressEnter()
    await h.wait('Choose Todo configuration')
    h.mockInput.pressEnter()
    await h.wait('experimental.todo')
    h.mockInput.pressArrow('right')
    h.mockInput.pressEnter()
    for (let attempt = 0; attempt < 60 && !h.fixture.model.state('session').enabled; attempt++) {
      await h.flush()
      await Bun.sleep(5)
    }
    await h.flush()
    expect(h.fixture.writes).toHaveLength(1)
    expect(h.fixture.model.state('session').enabled).toBe(true)
    expect(h.captureCharFrame()).not.toContain('Enable Todo')
    expect(h.toasts).toContainEqual(expect.objectContaining({ title: 'Native Todo enabled' }))
  } finally {
    h.dispose()
  }
})

test('enabled empty native Todo stays empty without an enable action or version-specific setup text', async () => {
  const h = await harness(true)

  try {
    await h.wait('No tasks yet')
    expect(h.captureCharFrame()).toContain('0/0')
    expect(h.captureCharFrame()).not.toContain('Enable Todo')
    expect(h.captureCharFrame()).not.toContain('OpenCode 2.1')
    expect(h.fixture.writes).toEqual([])
  } finally {
    h.dispose()
  }
})

test('native Todo read failure offers a working retry instead of inferring enablement from an empty list', async () => {
  const h = await harness()

  try {
    h.fixture.failRead(true)
    await h.fixture.model.refresh('session')
    await h.wait('Retry Todo configuration')
    expect(h.captureCharFrame()).not.toContain('is disabled')
    h.fixture.failRead(false)
    await h.click('Retry Todo configuration')
    await h.wait('Enable Todo')
    expect(h.fixture.writes).toEqual([])
  } finally {
    h.dispose()
  }
})

test('native Todo confirmation bounds long server paths and keeps actions visible in a short terminal', async () => {
  const h = await toolbarHarness(() => <box height={6} />, 48)
  const fixture = todoSetupFixture()

  try {
    h.renderer.resize(48, 18)
    const path = `/synthetic/${'long-directory/'.repeat(8)}opencode.jsonc`

    fixture.changeEntries([{ path, experimental: { todo: false } }])
    const preview = await fixture.model.prepare('session', path)

    createDialogStack(h.api).open(() => <EnableTodoConfirmation api={h.api} model={fixture.model} preview={preview} />)
    await h.wait('Enable native Todo')
    const actions = h.renderer.root.findDescendantById('opencode-navigator.todo.enable.actions') as BoxRenderable

    expect(actions.screenY + actions.height).toBeLessThanOrEqual(18)
    expect(actions.screenX + actions.width).toBeLessThanOrEqual(48)
    expect(h.captureCharFrame()).toContain('Cancel')
    expect(h.captureCharFrame()).toContain('Enable Todo')
    expect(fixture.writes).toEqual([])
  } finally {
    fixture.lifecycle.abort()
    h.renderer.destroy()
  }
})

test('release fixture mounts the real Todo picker and preview instead of an empty modal surface', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const { createNativeTodoScene } = await import(
    new URL('../screenshots/harness/native-todo-scenes.mjs', import.meta.url).href
  )

  try {
    const fixture = createNativeTodoScene(h.api, 'native-todo-file-picker', {
      createTodoSetupController,
      NativeTodoSetupDialog,
      createDialogStack,
      createNativeTodoController,
      createComponent: (
        component: typeof NativeTodoSetupDialog,
        props: Parameters<typeof NativeTodoSetupDialog>[0],
      ) => {
        const view = createComponent(component, props)

        expect(typeof view).not.toBe('function')

        return view
      },
    })

    fixture.controller('session')
    fixture.open(() => {})
    await h.wait('Choose Todo configuration')
    h.mockInput.pressEnter()
    await h.wait('experimental.todo')
    expect(h.captureCharFrame()).toContain('Enable Todo')
    expect(h.captureCharFrame()).toContain('Cancel')
  } finally {
    h.renderer.destroy()
  }
})

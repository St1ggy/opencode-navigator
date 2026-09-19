import { type MouseEvent, type Renderable, ScrollBoxRenderable } from '@opentui/core'
import { createSignal } from 'solid-js'

import { FOCUS_COMMAND, PLUGIN_ID } from './constants'
import { openKeyboardHelp } from './dialogs/keyboard-help'

import type { SidebarSection } from './state'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type SidebarOrder = number | readonly [section: number, item: number]

export function offsetSidebarOrder(value: SidebarOrder, offset: number): SidebarOrder {
  return typeof value === 'number' ? [value, offset] : [value[0], value[1] + offset]
}

export type SidebarNavigationDescriptor = {
  id: string
  order: SidebarOrder | (() => SidebarOrder)
  renderable: Renderable
  activate: () => void
  disabled?: () => boolean
}

function order(descriptor: SidebarNavigationDescriptor) {
  const value = typeof descriptor.order === 'function' ? descriptor.order() : descriptor.order

  return typeof value === 'number' ? ([value, 0] as const) : value
}

const SECTION_COMMANDS: readonly { section: SidebarSection; title: string }[] = [
  { section: 'todo', title: 'Focus Todo' },
  { section: 'subagents', title: 'Focus Subagents' },
  { section: 'skills', title: 'Focus Skills' },
  { section: 'quick_actions', title: 'Focus Quick Actions' },
  { section: 'lsp', title: 'Focus LSP' },
  { section: 'mcp', title: 'Focus MCP' },
]

function belongsTo(renderable: Renderable | null | undefined, ancestor: Renderable | undefined) {
  if (!renderable || !ancestor) return false

  for (let current: Renderable | null = renderable; current; current = current.parent) {
    if (current === ancestor) return true
  }

  return false
}

export function isEffectivelyVisible(renderable: Renderable | null | undefined) {
  if (!renderable || renderable.isDestroyed) return false

  for (let current: Renderable | null = renderable; current; current = current.parent) {
    if (current.isDestroyed || !current.visible) return false
  }

  return true
}

export function createSidebarInteraction(api: TuiPluginApi, showHelp: () => void = () => openKeyboardHelp(api)) {
  const descriptors = new Map<string, SidebarNavigationDescriptor>()
  const [selectedId, setSelectedId] = createSignal<string>()
  const [focusWithin, setFocusWithin] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  let titleRoot: Renderable | undefined
  let contentRoot: Renderable | undefined
  let targetedRoot: Renderable | undefined
  let unregisterTargeted: (() => void) | undefined
  const filterLayers = new Set<() => void>()
  const focusTimers = new Set<ReturnType<typeof setTimeout>>()
  let savedReturnTarget: Renderable | undefined
  let isPendingFocus = false
  let pendingSelectionId: string | undefined
  let isDisposed = false

  function available() {
    revision()

    return [...descriptors.values()]
      .filter((descriptor) => isEffectivelyVisible(descriptor.renderable))
      .sort(
        (left, right) =>
          order(left)[0] - order(right)[0] || order(left)[1] - order(right)[1] || left.id.localeCompare(right.id),
      )
  }

  function scrollIntoView(descriptor: SidebarNavigationDescriptor) {
    for (let parent = descriptor.renderable.parent; parent; parent = parent.parent) {
      if (!(parent instanceof ScrollBoxRenderable)) continue

      parent.scrollChildIntoView(descriptor.renderable.id)

      return
    }
  }

  function select(id: string) {
    const descriptor = descriptors.get(id)

    if (!descriptor || !isEffectivelyVisible(descriptor.renderable)) return false

    setSelectedId(id)
    scrollIntoView(descriptor)

    return true
  }

  function ensureSelection() {
    const current = selectedId()

    if (current && select(current)) return current

    const first = available()[0]

    setSelectedId(first?.id)

    if (first) scrollIntoView(first)

    return first?.id
  }

  function ownsFocus() {
    return focusWithin()
  }

  function syncFocus() {
    const focused = api.renderer.currentFocusedRenderable
    const isNext = belongsTo(focused, titleRoot) || belongsTo(focused, contentRoot)

    setFocusWithin(isNext)

    return isNext
  }

  const onFocusedRenderable = () => syncFocus()

  api.renderer.on('focused_renderable', onFocusedRenderable)

  function rememberReturnTarget(candidate: Renderable | null | undefined) {
    if (
      !candidate?.parent ||
      !isEffectivelyVisible(candidate) ||
      belongsTo(candidate, titleRoot) ||
      belongsTo(candidate, contentRoot)
    )
      return

    savedReturnTarget = candidate
  }

  function fulfillPendingFocus() {
    if (!isPendingFocus || !isEffectivelyVisible(contentRoot)) return false

    isPendingFocus = false
    contentRoot?.focus()
    syncFocus()

    if (!pendingSelectionId || !select(pendingSelectionId)) ensureSelection()

    pendingSelectionId = undefined

    return true
  }

  function focus(candidate?: Renderable | null, selection?: string) {
    rememberReturnTarget(candidate ?? api.renderer.currentFocusedRenderable)
    pendingSelectionId = selection

    if (isEffectivelyVisible(contentRoot)) {
      contentRoot?.focus()
      syncFocus()

      if (!selection || !select(selection)) ensureSelection()

      pendingSelectionId = undefined
      isPendingFocus = false

      return true
    }

    const shouldToggle = !isPendingFocus

    isPendingFocus = true

    if (shouldToggle) api.keymap.dispatchCommand('session.sidebar.toggle')

    queueMicrotask(fulfillPendingFocus)

    return false
  }

  function move(offset: number) {
    const items = available()

    if (items.length === 0) return

    const index = items.findIndex((descriptor) => descriptor.id === selectedId())
    const initial = offset > 0 ? 0 : items.length - 1
    const next = index === -1 ? initial : (index + offset + items.length) % items.length

    select(items[next].id)
  }

  function activate() {
    const id = ensureSelection()

    if (!id) return false

    const descriptor = descriptors.get(id)

    if (!descriptor || descriptor.disabled?.()) return false

    descriptor.activate()

    return true
  }

  function leave() {
    isPendingFocus = false
    pendingSelectionId = undefined

    if (savedReturnTarget?.parent && isEffectivelyVisible(savedReturnTarget)) {
      savedReturnTarget.focus()
      syncFocus()

      return true
    }

    const focused = api.renderer.currentFocusedRenderable

    if (belongsTo(focused, titleRoot) || belongsTo(focused, contentRoot)) focused?.blur()
    else contentRoot?.blur()

    syncFocus()

    return false
  }

  function focusFilter(input: Renderable) {
    input.focus()
    syncFocus()
  }

  function leaveFilter(input: Renderable) {
    input.blur()

    if (isEffectivelyVisible(contentRoot)) contentRoot?.focus()

    syncFocus()
  }

  function registerFilter(input: Renderable, id: string, onLeave: () => void) {
    let unregister: (() => void) | undefined
    let isActive = true

    queueMicrotask(() => {
      if (!isActive || isDisposed || input.isDestroyed) return

      const command = `${id}.leave-filter`

      unregister = api.keymap.registerLayer({
        target: input,
        targetMode: 'focus',
        priority: 200,
        commands: [{ name: command, run: onLeave }],
        bindings: [{ key: 'escape', cmd: command }],
      })
      filterLayers.add(unregister)
    })

    return () => {
      isActive = false
      queueMicrotask(() => {
        if (!unregister) return

        unregister()
        filterLayers.delete(unregister)
      })
    }
  }

  function focusSection(section: SidebarSection, candidate?: Renderable | null) {
    return focus(candidate, `${PLUGIN_ID}.section.${section}`)
  }

  function deferFocus(section?: SidebarSection) {
    const timer = setTimeout(() => {
      focusTimers.delete(timer)

      if (isDisposed) return

      if (section) focusSection(section)
      else focus()
    }, 50)

    focusTimers.add(timer)
  }

  function dispatchFromReturnTarget(command: string) {
    const target = savedReturnTarget?.parent && isEffectivelyVisible(savedReturnTarget) ? savedReturnTarget : null

    return api.keymap.dispatchCommand(command, { focused: target, target })
  }

  function register(descriptor: SidebarNavigationDescriptor) {
    descriptors.set(descriptor.id, descriptor)
    setRevision((value) => value + 1)

    if (pendingSelectionId === descriptor.id && ownsFocus()) select(descriptor.id)

    return () => {
      const before = available()
      const index = before.findIndex((item) => item.id === descriptor.id)

      if (descriptors.get(descriptor.id) !== descriptor) return

      descriptors.delete(descriptor.id)
      setRevision((value) => value + 1)

      if (selectedId() !== descriptor.id) return

      const after = available()
      const fallback = after[Math.min(Math.max(index, 0), after.length - 1)]

      setSelectedId(fallback?.id)

      if (fallback && ownsFocus()) scrollIntoView(fallback)
    }
  }

  function installTargetedLayer(root: Renderable) {
    if (isDisposed || contentRoot !== root || root.isDestroyed || targetedRoot === root) return

    unregisterTargeted?.()
    targetedRoot = root
    unregisterTargeted = api.keymap.registerLayer({
      target: root,
      targetMode: 'focus',
      priority: 100,
      commands: [
        { name: `${PLUGIN_ID}.navigation.previous`, run: () => move(-1) },
        { name: `${PLUGIN_ID}.navigation.next`, run: () => move(1) },
        { name: `${PLUGIN_ID}.navigation.activate`, run: activate },
        { name: `${PLUGIN_ID}.navigation.leave`, run: leave },
        { name: `${PLUGIN_ID}.navigation.help`, run: showHelp },
      ],
      bindings: [
        { key: 'up', cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: 'k', cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: 'down', cmd: `${PLUGIN_ID}.navigation.next` },
        { key: 'j', cmd: `${PLUGIN_ID}.navigation.next` },
        { key: 'return', cmd: `${PLUGIN_ID}.navigation.activate` },
        { key: 'escape', cmd: `${PLUGIN_ID}.navigation.leave` },
        { key: '?', cmd: `${PLUGIN_ID}.navigation.help` },
      ],
    })
  }

  function setContentRoot(root: Renderable | undefined) {
    contentRoot = root
    queueMicrotask(() => {
      if (root) installTargetedLayer(root)
      else if (targetedRoot && targetedRoot !== contentRoot) {
        unregisterTargeted?.()
        unregisterTargeted = undefined
        targetedRoot = undefined
      }

      fulfillPendingFocus()
    })
  }

  return {
    selectedId,
    savedReturnTarget: () => savedReturnTarget,
    pendingFocus: () => isPendingFocus,
    available,
    ownsFocus,
    syncFocus,
    isSelected: (id: string) => selectedId() === id,
    setTitleRoot(root: Renderable | undefined) {
      titleRoot = root
    },
    setContentRoot,
    register,
    select,
    focus,
    move,
    activate,
    leave,
    focusFilter,
    leaveFilter,
    registerFilter,
    focusSection,
    fulfillPendingFocus,
    dispatchFromReturnTarget,
    mouseSelect(id: string, event?: MouseEvent) {
      event?.preventDefault()
      select(id)
    },
    mouseActivate(id: string, event?: MouseEvent) {
      event?.preventDefault()

      if (!select(id)) return false

      return activate()
    },
    baseCommands() {
      return [
        {
          name: FOCUS_COMMAND,
          title: 'Focus sidebar',
          category: 'Navigator',
          namespace: 'palette',
          enabled: () => api.route.current.name === 'session' && !api.ui?.dialog?.open,
          run: () => deferFocus(),
        },
        ...SECTION_COMMANDS.map(({ section, title }) => ({
          name: `${PLUGIN_ID}.focus.${section}`,
          title,
          category: 'Navigator',
          namespace: 'palette',
          enabled: () => api.route.current.name === 'session' && !api.ui?.dialog?.open,
          run: () => deferFocus(section),
        })),
      ]
    },
    dispose() {
      isDisposed = true
      unregisterTargeted?.()
      for (const unregister of filterLayers) unregister()
      for (const timer of focusTimers) clearTimeout(timer)
      filterLayers.clear()
      focusTimers.clear()
      unregisterTargeted = undefined
      targetedRoot = undefined
      descriptors.clear()
      api.renderer.off('focused_renderable', onFocusedRenderable)
      setFocusWithin(false)
    },
  }
}

export type SidebarInteraction = ReturnType<typeof createSidebarInteraction>

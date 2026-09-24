import { type MouseEvent, type Renderable, ScrollBoxRenderable } from '@opentui/core'
import { createSignal } from 'solid-js'

import { openKeyboardHelp } from '../../../features/keyboard-help'
import { FOCUS_COMMAND, PLUGIN_ID } from '../../../shared/config'
import { supportsSidebarSection } from '../../../shared/lib/host-capabilities'

import type { SidebarSection } from '../../../entities/sidebar-layout'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export type SidebarPosition = {
  section: number
  row: number
  column: number
}

export type SidebarNavigationDescriptor = {
  id: string
  position: SidebarPosition | (() => SidebarPosition)
  renderable: Renderable
  activate: () => void
  disabled?: () => boolean
}

function position(descriptor: SidebarNavigationDescriptor) {
  return typeof descriptor.position === 'function' ? descriptor.position() : descriptor.position
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
  let preferredColumn: number | undefined
  let isDisposed = false

  function available() {
    revision()

    return [...descriptors.values()]
      .filter((descriptor) => isEffectivelyVisible(descriptor.renderable))
      .sort((left, right) => {
        const leftPosition = position(left)
        const rightPosition = position(right)

        return (
          leftPosition.section - rightPosition.section ||
          leftPosition.row - rightPosition.row ||
          leftPosition.column - rightPosition.column ||
          left.id.localeCompare(right.id)
        )
      })
  }

  function scrollIntoView(descriptor: SidebarNavigationDescriptor) {
    for (let parent = descriptor.renderable.parent; parent; parent = parent.parent) {
      if (!(parent instanceof ScrollBoxRenderable)) continue

      parent.scrollChildIntoView(descriptor.renderable.id)

      return
    }
  }

  function selectDescriptor(id: string, updatePreferredColumn: boolean) {
    const descriptor = descriptors.get(id)

    if (!descriptor || !isEffectivelyVisible(descriptor.renderable)) return false

    setSelectedId(id)

    if (updatePreferredColumn) preferredColumn = position(descriptor).column

    scrollIntoView(descriptor)

    return true
  }

  function select(id: string) {
    return selectDescriptor(id, true)
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

    const current = items.find((descriptor) => descriptor.id === selectedId())

    if (!current) {
      select(items[offset > 0 ? 0 : items.length - 1].id)

      return
    }

    const rows = items.filter((descriptor, index) => {
      if (index === 0) return true

      const currentPosition = position(descriptor)
      const previousPosition = position(items[index - 1])

      return currentPosition.section !== previousPosition.section || currentPosition.row !== previousPosition.row
    })
    const currentPosition = position(current)
    const rowIndex = rows.findIndex((descriptor) => {
      const candidate = position(descriptor)

      return candidate.section === currentPosition.section && candidate.row === currentPosition.row
    })
    const targetRow = position(rows[(rowIndex + offset + rows.length) % rows.length])
    const column = preferredColumn ?? currentPosition.column
    const next = items
      .filter((descriptor) => {
        const candidate = position(descriptor)

        return candidate.section === targetRow.section && candidate.row === targetRow.row
      })
      .sort((left, right) => {
        const leftColumn = position(left).column
        const rightColumn = position(right).column

        return Math.abs(leftColumn - column) - Math.abs(rightColumn - column) || leftColumn - rightColumn
      })[0]

    selectDescriptor(next.id, false)
  }

  function moveHorizontal(offset: number) {
    const items = available()

    if (items.length === 0) return

    const current = items.find((descriptor) => descriptor.id === selectedId())

    if (!current) {
      select(items[offset > 0 ? 0 : items.length - 1].id)

      return
    }

    const currentPosition = position(current)
    const row = items.filter((descriptor) => {
      const candidate = position(descriptor)

      return candidate.section === currentPosition.section && candidate.row === currentPosition.row
    })
    const index = row.findIndex((descriptor) => descriptor.id === current.id)
    const next = (index + offset + row.length) % row.length

    select(row[next].id)
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
        { name: `${PLUGIN_ID}.navigation.left`, run: () => moveHorizontal(-1) },
        { name: `${PLUGIN_ID}.navigation.right`, run: () => moveHorizontal(1) },
        { name: `${PLUGIN_ID}.navigation.activate`, run: activate },
        { name: `${PLUGIN_ID}.navigation.leave`, run: leave },
        { name: `${PLUGIN_ID}.navigation.help`, run: showHelp },
      ],
      bindings: [
        { key: 'up', cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: 'k', cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: 'down', cmd: `${PLUGIN_ID}.navigation.next` },
        { key: 'j', cmd: `${PLUGIN_ID}.navigation.next` },
        { key: 'left', cmd: `${PLUGIN_ID}.navigation.left` },
        { key: 'right', cmd: `${PLUGIN_ID}.navigation.right` },
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
    moveHorizontal,
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
        ...SECTION_COMMANDS.filter(({ section }) => supportsSidebarSection(api, section)).map(({ section, title }) => ({
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

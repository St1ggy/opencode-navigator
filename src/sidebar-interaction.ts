import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { ScrollBoxRenderable, type MouseEvent, type Renderable } from "@opentui/core"
import { createSignal } from "solid-js"
import { FOCUS_COMMAND, PLUGIN_ID } from "./constants"
import { openKeyboardHelp } from "./dialogs/keyboard-help"
import type { SidebarSection } from "./state"

export type SidebarNavigationDescriptor = {
  id: string
  order: number | (() => number)
  renderable: Renderable
  activate: () => void
  disabled?: () => boolean
}

function order(descriptor: SidebarNavigationDescriptor) {
  return typeof descriptor.order === "function" ? descriptor.order() : descriptor.order
}

const SECTION_COMMANDS: ReadonlyArray<{ section: SidebarSection; title: string }> = [
  { section: "todo", title: "Focus Todo" },
  { section: "subagents", title: "Focus Subagents" },
  { section: "skills", title: "Focus Skills" },
  { section: "quick_actions", title: "Focus Quick Actions" },
  { section: "lsp", title: "Focus LSP" },
  { section: "mcp", title: "Focus MCP" },
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

export function createSidebarInteraction(api: TuiPluginApi) {
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
  let pendingFocus = false
  let pendingSelectionId: string | undefined
  let disposed = false

  function available() {
    revision()
    return [...descriptors.values()]
      .filter((descriptor) => isEffectivelyVisible(descriptor.renderable))
      .sort((left, right) => order(left) - order(right) || left.id.localeCompare(right.id))
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
    const next = belongsTo(focused, titleRoot) || belongsTo(focused, contentRoot)
    setFocusWithin(next)
    return next
  }

  const onFocusedRenderable = () => syncFocus()
  api.renderer.on("focused_renderable", onFocusedRenderable)

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
    if (!pendingFocus || !isEffectivelyVisible(contentRoot)) return false
    pendingFocus = false
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
      pendingFocus = false
      return true
    }

    const shouldToggle = !pendingFocus
    pendingFocus = true
    if (shouldToggle) api.keymap.dispatchCommand("session.sidebar.toggle")
    queueMicrotask(fulfillPendingFocus)
    return false
  }

  function move(offset: number) {
    const items = available()
    if (items.length === 0) return
    const index = items.findIndex((descriptor) => descriptor.id === selectedId())
    const next = index < 0 ? (offset > 0 ? 0 : items.length - 1) : (index + offset + items.length) % items.length
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
    pendingFocus = false
    pendingSelectionId = undefined
    const focused = api.renderer.currentFocusedRenderable
    if (savedReturnTarget?.parent && isEffectivelyVisible(savedReturnTarget)) {
      savedReturnTarget.focus()
      syncFocus()
      return true
    }
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
    let active = true
    queueMicrotask(() => {
      if (!active || disposed || input.isDestroyed) return
      const command = `${id}.leave-filter`
      unregister = api.keymap.registerLayer({
        target: input,
        targetMode: "focus",
        priority: 200,
        commands: [{ name: command, run: onLeave }],
        bindings: [{ key: "escape", cmd: command }],
      })
      filterLayers.add(unregister)
    })
    return () => {
      active = false
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
      if (disposed) return
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
    if (disposed || contentRoot !== root || root.isDestroyed || targetedRoot === root) return
    unregisterTargeted?.()
    targetedRoot = root
    unregisterTargeted = api.keymap.registerLayer({
      target: root,
      targetMode: "focus",
      priority: 100,
      commands: [
        { name: `${PLUGIN_ID}.navigation.previous`, run: () => move(-1) },
        { name: `${PLUGIN_ID}.navigation.next`, run: () => move(1) },
        { name: `${PLUGIN_ID}.navigation.activate`, run: activate },
        { name: `${PLUGIN_ID}.navigation.leave`, run: leave },
        { name: `${PLUGIN_ID}.navigation.help`, run: () => openKeyboardHelp(api) },
      ],
      bindings: [
        { key: "up", cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: "k", cmd: `${PLUGIN_ID}.navigation.previous` },
        { key: "down", cmd: `${PLUGIN_ID}.navigation.next` },
        { key: "j", cmd: `${PLUGIN_ID}.navigation.next` },
        { key: "return", cmd: `${PLUGIN_ID}.navigation.activate` },
        { key: "escape", cmd: `${PLUGIN_ID}.navigation.leave` },
        { key: "?", cmd: `${PLUGIN_ID}.navigation.help` },
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
    pendingFocus: () => pendingFocus,
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
          title: "Focus sidebar",
          category: "Sidebar",
          namespace: "palette",
          enabled: () => api.route.current.name === "session" && !api.ui?.dialog?.open,
          run: () => deferFocus(),
        },
        ...SECTION_COMMANDS.map(({ section, title }) => ({
          name: `${PLUGIN_ID}.focus.${section}`,
          title,
          category: "Sidebar",
          namespace: "palette",
          enabled: () => api.route.current.name === "session" && !api.ui?.dialog?.open,
          run: () => deferFocus(section),
        })),
      ]
    },
    dispose() {
      disposed = true
      unregisterTargeted?.()
      for (const unregister of filterLayers) unregister()
      for (const timer of focusTimers) clearTimeout(timer)
      filterLayers.clear()
      focusTimers.clear()
      unregisterTargeted = undefined
      targetedRoot = undefined
      descriptors.clear()
      api.renderer.off("focused_renderable", onFocusedRenderable)
      setFocusWithin(false)
    },
  }
}

export type SidebarInteraction = ReturnType<typeof createSidebarInteraction>

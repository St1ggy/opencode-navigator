import { useTerminalDimensions } from '@opentui/solid'
import { createEffect, createMemo, onCleanup, onMount } from 'solid-js'

import { SIDEBAR_SECTIONS, type SidebarSection } from '../../../entities/sidebar-layout'
import { PLUGIN_ID } from '../../../shared/config'
import { useDialogScroll, useDialogState, useDialogs, useIcons } from '../../../shared/ui'

import { createLayoutPresetActions } from './layout-preset-actions'
import { createSettingsGroups } from './settings-groups'
import { registerSettingsKeymap } from './settings-keymap'
import { createSettingsSelection } from './settings-selection'

import type { McpController } from '../../../entities/mcp'
import type { PreferencesController } from '../../../entities/preferences'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function createSettingsDialogController(props: {
  api: TuiPluginApi
  preferences: PreferencesController
  mcp?: McpController
  activeValue?: string
}) {
  let body: ScrollBoxRenderable | undefined
  const theme = () => props.api.theme.current
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const scroll = useDialogScroll()
  const dimensions = useTerminalDimensions()
  const bodyHeight = createMemo(() => Math.max(4, Math.floor(dimensions().height * 0.75) - 10))
  const orderedGroups = createSettingsGroups(props.api, props.preferences, icons)
  const initialGroup = orderedGroups().find((group) =>
    group.options.some((option) => option.value === props.activeValue),
  )
  const [activeGroup, setActiveGroup] = useDialogState('tab', initialGroup?.id ?? orderedGroups()[0].id)
  const options = createMemo(() => orderedGroups().find((group) => group.id === activeGroup())?.options ?? [])
  const optionId = (value: string) => `${PLUGIN_ID}.settings.${value}`
  const initialActive = options().findIndex((option) => option.value === props.activeValue)
  const [active, setActive] = useDialogState('selection', Math.max(0, initialActive))

  createEffect(() => {
    if (active() >= options().length) setActive(Math.max(0, options().length - 1))
  })
  const contentHeight = createMemo(() => Math.min(bodyHeight(), Math.max(1, options().length * 2 - 1)))
  const footerHint = createMemo(() => {
    const common = `${icons.key('tab')} switch · ${icons.key('up/down')} navigate`

    if (activeGroup() === 'sections')
      return `${common} · ${icons.key('enter')} toggle · l item limit${options()[active()]?.value === 'quick_actions' ? ' · a actions' : ''}${options()[active()]?.value === 'mcp' ? ' · g groups' : ''} · ${icons.key('left/right')} or ${icons.key('shift+up/down')} reorder`

    if (activeGroup() === 'presets') return `${common} · ${icons.key('enter')} manage`

    if (activeGroup() === 'behavior') return `${common} · ${icons.key('enter')} change`

    if (activeGroup() === 'defaults') return `${common} · ${icons.key('enter')} run`

    return `${common} · ${icons.key('enter')} select`
  })

  onMount(() => {
    queueMicrotask(() => {
      const option = options()[active()]

      if (option) body?.scrollChildIntoView(optionId(option.value))
    })
  })

  function move(offset: number) {
    const next = (active() + offset + options().length) % options().length

    setActive(next)
    const option = options()[next]

    if (option) body?.scrollChildIntoView(optionId(option.value))
  }

  function switchGroup(offset: number) {
    const index = orderedGroups().findIndex((group) => group.id === activeGroup())
    const group = orderedGroups()[(index + offset + orderedGroups().length) % orderedGroups().length]

    setActiveGroup(group.id)
    setActive(0)
    queueMicrotask(() => {
      const option = options()[0]

      if (option) body?.scrollChildIntoView(optionId(option.value))
    })
  }

  function reorder(value: string | undefined, direction: -1 | 1) {
    if (!value || !SIDEBAR_SECTIONS.includes(value as SidebarSection)) return

    props.preferences.moveSelectedSection(value as SidebarSection, direction)
    queueMicrotask(() => {
      const next = options().findIndex((candidate) => candidate.value === value)

      if (next === -1) return

      setActive(next)
      body?.scrollChildIntoView(optionId(value))
    })
  }

  const presetActions = createLayoutPresetActions({
    api: props.api,
    preferences: props.preferences,
    mcp: props.mcp,
    dialogs,
  })
  const selection = createSettingsSelection({
    api: props.api,
    preferences: props.preferences,
    mcp: props.mcp,
    dialogs,
    options,
    active,
    setActive,
    openPreset: presetActions.open,
    promptPreset: presetActions.prompt,
  })
  const unregister = registerSettingsKeymap({
    api: props.api,
    active,
    activeGroup,
    options,
    move,
    switchGroup,
    reorder,
    select: selection.select,
    openQuickActions: selection.openQuickActions,
    openMcpGroups: selection.openMcpGroups,
    openLimitPrompt: selection.openLimitPrompt,
  })

  onCleanup(unregister)

  return {
    active,
    activeGroup,
    contentHeight,
    dialogs,
    footerHint,
    icons,
    openLimitPrompt: selection.openLimitPrompt,
    openQuickActions: selection.openQuickActions,
    openMcpGroups: selection.openMcpGroups,
    options,
    optionId,
    orderedGroups,
    reorder,
    select: selection.select,
    setActive,
    setActiveGroup,
    setBody(node: ScrollBoxRenderable) {
      body = node
      scroll.ref(node)
    },
    restoreScroll: scroll.restore,
    saveScroll: scroll.save,
    theme,
  }
}

export type SettingsDialogController = ReturnType<typeof createSettingsDialogController>

import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { For, Show, createEffect, createMemo, onCleanup, onMount } from 'solid-js'

import { DEFAULT_SEARCH_KEY, PLUGIN_ID, SECTION_DEFINITIONS } from '../constants'
import { useIcons } from '../icons/context'
import { SIDEBAR_SECTIONS, type SidebarSection } from '../state'

import { createDialogStack, useDialogScroll, useDialogState, useDialogs } from './context'
import { FirstRunWizard } from './first-run'
import { QuickActionsDialog } from './quick-actions'

import type { PreferencesController } from '../controllers/preferences'
import type { SettingsTab } from '../icons/ui'
import type { TuiDialogSelectProps, TuiPluginApi } from '@opencode-ai/plugin/tui'

function PresetActionsMenu(props: { api: TuiPluginApi } & TuiDialogSelectProps<string>) {
  const [current, setCurrent] = useDialogState('action', props.options[0]?.value ?? '')

  return (
    <props.api.ui.DialogSelect
      {...props}
      current={current()}
      onMove={(option) => setCurrent(option.value)}
      onSelect={(option) => {
        setCurrent(option.value)
        props.onSelect?.(option)
      }}
    />
  )
}

export function SettingsDialog(props: { api: TuiPluginApi; preferences: PreferencesController; activeValue?: string }) {
  let body: ScrollBoxRenderable | undefined
  const theme = () => props.api.theme.current
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const scroll = useDialogScroll()
  const dimensions = useTerminalDimensions()
  const bodyHeight = createMemo(() => Math.max(4, Math.floor(dimensions().height * 0.75) - 10))
  const groups = createMemo(() => [
    {
      id: 'scope',
      tab: 'Scope',
      title: 'Preference scope',
      options: [
        {
          title: `${icons.icon(props.preferences.preferenceScope() === 'global' ? 'radioOn' : 'radioOff')} Global`,
          value: 'scope:global',
          description: 'applies to every worktree',
        },
        {
          title: `${icons.icon(props.preferences.preferenceScope() === 'worktree' ? 'radioOn' : 'radioOff')} Current worktree`,
          value: 'scope:worktree',
          description: props.preferences.canUseWorktreeScope()
            ? props.preferences.preferenceScopeLabel()
            : 'unavailable outside a worktree',
        },
      ],
    },
    {
      id: 'presets',
      tab: 'Presets',
      title: 'Layout presets',
      options: [
        ...Object.keys(props.preferences.layoutPresets())
          .sort((left, right) => left.localeCompare(right))
          .map((name) => ({
            title: `${icons.icon('presets')} ${name}`,
            value: `preset:custom:${encodeURIComponent(name)}`,
            description: 'enter to apply or edit',
          })),
        {
          title: `${icons.icon('add')} Save as…`,
          value: 'save_preset',
          description: 'create a preset from the current layout',
        },
      ],
    },
    {
      id: 'sections',
      tab: 'Sections',
      title: 'Sections & order',
      options: props.preferences.selectedSectionOrder().map((name, index) => {
        const section = SECTION_DEFINITIONS.find((candidate) => candidate.name === name)!

        return {
          title: `${icons.icon(props.preferences.selectedSections()[section.name] ? 'checked' : 'unchecked')} ${index + 1}. ${icons.section(section.name)} ${section.label}`,
          value: section.name,
          description: props.preferences.selectedSections()[section.name] ? 'visible' : 'hidden',
        }
      }),
    },
    {
      id: 'behavior',
      tab: 'Behavior',
      title: 'Behavior',
      options: [
        {
          title: `${icons.icon(props.preferences.selectedPersistMcp() ? 'checked' : 'unchecked')} Remember MCP states`,
          value: 'persist_mcp',
          description: props.preferences.selectedPersistMcp() ? 'on' : 'off',
        },
        {
          title: `${icons.icon('settings')} Icon style`,
          value: 'lsp_icon_style',
          description: props.preferences.selectedLspIconStyle() === 'nerd' ? 'Nerd Font' : 'Text fallback',
        },
        {
          title: `${icons.icon('sections')} Sidebar shortcut`,
          value: 'toggle_key',
          description: props.preferences.selectedToggleKey(),
        },
        {
          title: `${icons.icon('selected')} Focus shortcut`,
          value: 'focus_key',
          description: props.preferences.selectedFocusKey(),
        },
        {
          title: `${icons.icon('search')} Search Everything shortcut`,
          value: 'search_key',
          description: props.preferences.selectedSearchKey?.() ?? DEFAULT_SEARCH_KEY,
        },
      ],
    },
    {
      id: 'defaults',
      tab: 'Defaults',
      title: 'Defaults & help',
      options: [
        {
          title: `${icons.icon('save')} Save current layout as default`,
          value: 'save_layout',
          description: `${SIDEBAR_SECTIONS.filter((name) => props.preferences.selectedSections()[name]).length} visible · ${
            SIDEBAR_SECTIONS.filter((name) => props.preferences.selectedExpanded()[name]).length
          } expanded`,
        },
        {
          title: `${icons.icon('reset')} Restore configured layout`,
          value: 'reset_sections',
          description: 'visibility and expansion',
        },
        {
          title: `${icons.icon('reset')} Restore configured behavior`,
          value: 'reset_settings',
          description: 'MCP memory, icons, shortcuts, limits, actions',
        },
        {
          title: `${icons.icon('reset')} Clear remembered MCP states`,
          value: 'reset_mcp',
          description: `scope: ${props.preferences.preferenceScopeLabel()}`,
        },
        {
          title: `${icons.icon('reset')} Show skill confirmations again`,
          value: 'reset_skills',
          description: `${props.preferences.skippedSkillCount()} skipped`,
        },
        {
          title: `${icons.icon('help')} Open quick setup guide`,
          value: 'wizard',
          description: 'tips and section settings',
        },
      ],
    },
  ])
  const orderedGroups = createMemo(() =>
    ['sections', 'scope', 'presets', 'behavior', 'defaults'].map((id) => groups().find((group) => group.id === id)!),
  )
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
      return `${common} · ${icons.key('enter')} toggle · l item limit${options()[active()]?.value === 'quick_actions' ? ' · a actions' : ''} · ${icons.key('left/right')} or ${icons.key('shift+up/down')} reorder`

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

  function openPresetPrompt(value = '', renameFrom?: string) {
    dialogs.prompt({
      title: renameFrom ? 'Rename layout preset' : 'Save layout preset',
      description: () => <text fg={theme().textMuted}>Save the current visible, expanded, and ordered sections.</text>,
      placeholder: 'Preset name',
      value,
      onConfirm(input) {
        const name = renameFrom
          ? props.preferences.renameLayoutPreset(renameFrom, input)
          : props.preferences.saveLayoutPreset(input)

        dialogs.back()

        if (renameFrom) dialogs.back()

        props.api.ui.toast({
          variant: 'success',
          title: 'Layout presets',
          message: renameFrom ? `Renamed to ${name}` : `Saved ${name}`,
          duration: 3000,
        })
      },
    })
  }

  function applyPreset(name: string) {
    const layout = props.preferences.layoutPresets()[name]

    if (!layout) return

    props.preferences.applyLayoutPreset(layout)
    dialogs.back()
    props.api.ui.toast({
      variant: 'success',
      title: 'Layout presets',
      message: `${name} applied to ${props.preferences.preferenceScopeLabel()}`,
      duration: 3000,
    })
  }

  function openPresetActions(name: string) {
    dialogs.open(() => (
      <PresetActionsMenu
        api={props.api}
        title={name}
        skipFilter
        options={[
          {
            title: `${icons.icon('done')} Apply`,
            value: 'apply',
            description: 'use this layout in the selected scope',
          },
          {
            title: `${icons.icon('save')} Update from current`,
            value: 'update',
            description: 'replace the saved layout',
          },
          { title: `${icons.icon('edit')} Rename…`, value: 'rename', description: 'change the preset name' },
          { title: `${icons.icon('delete')} Delete`, value: 'delete', description: 'remove this preset' },
        ]}
        onSelect={(option) => {
          if (option.value === 'apply') {
            applyPreset(name)

            return
          }

          if (option.value === 'update') {
            props.preferences.updateLayoutPreset(name)
            dialogs.back()
            props.api.ui.toast({
              variant: 'success',
              title: 'Layout presets',
              message: `Updated ${name}`,
              duration: 3000,
            })

            return
          }

          if (option.value === 'rename') {
            openPresetPrompt(name, name)

            return
          }

          props.preferences.deleteLayoutPreset(name)
          dialogs.back()
        }}
      />
    ))
  }

  function openLimitPrompt(section: SidebarSection) {
    const index = options().findIndex((option) => option.value === section)

    if (index !== -1) setActive(index)

    dialogs.prompt({
      title: `${SECTION_DEFINITIONS.find((item) => item.name === section)!.label} item limit`,
      description: () => <text fg={theme().textMuted}>Visible items before Show all. Enter 0 for All.</text>,
      value: String(props.preferences.selectedSectionItemLimit(section)),
      onConfirm(input) {
        if (!/^\d+$/.test(input.trim())) throw new Error('Enter a non-negative whole number (0 for All)')

        props.preferences.setSectionItemLimit(section, Number(input))
        dialogs.back()
      },
    })
  }

  function select(value = options()[active()]?.value) {
    if (!value) return

    const index = options().findIndex((option) => option.value === value)

    if (index !== -1) setActive(index)

    if (value === 'scope:global' || value === 'scope:worktree') {
      props.preferences.setPreferenceScope(value === 'scope:global' ? 'global' : 'worktree')

      return
    }

    if (value.startsWith('preset:')) {
      const prefix = 'preset:custom:'

      if (value.startsWith(prefix)) openPresetActions(decodeURIComponent(value.slice(prefix.length)))

      return
    }

    if (value === 'save_preset') {
      openPresetPrompt()

      return
    }

    if (value === 'save_layout') {
      void props.preferences
        .saveLayoutAsDefault()
        .then(() => {
          props.api.ui.toast({
            variant: 'success',
            title: 'Navigator settings',
            message: 'Current layout saved as default',
            duration: 3000,
          })
        })
        .catch((error) => {
          props.api.ui.toast({
            variant: 'error',
            title: 'Navigator settings',
            message: error instanceof Error ? error.message : 'Failed to save the default layout',
            duration: 5000,
          })
        })

      return
    }

    if (value === 'reset_sections') {
      props.preferences.resetSections()

      return
    }

    if (value === 'persist_mcp') {
      props.preferences.toggleMcpPersistence()

      return
    }

    if (value === 'lsp_icon_style') {
      props.preferences.toggleLspIconStyle()

      return
    }

    if (value === 'toggle_key' || value === 'focus_key' || value === 'search_key') {
      const bindings = {
        toggle_key: {
          title: 'Sidebar shortcut',
          get: props.preferences.selectedToggleKey,
          set: props.preferences.setToggleKey,
        },
        focus_key: {
          title: 'Focus shortcut',
          get: props.preferences.selectedFocusKey,
          set: props.preferences.setFocusKey,
        },
        search_key: {
          title: 'Search Everything shortcut',
          get: props.preferences.selectedSearchKey,
          set: props.preferences.setSearchKey,
        },
      }
      const binding = bindings[value]

      dialogs.prompt({
        title: binding.title,
        description: () => <text fg={theme().textMuted}>Use OpenCode key syntax, for example alt+s.</text>,
        value: binding.get(),
        onConfirm(input) {
          binding.set(input)
          dialogs.back()
        },
      })

      return
    }

    if (value === 'reset_settings') {
      props.preferences.resetPluginSettings()

      return
    }

    if (value === 'reset_mcp') {
      props.preferences.resetMcpStates()

      return
    }

    if (value === 'reset_skills') {
      props.preferences.resetSkillConfirmations()

      return
    }

    if (value === 'wizard') {
      dialogs.open(() => <FirstRunWizard api={props.api} preferences={props.preferences} />)

      return
    }

    props.preferences.toggleSelectedSection(value as SidebarSection)
  }

  function openQuickActions() {
    setActive(options().findIndex((option) => option.value === 'quick_actions'))
    dialogs.open(() => <QuickActionsDialog api={props.api} preferences={props.preferences} />)
  }

  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.settings.previous`, run: () => move(-1) },
      { name: `${PLUGIN_ID}.settings.next`, run: () => move(1) },
      { name: `${PLUGIN_ID}.settings.select`, run: () => select() },
      {
        name: `${PLUGIN_ID}.settings.quick-actions`,
        run: () => {
          if (activeGroup() === 'sections' && options()[active()]?.value === 'quick_actions') openQuickActions()
        },
      },
      {
        name: `${PLUGIN_ID}.settings.item-limit`,
        run: () => {
          const section = options()[active()]?.value as SidebarSection

          if (activeGroup() === 'sections' && SIDEBAR_SECTIONS.includes(section)) openLimitPrompt(section)
        },
      },
      { name: `${PLUGIN_ID}.settings.previous-tab`, run: () => switchGroup(-1) },
      { name: `${PLUGIN_ID}.settings.next-tab`, run: () => switchGroup(1) },
      { name: `${PLUGIN_ID}.settings.move-up`, run: () => reorder(options()[active()]?.value, -1) },
      { name: `${PLUGIN_ID}.settings.move-down`, run: () => reorder(options()[active()]?.value, 1) },
    ],
    bindings: [
      { key: 'up', cmd: `${PLUGIN_ID}.settings.previous` },
      { key: 'down', cmd: `${PLUGIN_ID}.settings.next` },
      { key: 'tab', cmd: `${PLUGIN_ID}.settings.next-tab` },
      { key: 'shift+tab', cmd: `${PLUGIN_ID}.settings.previous-tab` },
      { key: 'space', cmd: `${PLUGIN_ID}.settings.select` },
      { key: 'return', cmd: `${PLUGIN_ID}.settings.select` },
      { key: 'l', cmd: `${PLUGIN_ID}.settings.item-limit` },
      { key: 'a', cmd: `${PLUGIN_ID}.settings.quick-actions` },
      { key: 'left', cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: 'right', cmd: `${PLUGIN_ID}.settings.move-down` },
      { key: 'shift+up', cmd: `${PLUGIN_ID}.settings.move-up` },
      { key: 'shift+down', cmd: `${PLUGIN_ID}.settings.move-down` },
    ],
  })

  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('settings')} Navigator settings
        </text>
        <text
          fg={theme().textMuted}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            dialogs.back()
          }}
        >
          {icons.key('esc')}
        </text>
      </box>
      <text fg={theme().textMuted}>Adjust sections and behavior. Changes apply immediately.</text>
      <box flexDirection="row" gap={1}>
        <For each={orderedGroups()}>
          {(group) => (
            <box
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={activeGroup() === group.id ? theme().backgroundElement : undefined}
              onMouseDown={() => {
                setActiveGroup(group.id)
                setActive(0)
              }}
            >
              <text
                attributes={activeGroup() === group.id ? TextAttributes.BOLD : undefined}
                fg={activeGroup() === group.id ? theme().accent : theme().textMuted}
              >
                {icons.tab(group.id as SettingsTab)} {group.tab}
              </text>
            </box>
          )}
        </For>
      </box>
      <scrollbox
        ref={(node) => {
          body = node
          scroll.ref(node)
        }}
        renderBefore={scroll.restore}
        renderAfter={scroll.save}
        height={contentHeight()}
        scrollX={false}
        verticalScrollbarOptions={{ visible: true }}
        horizontalScrollbarOptions={{ visible: false }}
      >
        <box gap={1}>
          <For each={options()}>
            {(option) => {
              const index = () => options().findIndex((candidate) => candidate.value === option.value)
              const selected = () => active() === index()

              return (
                <box
                  id={optionId(option.value)}
                  flexDirection="row"
                  gap={2}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={selected() ? theme().backgroundElement : undefined}
                  onMouseOver={() => setActive(index())}
                  onMouseDown={(event) => event.stopPropagation()}
                  onMouseUp={(event) => {
                    event.stopPropagation()
                    select(option.value)
                  }}
                >
                  <text flexShrink={0} attributes={selected() ? TextAttributes.BOLD : undefined} fg={theme().text}>
                    {option.title}
                  </text>
                  <text flexGrow={1} fg={theme().borderSubtle}>
                    {option.description}
                  </text>
                  <Show when={SIDEBAR_SECTIONS.includes(option.value as SidebarSection)}>
                    <box flexDirection="row" flexShrink={0} gap={1}>
                      <Show when={option.value === 'quick_actions'}>
                        <text
                          fg={theme().accent}
                          onMouseDown={(event) => event.stopPropagation()}
                          onMouseUp={(event) => {
                            event.stopPropagation()
                            openQuickActions()
                          }}
                        >
                          {icons.icon('actions')} Actions
                        </text>
                      </Show>
                      <text
                        fg={theme().accent}
                        onMouseDown={(event) => event.stopPropagation()}
                        onMouseUp={(event) => {
                          event.stopPropagation()
                          openLimitPrompt(option.value as SidebarSection)
                        }}
                      >
                        {icons.icon('todo')} Items:{' '}
                        {props.preferences.selectedSectionItemLimit?.(option.value as SidebarSection) || 'All'}
                      </text>
                      <text
                        fg={theme().accent}
                        onMouseDown={(event) => {
                          event.stopPropagation()
                          reorder(option.value, -1)
                        }}
                      >
                        {icons.icon('up')}
                      </text>
                      <text
                        fg={theme().accent}
                        onMouseDown={(event) => {
                          event.stopPropagation()
                          reorder(option.value, 1)
                        }}
                      >
                        {icons.icon('down')}
                      </text>
                    </box>
                  </Show>
                </box>
              )
            }}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted}>{footerHint()}</text>
    </box>
  )
}

export function openSettings(api: TuiPluginApi, preferences: PreferencesController, activeValue?: string) {
  createDialogStack(api, preferences.lspIconStyle).open(
    () => <SettingsDialog api={api} preferences={preferences} activeValue={activeValue} />,
    'xlarge',
  )
}

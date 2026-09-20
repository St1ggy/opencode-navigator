import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import { For, createEffect, onCleanup } from 'solid-js'

import { SelectionBox } from '../components/selection-box'
import { PLUGIN_ID } from '../constants'
import { useIcons } from '../icons/context'

import { createDialogStack, useDialogScroll, useDialogState, useDialogs } from './context'
import { McpPresetPreview } from './mcp-preset-preview'

import type { McpController } from '../controllers/mcp'
import type { PreferencesController } from '../controllers/preferences'
import type { UiIcon } from '../icons/ui'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type PresetOption = { title: string; value: string; description: string; icon?: UiIcon }

export function PresetMenu(props: {
  api: TuiPluginApi
  title: string
  options: PresetOption[]
  onSelect: (option: PresetOption) => void
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const scroll = useDialogScroll()
  const [active, setActive] = useDialogState('selection', 0)

  createEffect(() => {
    if (active() >= props.options.length) setActive(Math.max(0, props.options.length - 1))
  })
  const theme = () => props.api.theme.current
  let body: ScrollBoxRenderable | undefined
  const prefix = `${PLUGIN_ID}.mcp-preset-menu`

  function move(offset: number) {
    const count = props.options.length

    if (!count) return

    const next = (active() + offset + count) % count

    setActive(next)
    body?.scrollChildIntoView(`${prefix}.${next}`)
  }
  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${prefix}.previous`, run: () => move(-1) },
      { name: `${prefix}.next`, run: () => move(1) },
      {
        name: `${prefix}.select`,
        run: () => {
          const option = props.options[active()]

          if (option) props.onSelect(option)
        },
      },
    ],
    bindings: [
      { key: 'up', cmd: `${prefix}.previous` },
      { key: 'down', cmd: `${prefix}.next` },
      { key: 'return', cmd: `${prefix}.select` },
      { key: 'space', cmd: `${prefix}.select` },
    ],
  })

  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('presets')} {props.title}
        </text>
        <text fg={theme().textMuted} onMouseUp={dialogs.back}>
          {icons.key('esc')}
        </text>
      </box>
      <scrollbox
        ref={(node) => {
          body = node
          scroll.ref(node)
        }}
        renderBefore={scroll.restore}
        renderAfter={scroll.save}
        height={Math.min(props.options.length * 3, 15)}
        scrollX={false}
      >
        <box gap={1}>
          <For each={props.options}>
            {(option, index) => (
              <SelectionBox
                id={`${prefix}.${index()}`}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={active() === index() ? theme().backgroundElement : undefined}
                onMouseOver={() => setActive(index())}
                onMouseUp={(event) => {
                  event.stopPropagation()
                  setActive(index())
                  props.onSelect(option)
                }}
              >
                <text
                  attributes={active() === index() ? TextAttributes.BOLD : undefined}
                  fg={theme().text}
                  wrapMode="word"
                >
                  {option.icon ? `${icons.icon(option.icon)} ` : ''}
                  {option.title}
                </text>
                <text fg={theme().textMuted} wrapMode="word">
                  {option.description}
                </text>
              </SelectionBox>
            )}
          </For>
        </box>
      </scrollbox>
      <text fg={theme().textMuted}>
        {icons.key('up/down')} navigate · {icons.key('enter')} select · {icons.key('esc')} close
      </text>
    </box>
  )
}

export function openMcpPresets(api: TuiPluginApi, controller: McpController, preferences: PreferencesController) {
  const target = controller.target()
  const dialogs = createDialogStack(api, preferences.lspIconStyle, () => {
    const current = controller.target()

    return current.key === target.key && current.scope === target.scope
  })

  function notify(message: string) {
    api.ui.toast({ variant: 'success', title: 'MCP presets', message, duration: 3000 })
  }

  function prompt(value = '', renameFrom?: string) {
    dialogs.prompt({
      title: renameFrom ? 'Rename MCP preset' : 'Save MCP preset',
      description: () => <text fg={api.theme.current.textMuted}>Save the current enabled and disabled servers.</text>,
      placeholder: 'Preset name',
      value,
      onConfirm(input) {
        const name = renameFrom
          ? preferences.renameMcpPreset(renameFrom, input)
          : preferences.saveMcpPreset(input, controller.capturePreset())

        if (renameFrom) controller.renameSelectedPreset(renameFrom)

        notify(renameFrom ? `Renamed to ${name}` : `Saved ${name}`)
        dialogs.back()

        if (renameFrom) dialogs.back()
      },
    })
  }

  function actions(name: string) {
    dialogs.open(() => (
      <PresetMenu
        api={api}
        title={name}
        options={[
          {
            title: 'Preview & apply',
            value: 'apply',
            description: 'review server changes before applying',
            icon: 'info',
          },
          { title: 'Update from current', value: 'update', description: 'replace the saved states', icon: 'save' },
          { title: 'Rename', value: 'rename', description: 'change the preset name', icon: 'edit' },
          { title: 'Delete', value: 'delete', description: 'remove this preset', icon: 'delete' },
        ]}
        onSelect={(option) => {
          if (option.value === 'apply') {
            dialogs.open(
              () => <McpPresetPreview api={api} controller={controller} preferences={preferences} name={name} />,
              'large',
            )

            return
          }

          if (option.value === 'update') {
            try {
              const states = controller.capturePreset()

              if (!preferences.updateMcpPreset(name, states)) throw new Error('MCP preset no longer exists')

              controller.updateSelectedPreset(name)
              notify(`Updated ${name}`)
              dialogs.back()
            } catch (error) {
              api.ui.toast({
                variant: 'error',
                title: 'MCP presets',
                message: error instanceof Error ? error.message : 'Could not update the preset',
                duration: 4000,
              })
              dialogs.back()
            }

            return
          }

          if (option.value === 'rename') return prompt(name, name)

          if (!preferences.deleteMcpPreset(name)) {
            api.ui.toast({
              variant: 'warning',
              title: 'MCP presets',
              message: 'MCP preset no longer exists',
              duration: 4000,
            })
            dialogs.back()

            return
          }

          controller.clearSelectedPreset(name)
          notify(`Deleted ${name}`)
          dialogs.back()
        }}
      />
    ))
  }

  dialogs.open(() => (
    <PresetMenu
      api={api}
      title="MCP presets"
      options={[
        {
          title: 'Save current',
          value: 'save',
          description: 'Create a preset from the current server states',
          icon: 'save',
        },
        ...Object.entries(preferences.mcpPresets()).map(([name, states]) => ({
          title: name,
          value: `preset:${name}`,
          icon: 'presets' as const,
          description: `${Object.values(states).filter((state) => state === 'enabled').length}/${Object.keys(states).length} enabled`,
        })),
      ]}
      onSelect={(option) => (option.value === 'save' ? prompt() : actions(option.value.slice('preset:'.length)))}
    />
  ))
}

export { PresetMenu as McpPresetMenu }

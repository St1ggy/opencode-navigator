import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'
import { createSignal, onCleanup } from 'solid-js'

import { PLUGIN_ID } from '../constants'
import { useIcons } from '../icons/context'

import { useDialogs } from './context'

import type { SkillInfo } from '../controllers/skills'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function SkillDialog(props: {
  api: TuiPluginApi
  skill: SkillInfo
  onAccept: (skipConfirmation: boolean) => void
}) {
  const icons = useIcons()
  const dialogs = useDialogs(props.api)
  const [skipConfirmation, setSkipConfirmation] = createSignal(false)
  const [active, setActive] = createSignal<'accept' | 'cancel'>('accept')
  const theme = () => props.api.theme.current
  const dimensions = useTerminalDimensions()
  let body: ScrollBoxRenderable | undefined

  function accept() {
    const isSkip = skipConfirmation()

    dialogs.close()
    props.onAccept(isSkip)
  }

  function cancel() {
    dialogs.back()
  }

  const unregister = props.api.keymap.registerLayer({
    mode: 'modal',
    priority: 1000,
    commands: [
      { name: `${PLUGIN_ID}.skill-dialog.scroll-up`, run: () => body?.scrollBy(-1) },
      { name: `${PLUGIN_ID}.skill-dialog.scroll-down`, run: () => body?.scrollBy(1) },
      {
        name: `${PLUGIN_ID}.skill-dialog.move`,
        run() {
          setActive((value) => (value === 'accept' ? 'cancel' : 'accept'))
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.toggle-skip`,
        run() {
          setSkipConfirmation((value) => !value)
        },
      },
      {
        name: `${PLUGIN_ID}.skill-dialog.submit`,
        run() {
          if (active() === 'accept') accept()
          else cancel()
        },
      },
    ],
    bindings: [
      { key: 'up', cmd: `${PLUGIN_ID}.skill-dialog.scroll-up` },
      { key: 'down', cmd: `${PLUGIN_ID}.skill-dialog.scroll-down` },
      { key: 'left', cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: 'right', cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: 'tab', cmd: `${PLUGIN_ID}.skill-dialog.move` },
      { key: 'space', cmd: `${PLUGIN_ID}.skill-dialog.toggle-skip` },
      { key: 'return', cmd: `${PLUGIN_ID}.skill-dialog.submit` },
    ],
  })

  onCleanup(unregister)

  return (
    <box paddingLeft={2} paddingRight={2} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme().text}>
          {icons.icon('skills')} {props.skill.name}
        </text>
        <text
          fg={theme().textMuted}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            cancel()
          }}
        >
          {icons.key('esc')}
        </text>
      </box>
      <scrollbox
        ref={(node) => (body = node)}
        maxHeight={Math.max(3, Math.floor(dimensions().height * 0.75) - 8)}
        contentOptions={{ minHeight: 0 }}
        scrollX={false}
      >
        <text fg={theme().textMuted} wrapMode="word">
          {props.skill.description?.trim() || 'No description available.'}
        </text>
        <text fg={theme().text} attributes={TextAttributes.BOLD}>
          {icons.icon('info')} Source
        </text>
        <text fg={theme().textMuted} wrapMode="word">
          {props.skill.location || 'Unknown'}
        </text>
      </scrollbox>
      <box flexDirection="row" gap={1} onMouseDown={() => setSkipConfirmation((value) => !value)}>
        <text fg={skipConfirmation() ? theme().accent : theme().textMuted}>
          {icons.icon(skipConfirmation() ? 'checked' : 'unchecked')}
        </text>
        <text fg={theme().text}>Don't show again for this skill</text>
        <text fg={theme().textMuted}>({icons.key('space')})</text>
      </box>
      <box flexDirection="row" justifyContent="flex-end">
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === 'cancel' ? theme().primary : undefined}
          onMouseOver={() => setActive('cancel')}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            cancel()
          }}
        >
          <text fg={active() === 'cancel' ? theme().selectedListItemText : theme().textMuted}>
            {icons.icon('close')} Cancel
          </text>
        </box>
        <box
          paddingLeft={1}
          paddingRight={1}
          backgroundColor={active() === 'accept' ? theme().primary : undefined}
          onMouseOver={() => setActive('accept')}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => {
            event.stopPropagation()
            accept()
          }}
        >
          <text fg={active() === 'accept' ? theme().selectedListItemText : theme().textMuted}>
            {icons.icon('done')} Accept
          </text>
        </box>
      </box>
    </box>
  )
}

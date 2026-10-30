import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import { DialogAction, DialogHeader, DialogSurface, useDialogState } from './dialog'

import type { TuiDialogPromptProps, TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, InputRenderable } from '@opentui/core'

export function SingleLinePrompt(props: TuiDialogPromptProps & { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const [value, setValue] = useDialogState('prompt-value', props.value ?? '')
  const [active, setActive] = useDialogState('prompt-control', 0)
  const [hovered, setHovered] = createSignal<number>()
  let input: InputRenderable | undefined
  let actions: BoxRenderable | undefined
  const confirm = () => props.onConfirm?.(value())
  const cancel = () => props.onCancel?.()
  const focus = (index: number) => {
    setActive(index)
    setHovered(undefined)

    if (index === 0) input?.focus()
    else actions?.focus()
  }
  const prefix = 'opencode-navigator.prompt'

  createEffect(() => {
    const actionsFocused = active() > 0
    const unregister = props.api.keymap.registerLayer({
      mode: 'modal',
      priority: 1100,
      commands: [
        { name: `${prefix}.next`, run: () => focus((active() + 1) % 3) },
        { name: `${prefix}.previous`, run: () => focus((active() + 2) % 3) },
        { name: `${prefix}.activate`, run: () => (active() === 2 ? cancel() : confirm()) },
        { name: `${prefix}.horizontal`, enabled: () => active() > 0, run: () => focus(active() === 1 ? 2 : 1) },
      ],
      bindings: [
        { key: 'tab', cmd: `${prefix}.next` },
        { key: 'shift+tab', cmd: `${prefix}.previous` },
        { key: 'return', cmd: `${prefix}.activate` },
        ...(actionsFocused
          ? [
              { key: 'left', cmd: `${prefix}.horizontal` },
              { key: 'right', cmd: `${prefix}.horizontal` },
            ]
          : []),
      ],
    })

    onCleanup(unregister)
  })
  onMount(() => queueMicrotask(() => input?.focus()))

  return (
    <DialogSurface api={props.api}>
      <DialogHeader api={props.api} title={props.title} onBack={cancel} />
      {props.description?.()}
      <input
        ref={(node) => {
          input = node
        }}
        value={value()}
        placeholder={props.placeholder}
        textColor={theme().text}
        focusedTextColor={theme().text}
        backgroundColor={theme().backgroundPanel}
        focusedBackgroundColor={theme().backgroundElement}
        cursorColor={theme().primary}
        placeholderColor={theme().textMuted}
        onInput={setValue}
        on:focused={() => setActive(0)}
      />
      <box
        ref={(node) => {
          actions = node
        }}
        flexDirection="row"
        gap={1}
        focusable
      >
        <DialogAction
          api={props.api}
          id={`${prefix}.save`}
          label="Save"
          icon="save"
          selected={(hovered() ?? active()) === 1}
          onSelect={() => setHovered(1)}
          onActivate={confirm}
        />
        <DialogAction
          api={props.api}
          id={`${prefix}.cancel`}
          label="Cancel"
          icon="close"
          selected={(hovered() ?? active()) === 2}
          onSelect={() => setHovered(2)}
          onActivate={cancel}
        />
      </box>
    </DialogSurface>
  )
}

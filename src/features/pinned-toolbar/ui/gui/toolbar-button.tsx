import { For, onCleanup } from 'solid-js'

import { toolbarPinKey } from '../../../../entities/preferences/model'
import { GuiIcon } from '../../../../shared/ui/gui'

import type { ToolbarPin } from '../../../../entities/preferences/model'
import type { PinnedToolbarModel } from '../../model'
import type { Ui } from '@opencode/plugin/gui'

export function GuiToolbarButton(props: {
  ui: Ui
  model: PinnedToolbarModel
  pin: ToolbarPin
  width: number
  measuring?: boolean
  configure(key: string): void
  measure?(node: HTMLSpanElement | undefined): void
}) {
  const Button = props.ui.Button
  const Tooltip = props.ui.Tooltip
  const view = () => props.model.view(props.pin)
  const label = () => [view().text, view().label, view().stateLabel, view().reason].filter(Boolean).join(' · ')

  onCleanup(() => props.measure?.(undefined))

  const button = (
    <Button
      size="small"
      variant="ghost"
      class="min-w-0 max-w-full"
      onClick={() => {
        if (!props.measuring) props.model.run(toolbarPinKey(props.pin))
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          'white-space': 'nowrap',
        }}
      >
        {label()}
      </span>
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', gap: '4px', 'align-items': 'center', 'min-width': '0', 'max-width': '100%' }}
      >
        <For each={view().icons}>{(id) => <GuiIcon ui={props.ui} id={id} />}</For>
        <span style={{ 'white-space': 'nowrap', overflow: 'hidden', 'text-overflow': 'ellipsis', 'min-width': '0' }}>
          {view().text}
        </span>
      </span>
    </Button>
  )

  return (
    <span
      ref={(node) => props.measure?.(node)}
      data-toolbar-visible={props.measuring ? undefined : ''}
      aria-disabled={Boolean(view().reason)}
      onContextMenu={(event) => {
        if (props.measuring) return

        event.preventDefault()
        event.stopPropagation()
        props.configure(toolbarPinKey(props.pin))
      }}
      onKeyDown={(event) => {
        if (props.measuring || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return

        event.preventDefault()
        event.stopPropagation()
        props.configure(toolbarPinKey(props.pin))
      }}
      style={{
        display: 'inline-flex',
        'min-width': '0',
        'max-width': `${props.width}px`,
        'flex-shrink': '0',
        opacity: view().reason ? 0.55 : 1,
      }}
    >
      {props.measuring ? (
        button
      ) : (
        <Tooltip value={`${label()} · Right-click or Shift+F10 to configure`}>{button}</Tooltip>
      )}
    </span>
  )
}

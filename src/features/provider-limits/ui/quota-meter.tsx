import { Show, createSignal } from 'solid-js'

import { subtleLineColor, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, RGBA } from '@opentui/core'
import type { JSX } from 'solid-js'

export function QuotaMeter(props: {
  api: TuiPluginApi
  label: string
  value: string
  ratio?: number
  color: string | RGBA
  labelAbove?: boolean
  row?: JSX.Element
  onActivate?: () => void
}) {
  const icons = useIcons()
  const [columns, setColumns] = createSignal(0)
  const scale = () => {
    if (props.ratio === undefined) return { filled: '', unfilled: 'Scale unknown' }

    const filled = Math.round(props.ratio * columns())
    const symbols = icons.style() === 'text' ? ['=', '-'] : ['━', '─']

    return { filled: symbols[0].repeat(filled), unfilled: symbols[1].repeat(columns() - filled) }
  }
  const valueWidth = () => Math.min(columns(), Bun.stringWidth(props.value))
  const gap = () => (columns() > valueWidth() ? 1 : 0)

  return (
    <box
      width="100%"
      minWidth={0}
      height={2}
      flexDirection={props.labelAbove ? 'column-reverse' : 'column'}
      overflow="hidden"
      onSizeChange={function (this: BoxRenderable) {
        setColumns(this.width)
      }}
    >
      <text width="100%" height={1} wrapMode="none" truncate fg={props.color}>
        {scale().filled}
        <span
          style={{ fg: subtleLineColor(props.api.theme.current.backgroundPanel, props.api.theme.current.borderSubtle) }}
        >
          {scale().unfilled}
        </span>
      </text>
      <Show
        when={props.row}
        fallback={
          <box
            width="100%"
            height={1}
            flexDirection="row"
            overflow="hidden"
            onMouseUp={(event) => {
              event.stopPropagation()
              props.onActivate?.()
            }}
          >
            <text
              width={Math.max(0, columns() - valueWidth() - gap())}
              minWidth={0}
              height={1}
              fg={props.api.theme.current.textMuted}
              wrapMode="none"
              truncate
            >
              {props.label}
            </text>
            <text
              width={valueWidth()}
              height={1}
              marginLeft={gap()}
              fg={props.api.theme.current.text}
              wrapMode="none"
              truncate
            >
              {props.value}
            </text>
          </box>
        }
      >
        {props.row}
      </Show>
    </box>
  )
}

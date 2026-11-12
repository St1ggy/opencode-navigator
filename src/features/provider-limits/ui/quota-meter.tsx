import { createSignal } from 'solid-js'

import { subtleLineColor, useIcons } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable, RGBA } from '@opentui/core'

export function QuotaMeter(props: {
  api: TuiPluginApi
  label: string
  value: string
  ratio?: number
  color: string | RGBA
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
      <box width="100%" height={1} flexDirection="row" overflow="hidden">
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
    </box>
  )
}

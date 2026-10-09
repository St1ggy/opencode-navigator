import { createSignal } from 'solid-js'

import { subtleLineColor, useIcons } from '../../../shared/ui'
import { quotaPresentation } from '../model/quota-presentation'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function QuotaWindowRow(props: { api: TuiPluginApi; window: QuotaWindow }) {
  const icons = useIcons()
  const [columns, setColumns] = createSignal(0)
  const view = () => quotaPresentation(props.window)
  const scale = () => {
    const ratio = view().ratio

    if (ratio === undefined) return { filled: 'Scale unknown', unfilled: '' }

    const width = columns()
    const filled = Math.round(ratio * width)
    const symbols = icons.style() === 'text' ? ['=', '-'] : ['━', '─']

    return { filled: symbols[0].repeat(filled), unfilled: symbols[1].repeat(width - filled) }
  }
  const unfilledColor = () =>
    subtleLineColor(props.api.theme.current.backgroundPanel, props.api.theme.current.borderSubtle)
  const valueWidth = () => Math.min(columns(), Bun.stringWidth(view().value))
  const gap = () => (columns() > valueWidth() ? 1 : 0)
  const resetWidth = () => Math.max(0, columns() - valueWidth() - gap())

  return (
    <box
      width="100%"
      minWidth={0}
      flexShrink={1}
      height={2}
      overflow="hidden"
      onSizeChange={function (this: BoxRenderable) {
        setColumns(this.width)
      }}
    >
      <text width="100%" minWidth={0} height={1} fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        {scale().filled}
        <span style={{ fg: unfilledColor() }}>{scale().unfilled}</span>
      </text>
      <box width="100%" minWidth={0} height={1} flexDirection="row" overflow="hidden">
        <text
          width={resetWidth()}
          minWidth={0}
          height={1}
          fg={props.api.theme.current.textMuted}
          wrapMode="none"
          truncate
        >
          {view().reset}
        </text>
        <text
          width={valueWidth()}
          marginLeft={gap()}
          height={1}
          fg={props.api.theme.current.text}
          wrapMode="none"
          truncate
        >
          {view().value}
        </text>
      </box>
    </box>
  )
}

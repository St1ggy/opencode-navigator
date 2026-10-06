import { createSignal } from 'solid-js'

import { useIcons } from '../../../shared/ui'
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

    if (ratio === undefined) return ' · scale unknown'

    const width = Math.max(0, columns() - Bun.stringWidth(view().value) - 1)
    const filled = Math.round(ratio * width)
    const symbols = icons.style() === 'text' ? ['=', '-'] : ['━', '─']

    return width ? ` ${symbols[0].repeat(filled)}${symbols[1].repeat(width - filled)}` : ''
  }

  return (
    <box
      width="100%"
      minWidth={0}
      flexShrink={1}
      overflow="hidden"
      onSizeChange={function (this: BoxRenderable) {
        setColumns(this.width)
      }}
    >
      <text width="100%" minWidth={0} height={1} fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        <span style={{ fg: props.api.theme.current.text }}>{view().value}</span>
        {scale()}
      </text>
      <text width="100%" minWidth={0} height={1} fg={props.api.theme.current.textMuted} wrapMode="none" truncate>
        {view().reset}
      </text>
    </box>
  )
}

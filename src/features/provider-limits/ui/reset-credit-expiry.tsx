import { Show, createSignal } from 'solid-js'

import { resetCreditLifetime } from '../../../entities/provider-limit/model'
import { subtleLineColor, useIcons } from '../../../shared/ui'

import type { BankedResetCredit } from '../../../entities/provider-limit/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { BoxRenderable } from '@opentui/core'

export function ResetCreditExpiry(props: { api: TuiPluginApi; credit: BankedResetCredit; now: number }) {
  const icons = useIcons()
  const [columns, setColumns] = createSignal(0)
  const lifetime = () => resetCreditLifetime(props.credit, props.now)
  const expiry = () => {
    const timestamp = props.credit.expiresAt

    if (timestamp === undefined || timestamp <= 0) return

    const date = new Date(timestamp * 1000)

    return Number.isFinite(date.getTime()) ? date : undefined
  }
  const scale = () => {
    const width = Math.max(0, Math.floor(columns()))
    const filled = Math.round((lifetime().remaining ?? 0) * width)
    const symbols = icons.style() === 'text' ? ['=', '-'] : ['━', '─']

    return { filled: symbols[0].repeat(filled), unfilled: symbols[1].repeat(width - filled) }
  }

  return (
    <box
      width="100%"
      minWidth={0}
      overflow="hidden"
      onSizeChange={function (this: BoxRenderable) {
        setColumns(this.width)
      }}
    >
      <Show when={lifetime().remaining !== undefined}>
        <text height={1} width="100%" wrapMode="none" truncate fg={props.api.theme.current.textMuted}>
          {scale().filled}
          <span
            style={{
              fg: subtleLineColor(props.api.theme.current.backgroundElement, props.api.theme.current.borderSubtle),
            }}
          >
            {scale().unfilled}
          </span>
        </text>
      </Show>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {lifetime().label}
      </text>
      <Show when={expiry()}>
        {(date) => (
          <text fg={props.api.theme.current.textMuted} wrapMode="word">
            {`Expires ${date().toLocaleString()}`}
          </text>
        )}
      </Show>
      <Show when={lifetime().remaining === undefined && expiry()}>
        <text fg={props.api.theme.current.textMuted} wrapMode="word">
          Grant date unavailable or invalid; progress unknown
        </text>
      </Show>
    </box>
  )
}

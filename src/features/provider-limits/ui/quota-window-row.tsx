import { Show, createSignal, untrack } from 'solid-js'

import { useIcons } from '../../../shared/ui'
import { quotaPresentation } from '../model/quota-presentation'

import { quotaColors } from './quota-colors'
import { QuotaMeter } from './quota-meter'

import type { QuotaWindow } from '../../../entities/provider-limit'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export type ResetTimeRenderer = (props: {
  id: string
  index: number
  label: string
  value: string
  disabled: boolean
  onActivate: () => void
}) => JSX.Element

export function QuotaWindowRow(props: {
  api: TuiPluginApi
  window: QuotaWindow
  now: number
  index?: number
  renderResetTime?: ResetTimeRenderer
}) {
  const icons = useIcons()
  const [absolute, setAbsolute] = createSignal(false)
  const view = () => quotaPresentation(props.window, props.now)
  const toggle = () => {
    if (view().canToggleReset) setAbsolute((value) => !value)
  }
  const resetLabel = () => `${icons.icon('swap')} ${absolute() ? view().absoluteReset : view().relativeReset}`
  const resetControl = untrack(() =>
    props.renderResetTime?.({
      get id() {
        return props.window.id
      },
      get index() {
        return props.index ?? 0
      },
      get label() {
        return resetLabel()
      },
      get value() {
        return ''
      },
      get disabled() {
        return !view().canToggleReset
      },
      onActivate: toggle,
    }),
  )
  const color = () => {
    const pace = view().pace

    return pace === 'normal' ? props.api.theme.current.textMuted : quotaColors[pace]
  }

  return (
    <box width="100%" minWidth={0} flexShrink={1} height={5} overflow="hidden">
      <QuotaMeter
        api={props.api}
        label={icons.icon('quota')}
        value={view().compactValue}
        ratio={view().ratio}
        color={color()}
        labelAbove
        cap="top"
      />
      <QuotaMeter
        api={props.api}
        label={icons.icon('clock')}
        value={view().period.ratio === undefined ? 'Unknown' : view().period.detail}
        ratio={view().period.ratio}
        color={quotaColors.blue}
        cap="bottom"
      />
      <Show
        when={resetControl}
        fallback={
          <text
            width="100%"
            height={1}
            fg={props.api.theme.current.textMuted}
            wrapMode="none"
            truncate
            onMouseUp={(event) => {
              event.stopPropagation()
              toggle()
            }}
          >
            {resetLabel()}
          </text>
        }
      >
        {resetControl}
      </Show>
    </box>
  )
}

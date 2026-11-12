import { TextAttributes } from '@opentui/core'

import { useIcons } from '../../../shared/ui'
import { resetCreditView } from '../model/reset-credit-view'

import { ResetCreditExpiry } from './reset-credit-expiry'

import type { BankedResetCredit } from '../../../entities/provider-limit/model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function ResetCreditCard(props: {
  api: TuiPluginApi
  credit: BankedResetCredit
  now: number
  disabled: boolean
}) {
  const icons = useIcons()
  const view = () => resetCreditView(props.credit, props.now)

  return (
    <box
      id={`opencode-navigator.reset-credit.${props.credit.id}`}
      width="100%"
      minWidth={0}
      border
      borderColor={props.api.theme.current.borderSubtle}
      paddingLeft={1}
      paddingRight={1}
    >
      <text attributes={TextAttributes.BOLD} fg={props.api.theme.current.text} wrapMode="word">
        {icons.icon('reset')} {view().title}
      </text>
      <text fg={props.api.theme.current.textMuted} wrapMode="word">
        {icons.icon(view().canReview ? 'done' : 'info')} {view().status}
      </text>
      <ResetCreditExpiry api={props.api} credit={props.credit} now={props.now} />
      <text
        fg={props.disabled || !view().canReview ? props.api.theme.current.textMuted : props.api.theme.current.primary}
        wrapMode="word"
      >
        {view().canReview
          ? `${icons.icon('right')} ${props.disabled ? 'Review unavailable' : 'Review credit'}`
          : 'Cannot use this credit'}
      </text>
    </box>
  )
}

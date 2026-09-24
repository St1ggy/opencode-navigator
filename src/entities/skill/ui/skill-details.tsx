import { TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/solid'

import { useIcons } from '../../../shared/ui'

import type { SkillInfo } from '../model/controller'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { ScrollBoxRenderable } from '@opentui/core'

export function SkillDetails(props: { api: TuiPluginApi; skill: SkillInfo; ref: (body: ScrollBoxRenderable) => void }) {
  const icons = useIcons()
  const dimensions = useTerminalDimensions()
  const theme = () => props.api.theme.current

  return (
    <scrollbox
      ref={props.ref}
      maxHeight={Math.max(3, Math.floor(dimensions().height * 0.75) - 12)}
      contentOptions={{ minHeight: 0 }}
      scrollX={false}
    >
      <box>
        <box border={['bottom']} borderColor={theme().borderSubtle}>
          <text fg={theme().accent} attributes={TextAttributes.BOLD}>
            {icons.icon('info')} Description
          </text>
          <text fg={theme().textMuted} wrapMode="word">
            {props.skill.description?.trim() || 'No description available.'}
          </text>
        </box>
        <box>
          <text fg={theme().accent} attributes={TextAttributes.BOLD}>
            {icons.icon('scope')} Source
          </text>
          <text fg={theme().textMuted} wrapMode="word">
            {props.skill.location || 'Unknown'}
          </text>
        </box>
      </box>
    </scrollbox>
  )
}

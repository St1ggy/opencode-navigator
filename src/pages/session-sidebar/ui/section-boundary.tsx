import { subtleLineColor } from '../../../shared/ui'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'
import type { JSX } from 'solid-js'

export function SectionBoundary(props: { api: TuiPluginApi; divided: boolean; children: JSX.Element }) {
  const dividerColor = () => {
    const { backgroundPanel, borderSubtle } = props.api.theme.current

    return subtleLineColor(backgroundPanel, borderSubtle)
  }

  return (
    <box {...(props.divided ? { border: ['bottom'] as const, borderColor: dividerColor(), paddingBottom: 1 } : {})}>
      {props.children}
    </box>
  )
}

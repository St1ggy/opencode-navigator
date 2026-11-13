import { Show } from 'solid-js'

import { CodeModeRoutingDialog, useCodeModeTui } from '../../../features/code-mode'
import { useDialogs } from '../../../shared/ui'

import { CodeModeAction } from './code-mode-action'

import type { SidebarInteraction, SidebarPosition } from '../model/sidebar-interaction'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

export function McpRoutingControl(props: {
  api: TuiPluginApi
  interaction?: SidebarInteraction
  id: string
  position: SidebarPosition
  server: string
}) {
  const model = useCodeModeTui()
  const dialogs = useDialogs(props.api)
  const state = () => model?.routing(props.server)

  return (
    <Show when={model?.supported}>
      <CodeModeAction
        {...props}
        width={11}
        label={state()?.mode === 'code' ? 'Code Mode' : state()?.mode === 'direct' ? 'Direct' : 'Mode ?'}
        activate={() =>
          dialogs.open(() => <CodeModeRoutingDialog api={props.api} model={model!} server={props.server} />, 'large')
        }
      />
    </Show>
  )
}

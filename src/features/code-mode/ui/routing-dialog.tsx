import { createSignal, onCleanup } from 'solid-js'

import { SelectionMenu, useDialogs } from '../../../shared/ui'

import type { CodeModeController, RoutingPreview } from '../model'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

function RoutingConfirmation(props: { api: TuiPluginApi; model: CodeModeController; preview: RoutingPreview }) {
  const dialogs = useDialogs(props.api)
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  async function apply() {
    if (busy()) return

    setBusy(true)
    try {
      await props.model.apply(props.preview)

      if (!disposed) dialogs.close()
    } catch (error_) {
      if (!disposed) setError(String(error_))
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <SelectionMenu
      api={props.api}
      title={`Routing preview · ${props.preview.server}`}
      lift
      adaptive
      description={`Source: ${props.preview.path}\nScope: server configuration file; may be shared with other projects.\nSelected location: ${props.preview.target.directory}\n${props.preview.server}: codemode → ${String(props.preview.mode === 'code')}\nOnly this field changes. Connection and permission rules stay unchanged. OpenCode watches the file; in-flight work is not cancelled.\n${error()}`}
      options={[
        {
          title: busy() ? 'Saving…' : 'Apply routing change',
          value: 'apply',
          description: 'Save to the selected server configuration',
        },
        { title: 'Cancel', value: 'cancel', description: 'Return without saving' },
      ]}
      onSelect={(option) => {
        if (option.value === 'cancel') dialogs.back()
        else void apply()
      }}
    />
  )
}

export function CodeModeRoutingDialog(props: { api: TuiPluginApi; model: CodeModeController; server: string }) {
  const dialogs = useDialogs(props.api)
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const state = () => props.model.routing(props.server)
  let disposed = false

  onCleanup(() => {
    disposed = true
  })
  async function prepare(mode: 'code' | 'direct') {
    if (busy()) return

    setBusy(true)
    try {
      const preview = await props.model.preview(props.server, mode)

      if (!disposed) dialogs.open(() => <RoutingConfirmation {...props} preview={preview} />, 'large')
    } catch (error_) {
      if (!disposed) setError(String(error_))
    } finally {
      if (!disposed) setBusy(false)
    }
  }

  return (
    <SelectionMenu
      api={props.api}
      title={`MCP routing · ${props.server}`}
      lift
      adaptive
      description={`Configured: ${state().mode === 'code' ? 'Code Mode' : state().mode === 'direct' ? 'Direct' : 'Unknown'}${state().explicit ? '' : ' (default/unknown)'}\nTool availability is not exposed.\n${state().reason ?? ''}\n${error()}`}
      options={[
        { title: 'Code Mode', value: 'code', description: 'Preview codemode: true' },
        { title: 'Direct', value: 'direct', description: 'Preview codemode: false' },
      ]}
      onSelect={(option) => void prepare(option.value === 'code' ? 'code' : 'direct')}
    />
  )
}

import { Show, useContext } from 'solid-js'

import { CodeModeRunView } from './code-mode-run-view'

import type { CodeModeRunProps } from './code-mode-run-view'

// The native sidebar facade stays light; the leased Code Mode entry supplies
// the full renderer without duplicating its controller or polling lifecycle.
export function CodeModeRun(props: CodeModeRunProps) {
  const Render = useContext(CodeModeRunView)

  return (
    <Show when={Render} fallback={<text fg={props.api.theme.current.textMuted}>Code Mode view unavailable</text>}>
      {(View) => {
        const Content = View()

        return <Content {...props} />
      }}
    </Show>
  )
}

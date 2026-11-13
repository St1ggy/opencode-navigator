import { createComponent, onCleanup } from 'solid-js'
import { CodeModeActivity, ExecuteDetails, TuiCodeModeContext, createCodeModeController } from '/workspace/dist/code-mode.js'
import { DialogHeader, DialogSurface, createDialogStack } from '/workspace/dist/tui.js'

const run = {
  id: 'synthetic-message:execute', messageID: 'synthetic-message', status: 'completed',
  created: 1_893_456_000_000, started: 1_893_456_000_000, completed: 1_893_456_001_200,
  input: { code: 'const node = await tools["design-assets"]["lookup-node"]({ id: "synthetic" });\nreturn tools.documentation.search({ query: "Synthetic execute payload" });' }, output: [{ type: 'text', text: 'Synthetic execute result' }], nested: 'unavailable',
}

export function openCodeModeScene(api, scene) {
  if (scene !== 'code-mode-activity' && scene !== 'code-mode-payloads') return

  const dialogs = createDialogStack(api)

  dialogs.open(() => {
    if (scene === 'code-mode-payloads') return createComponent(ExecuteDetails, { api, run: () => run })

    const abort = new AbortController()
    const cleanups = []
    const model = createCodeModeController({
      supported: true, current: () => !abort.signal.aborted, runs: () => [run,
        { ...run, id: 'synthetic-message:discovery', created: run.created - 2000, started: run.created - 2000, completed: run.created - 2000, input: { code: 'return search({ query: "Synthetic catalog" })' } },
        { ...run, id: 'synthetic-message:error', status: 'error', created: run.created - 4000, started: run.created - 4000, completed: run.created - 3500, input: { code: 'return tools.documentation.search({ query: "Synthetic failure" })' }, output: undefined, error: { message: 'Synthetic execute failure' } },
      ],
      refresh: async () => {}, entries: async () => [], read: async () => '', write: async () => {}, subscribe: () => () => {},
    }, { key: 'synthetic-server/session/location', sessionID: 'synthetic-session', directory: '/synthetic/project' },
    { signal: abort.signal, onDispose: (cleanup) => { cleanups.push(cleanup) } })

    onCleanup(() => { abort.abort(); for (const cleanup of cleanups) cleanup() })

    return createComponent(TuiCodeModeContext.Provider, { value: model, get children() {
      return createComponent(DialogSurface, { api, lift: true, get children() {
        return [createComponent(DialogHeader, { api, title: 'Code Mode activity', icon: 'mcp', onBack: dialogs.back }),
          createComponent(CodeModeActivity, { api, navigationSection: 1 })]
      } })
    } })
  }, 'large')
}

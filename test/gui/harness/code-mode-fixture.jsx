import { createSignal, onCleanup, untrack } from 'solid-js'

import { nativeExecuteRuns } from '../../../src/app/native/code-mode-runs'
import { GuiExecuteDetails, GuiRoutingDialog } from '../../../src/features/code-mode/gui'
import { createCodeModeController } from '../../../src/features/code-mode/model'
import { GuiCodeModeActivity } from '../../../src/pages/navigator/ui/gui/code-mode-activity'
import { NavigatorGuiContext } from '../../../src/pages/navigator/ui/gui/context'

const noop = () => {
  /*
   * Static synthetic snapshots need no event subscription.
   */
}
const refresh = async () => {
  /*
   * No model or network work is performed by this fixture.
   */
}

export function CodeModeFixture(props) {
  const context = untrack(() => props.context)
  const abort = new AbortController()
  const cleanups = []
  const [text, setText] = createSignal(
    '{"mcp":{"synthetic-code-mode":{"type":"local","command":["synthetic"],"enabled":false,"codemode":true}}}',
  )
  const [writes, setWrites] = createSignal(0)
  const messages = [
    {
      type: 'assistant',
      id: 'synthetic-message',
      content: [
        {
          type: 'tool',
          id: 'running',
          name: 'execute',
          time: { created: 30 },
          state: {
            status: 'running',
            input: { code: 'return tools.design.lookup({ query: "synthetic running" })' },
            metadata: {},
          },
        },
        {
          type: 'tool',
          id: 'completed',
          name: 'execute',
          time: { created: 20, ran: 20, completed: 1220 },
          state: {
            status: 'completed',
            input: {
              code: [
                'const pages = await tools.context7["query-docs"]({ query: "synthetic payload" });',
                'const page = await tools.wiki.GetPage({ id: "synthetic" });',
                ...Array.from({ length: 60 }, (_, index) => `// Synthetic line ${index}`),
              ].join('\n'),
            },
            content: [{ type: 'text', text: 'Synthetic execute result' }],
          },
        },
        {
          type: 'tool',
          id: 'unknown',
          name: 'execute',
          time: { created: 15, ran: 15, completed: 15 },
          state: {
            status: 'completed',
            input: { code: 'return search({ query: "synthetic discovery" })' },
            content: [{ type: 'text', text: 'Synthetic discovery result' }],
          },
        },
        {
          type: 'tool',
          id: 'failed',
          name: 'execute',
          time: { created: 10, ran: 10, completed: 510 },
          state: {
            status: 'error',
            input: { code: 'throw Error("synthetic")' },
            error: { name: 'SyntheticError', message: 'Synthetic execute failure' },
          },
        },
      ],
    },
  ]
  const model = createCodeModeController(
    {
      supported: true,
      current: () => !abort.signal.aborted,
      runs: () => nativeExecuteRuns(messages),
      refresh,
      entries: async () => [{ path: '/synthetic/project/opencode.json', servers: JSON.parse(text()).mcp }],
      read: async () => text(),
      write: async (_path, value) => {
        setText(value)
        setWrites(writes() + 1)
      },
      subscribe: () => noop,
    },
    { key: 'synthetic-server/session/location', sessionID: 'synthetic-session', directory: '/synthetic/project' },
    {
      signal: abort.signal,
      onDispose: (cleanup) => {
        cleanups.push(cleanup)
      },
    },
  )

  onCleanup(() => {
    abort.abort()
    for (const cleanup of cleanups) cleanup()
  })
  const Button = context.ui.Button
  const services = {
    ui: context.ui,
    runtime: { codeMode: model },
    onCodeModeRun: (id) =>
      context.dialogs.open((handle) => (
        <GuiExecuteDetails
          ui={context.ui}
          now={model.now}
          run={() => model.runs().find((run) => run.id === id)}
          close={handle.close}
        />
      )),
  }
  const openRouting = () =>
    context.dialogs.open((handle) => (
      <GuiRoutingDialog ui={context.ui} model={model} server="synthetic-code-mode" close={handle.close} />
    ))

  return (
    <NavigatorGuiContext.Provider value={services}>
      <div data-synthetic-code-mode-layout style={{ width: '420px', 'max-width': '100%' }}>
        <GuiCodeModeActivity />
      </div>
      <Button onClick={openRouting}>Configure synthetic routing</Button>
      <p role="status">
        Saved routing changes: {writes()} · {model.routing('synthetic-code-mode').mode} · Connection stays disabled
      </p>
    </NavigatorGuiContext.Provider>
  )
}

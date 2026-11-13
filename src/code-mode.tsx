import { Show, onCleanup, untrack } from 'solid-js'

import { createNativeCodeModeSource } from './app/native/code-mode-source'
import { TuiCodeModeContext } from './features/code-mode'
import { createCodeModeController } from './features/code-mode/model'
import { SidebarContent } from './pages/session-sidebar'
import { CodeModeActivityView, CodeModeRunContent, CodeModeRunView } from './pages/session-sidebar/code-mode'

import type { CodeModeSource } from './features/code-mode/model'
import type { Plugin } from '@opencode/plugin/tui'

export { createCodeModeController } from './features/code-mode/model'
export { ExecuteDetails, TuiCodeModeContext } from './features/code-mode'
export function CodeModeActivity(props: Parameters<typeof CodeModeActivityView>[0]) {
  return (
    <CodeModeRunView.Provider value={CodeModeRunContent}>
      <CodeModeActivityView {...props} />
    </CodeModeRunView.Provider>
  )
}

type Props = Parameters<typeof SidebarContent>[0] & { hostContext?: Plugin.Context }
const noop = () => {}
const servers = new WeakMap<object, number>()
const nextServer = { value: 0 }

function sessionKey(client: object, sessionID: string, directory: string) {
  if (!servers.has(client)) servers.set(client, ++nextServer.value)

  return `${servers.get(client)}:${sessionID}:${directory}`
}

function CodeModeSession(props: Props) {
  const abort = new AbortController()
  const cleanups: (() => unknown)[] = []
  const target = untrack(() => ({
    key: sessionKey(props.hostContext?.client ?? props.api, props.sessionID, props.api.state.path.directory),
    sessionID: props.sessionID,
    directory: props.api.state.path.directory,
  }))
  const host = untrack(() => props.hostContext)
  const source: CodeModeSource = host
    ? createNativeCodeModeSource(target, () => {
        const client = host.client
        const data = host.data

        return {
          client,
          data,
          current: () =>
            !abort.signal.aborted &&
            sessionKey(props.hostContext?.client ?? props.api, props.sessionID, props.api.state.path.directory) ===
              target.key &&
            props.hostContext === host &&
            host.client === client &&
            host.data === data &&
            props.sessionID === target.sessionID &&
            props.api.state.path.directory === target.directory,
        }
      })
    : {
        supported: false,
        reason: 'This host does not expose the audited Code Mode API. Connection controls are unchanged.',
        current: () => !abort.signal.aborted,
        runs: () => [],
        refresh: async () => {},
        entries: async () => [],
        read: async () => {
          throw new Error('Routing unavailable')
        },
        write: async () => {
          throw new Error('Routing unavailable')
        },
        subscribe: () => noop,
      }
  const model = createCodeModeController(source, target, {
    signal: abort.signal,
    onDispose: (cleanup) => {
      cleanups.push(cleanup)
    },
  })

  onCleanup(() => {
    abort.abort()
    for (const cleanup of cleanups) void cleanup()
  })

  return (
    <TuiCodeModeContext.Provider value={model}>
      <CodeModeRunView.Provider value={CodeModeRunContent}>
        <SidebarContent {...props} />
      </CodeModeRunView.Provider>
    </TuiCodeModeContext.Provider>
  )
}

export function CodeModeSidebar(props: Props) {
  return (
    <Show
      keyed
      when={sessionKey(props.hostContext?.client ?? props.api, props.sessionID, props.api.state.path.directory)}
    >
      {(_key) => <CodeModeSession {...props} />}
    </Show>
  )
}

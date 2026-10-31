import { parse } from 'jsonc-parser'

import { createTodoSetupController } from '../../src/features/native-todo-setup'

import type { ConfigDocument, TodoSetupSource } from '../../src/features/native-todo-setup/model/types'

export function todoSetupFixture() {
  const lifecycle = new AbortController()
  const path = '/synthetic/opencode-v2.jsonc'
  let directory = '/synthetic'
  let route = 'session-one'
  let text =
    '// Keep this comment\r\n{\r\n  "model": "example/model",\r\n  "experimental": { "todo": false, "schedules": true, },\r\n}\r\n'
  let entries: ConfigDocument[] | undefined
  let failRead = false
  let failWrite = false
  let notify: ((directory?: string) => void) | undefined
  const writes: string[] = []
  const source: TodoSetupSource = {
    async entries() {
      if (failRead) throw new Error('Synthetic read failure')

      return entries ?? [{ path, experimental: { todo: parse(text).experimental.todo } }]
    },
    read: async () => text,
    async write(_target, _path, value) {
      if (failWrite) throw new Error('Synthetic write failure')

      writes.push(value)
      text = value
    },
    subscribe(refresh) {
      notify = refresh

      return () => {
        notify = undefined
      }
    },
  }
  const model = createTodoSetupController({
    source,
    signal: lifecycle.signal,
    route: () => route,
    target: (sessionID) => ({ key: `${sessionID}:${directory}`, sessionID, routing: { directory } }),
  })

  return {
    model,
    source,
    path,
    writes,
    lifecycle,
    text: () => text,
    changeText(value: string) {
      text = value
    },
    changeEntries(value: ConfigDocument[] | undefined) {
      entries = value
    },
    changeDirectory(value: string) {
      directory = value
    },
    changeRoute(value: string) {
      route = value
    },
    failRead(value: boolean) {
      failRead = value
    },
    failWrite(value: boolean) {
      failWrite = value
    },
    notify: (value?: string) => notify?.(value),
  }
}

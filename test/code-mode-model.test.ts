import { expect, test } from 'bun:test'
import { createRoot } from 'solid-js'

import { nativeExecuteRuns } from '../src/app/native/code-mode-runs'
import {
  createCodeModeController,
  executeDuration,
  patchRouting,
  payloadText,
  routingState,
} from '../src/features/code-mode/model'

import type { CodeModeSource } from '../src/features/code-mode/model'

test('routing changes preserve JSONC comments, credentials, disabled state and exact server names', () => {
  const text =
    '{ // keep\n "mcp": {"servers": {"a.b": {"type":"remote", "url":"https://synthetic.invalid", "headers":{"secret":"unchanged"}, "disabled":true, "codemode":true}, "a":{"type":"local","command":["synthetic"]}}}}'
  const next = patchRouting(text, 'a.b', 'direct')

  expect(next).toBe(text.replace('"codemode":true', '"codemode":false'))
  expect(() => patchRouting(text, 'absent', 'code')).toThrow('absent')
  expect(payloadText(undefined)).toContain('Not exposed')
  expect(payloadText({ zero: 0 })).toContain('"zero": 0')
  const inherited =
    '\u{FEFF}{ // keep comment\n "mcp":{"servers":{"exact":{"type":"local","command":["synthetic"],"disabled":true}}}}'
  const inserted = patchRouting(inherited, 'exact', 'direct')

  expect(inserted).toStartWith('\u{FEFF}')
  expect(inserted).toContain('// keep comment')
  expect(Bun.JSONC.parse(inserted.slice(1))).toEqual({
    mcp: {
      servers: {
        exact: { type: 'local', command: ['synthetic'], disabled: true, codemode: false },
      },
    },
  })
  expect(() =>
    patchRouting('{"mcp":{"servers":{"exact":{"type":"local","codemode":true,"codemode":false}}}}', 'exact', 'code'),
  ).toThrow('Duplicate')
})

test('routing identity and configured default are not tool availability or connection state', () => {
  expect(
    routingState(
      [
        { path: '/synthetic/global.json', servers: { exact: { type: 'remote', codemode: false } } },
        { path: '/synthetic/project.json', servers: { exact: { type: 'remote', codemode: true } } },
      ],
      'exact',
    ),
  ).toEqual({ mode: 'code', explicit: true, source: '/synthetic/project.json' })
  expect(routingState([{ servers: { exact: { type: 'local' } } }], 'exact').mode).toBe('code')
  expect(routingState([], 'exact').mode).toBe('unknown')
  expect(
    routingState(
      [
        { path: '/synthetic/global.json', servers: { exact: { type: 'remote', codemode: false } } },
        { path: '/synthetic/project.json', servers: { exact: { type: 'remote' } } },
      ],
      'exact',
    ).mode,
  ).toBe('direct')
  expect(routingState([{ servers: { exact: { type: 'local', codemode: 'invalid' } } }], 'exact').mode).toBe('unknown')
})

test('execute snapshots expose only public payloads without inferring nested tools from JavaScript', () => {
  const result = nativeExecuteRuns([
    {
      type: 'assistant',
      id: 'message',
      content: [
        {
          type: 'tool',
          id: 'run',
          name: 'execute',
          time: { created: 10, ran: 20, completed: 30 },
          state: {
            status: 'completed',
            input: { code: 'tools.github.fake()' },
            content: [{ type: 'text', text: 'result' }],
            metadata: { pretend: { tools: ['github'] } },
          },
        },
        {
          type: 'tool',
          id: 'direct',
          name: 'github_fake',
          time: { created: 10 },
          state: { status: 'running', input: {} },
        },
      ],
    } as any,
  ])

  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({
    id: 'message:run',
    status: 'completed',
    nested: 'unavailable',
    started: 20,
    completed: 30,
  })
  expect(result[0].output).toEqual([{ type: 'text', text: 'result' }])
  expect(executeDuration(result[0], 1000)).toBe('0.0s')
  expect(executeDuration({ ...result[0], started: undefined }, 1000)).toBe('Duration unavailable')
  expect(
    nativeExecuteRuns(
      [
        { type: 'assistant', id: 'boundary', content: [] },
        { type: 'assistant', id: 'later', content: [] },
      ] as any,
      'boundary',
    ),
  ).toEqual([])
})

test('preview is read-only; changed file/location and duplicate writes reject before mutation', async () => {
  await new Promise<void>((resolve, reject) =>
    createRoot((dispose) => {
      const abort = new AbortController()
      let text = '{"mcp":{"servers":{"exact":{"type":"local","command":["synthetic"],"codemode":true}}}}'
      let current = true
      let writes = 0
      const source: CodeModeSource = {
        supported: true,
        runs: () => [],
        current: () => current,
        subscribe: () => () => {},
        refresh: async () => {},
        entries: async () => [
          { path: '/synthetic/config.json', servers: { exact: { type: 'local', codemode: true } } },
        ],
        read: async () => text,
        write: async (_path, value) => {
          writes++
          text = value
        },
      }
      const controller = createCodeModeController(
        source,
        { key: 'server/session/directory', sessionID: 'session', directory: '/synthetic' },
        { signal: abort.signal, onDispose: () => {} },
      )

      void (async () => {
        const preview = await controller.preview('exact', 'direct')

        expect(writes).toBe(0)
        text += '\n'
        expect(
          await controller
            .apply(preview)
            .then(() => false)
            .catch(() => true),
        ).toBe(true)
        expect(writes).toBe(0)
        const fresh = await controller.preview('exact', 'direct')

        await controller.apply(fresh)
        expect(writes).toBe(1)
        current = false
        expect(
          await controller
            .preview('exact', 'code')
            .then(() => false)
            .catch(() => true),
        ).toBe(true)
        abort.abort()
      })()
        .then(resolve)
        .catch(reject)
        .finally(dispose)
    }),
  )
})

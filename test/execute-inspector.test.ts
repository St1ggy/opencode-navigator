import { expect, test } from 'bun:test'
import { createRoot, createSignal } from 'solid-js'

import { createExecuteInspector, executePayloadContent } from '../src/features/code-mode/model'

import type { ExecuteRun } from '../src/features/code-mode/model'

test('readable payloads use only exact public code/text envelopes and raw retains every field', () => {
  expect(executePayloadContent('input', { code: 'return 42' }, false)).toMatchObject({
    text: 'return 42',
    language: 'javascript',
  })
  const extra = { code: 'return 42', extra: false }

  expect(executePayloadContent('input', extra, false).text).toBe('return 42')
  expect(executePayloadContent('input', extra, true).text).toContain('"extra": false')
  expect(executePayloadContent('output', [{ type: 'text', text: 'result' }], false).text).toBe('result')
  expect(executePayloadContent('output', [{ type: 'text', text: 'result', metadata: 0 }], false).text).toContain(
    '"metadata": 0',
  )
  expect(executePayloadContent('output', false, true).text).toBe('false')
  expect(executePayloadContent('output', null, true).text).toBe('null')
  expect(executePayloadContent('output', 'result', true).text).toBe('"result"')
  expect(executePayloadContent('error', undefined, false).available).toBe(false)
})

test('inspector retains per-tab raw view and scroll, follows payload updates without forcing selection', () => {
  createRoot((dispose) => {
    const [run, setRun] = createSignal<ExecuteRun>({
      id: 'run',
      messageID: 'message',
      created: 0,
      status: 'completed',
      input: { code: 'synthetic' },
      output: 'result',
      nested: 'unavailable',
    })
    const model = createExecuteInspector(run)

    expect(model.tab()).toBe('output')
    model.toggleRaw()
    model.savePosition(model.key(), 42)
    model.move(1)
    expect(model.tab()).toBe('error')
    expect(model.content().available).toBe(false)
    model.setTab('output')
    expect(model.raw()).toBe(true)
    expect(model.position(model.key())).toBe(42)
    setRun({ ...run(), output: 'updated' })
    expect(model.content().text).toBe('"updated"')
    expect(model.tab()).toBe('output')
    dispose()
  })
})

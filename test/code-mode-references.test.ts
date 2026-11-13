import { expect, test } from 'bun:test'

import { executeCodeReferences } from '../src/features/code-mode/model'

test('code references preserve exact namespace/method spelling, order and one run with several references', () => {
  expect(
    executeCodeReferences({
      code: 'await tools.context7["query-docs"]({}); await tools["wiki"].GetPage({}); return tools.context7["query-docs"]({})',
    }),
  ).toEqual({
    items: [
      { namespace: 'context7', method: 'query-docs' },
      { namespace: 'wiki', method: 'GetPage' },
    ],
    incomplete: false,
  })
  expect(executeCodeReferences({ code: 'if (false) await tools.wiki.GetPage({})' }).items).toHaveLength(1)
})

test('strings/comments/object properties are not promoted into tools namespace references', () => {
  expect(
    executeCodeReferences({
      code: '"tools.fake.call()"; // tools.comment.call()\n /* tools.block.call() */ obj.tools.foreign.call(); tools.actual.method()',
    }),
  ).toEqual({ items: [{ namespace: 'actual', method: 'method' }], incomplete: false })
})

test('dynamic, escaped, unsupported or missing code remains explicitly unresolved without evaluation', () => {
  for (const input of [
    undefined,
    {},
    '{"code":"tools.fake.call()"}',
    { code: 'tools[name][method]({})' },
    { code: String.raw`tools["na\u006de"].method()` },
    { code: '`tools.template.fake()`' },
    { code: '/tools.regex.fake()/u' },
    { code: 'obj.#tools.private.method()' },
    { code: '\u{3C0}tools.notHost.method()' },
  ])
    expect(executeCodeReferences(input)).toEqual({ items: [], incomplete: true })

  expect(executeCodeReferences({ code: 'tools.actual.method(); const text = `tools.fake.method()`' })).toEqual({
    items: [{ namespace: 'actual', method: 'method' }],
    incomplete: true,
  })
})

test('optional/static bracket references are supported and work is bounded', () => {
  expect(executeCodeReferences({ code: 'tools?.["design-server"]?.["lookup-node"]?.({})' }).items).toEqual([
    { namespace: 'design-server', method: 'lookup-node' },
  ])
  const result = executeCodeReferences({
    code: Array.from({ length: 70 }, (_, index) => `tools.server.method${index}()`).join(';'),
  })

  expect(result.items).toHaveLength(64)
  expect(result.incomplete).toBe(true)
  expect(executeCodeReferences({ code: ' '.repeat(200_001) }).incomplete).toBe(true)
})

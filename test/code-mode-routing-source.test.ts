import { expect, test } from 'bun:test'

import { patchRouting } from '../src/features/code-mode/model'

test('routing preview preserves a legacy MCP source after the host normalizes its effective configuration', () => {
  const source =
    '{ // preserved\n "mcp": {"exact": {"type":"remote","url":"https://synthetic.invalid","headers":{"Authorization":"unchanged"},"enabled":true}}}'
  const result = patchRouting(source, 'exact', 'direct')
  const parsed = JSON.parse(result.replace('// preserved', ''))

  expect(parsed.mcp.exact.codemode).toBe(false)
  expect(parsed.mcp.servers).toBeUndefined()
  expect(parsed.mcp.exact.headers.Authorization).toBe('unchanged')
  expect(parsed.mcp.exact.enabled).toBe(true)
  expect(result).toContain('// preserved')
})

test('routing preview accepts a partial highest-precedence server override without copying inherited fields', () => {
  const result = patchRouting('{"mcp":{"servers":{"exact":{"codemode":true}}}}', 'exact', 'direct')

  expect(JSON.parse(result)).toEqual({ mcp: { servers: { exact: { codemode: false } } } })
})

test('routing preview refuses ambiguous legacy/native definitions and duplicate source fields', () => {
  expect(() =>
    patchRouting('{"mcp":{"exact":{"type":"local"},"servers":{"exact":{"type":"local"}}}}', 'exact', 'code'),
  ).toThrow('ambiguous')
  expect(() =>
    patchRouting('{"mcp":{"exact":{"type":"local","codemode":true,"codemode":false}}}', 'exact', 'code'),
  ).toThrow('Duplicate')
})

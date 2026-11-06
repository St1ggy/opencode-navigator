import { defineEnum, defineStruct } from 'bun-ffi-structs'
import { expect, test } from 'bun:test'

test('the FFI helper preserves scalar, enum and nested struct packing with TypeScript 6', () => {
  const state = defineEnum({ idle: 0, busy: 1 })
  const point = defineStruct([
    ['x', 'i32'],
    ['y', 'i32'],
  ])
  const record = defineStruct([
    ['id', 'u32'],
    ['enabled', 'bool_u8'],
    ['state', state],
    ['point', point],
  ])
  const input = { id: 42, enabled: true, state: 'busy' as const, point: { x: -3, y: 8 } }
  const packed = record.pack(input)
  const decoded = record.unpack(packed)

  expect(decoded).toEqual(input)
  const id: number = decoded.id
  const enabled: boolean = decoded.enabled
  const status: 'idle' | 'busy' = decoded.state
  const x: number = decoded.point.x

  expect([id, enabled, status, x]).toEqual([42, true, 'busy', -3])
})

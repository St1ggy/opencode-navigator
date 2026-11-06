import { expect, test } from 'bun:test'

test('settled Bun promise matchers can finish synchronously without artificial thenables', () => {
  const resolved = expect(Promise.resolve('ready')).resolves.toBe('ready')
  const rejected = expect(Promise.reject(new Error('denied'))).rejects.toThrow('denied')

  expect(resolved).toBeUndefined()
  expect(rejected).toBeUndefined()
  expect(() => expect(Promise.resolve('actual')).resolves.toBe('expected')).toThrow()
})

test('normalizing a pending Bun matcher waits for completion and propagates failures', async () => {
  let completed = false
  const delayed = async () => {
    await Bun.sleep(5)
    completed = true

    return 'ready'
  }

  await Promise.resolve(expect(delayed()).resolves.toBe('ready'))
  expect(completed).toBe(true)
  let rejected = false

  try {
    await Promise.resolve(expect(delayed()).resolves.toBe('wrong'))
  } catch {
    rejected = true
  }
  expect(rejected).toBe(true)
})

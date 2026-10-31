import { expect, test } from 'bun:test'

import { todoConfig } from '../src/features/native-todo-setup/model/config'
import { enableTodoConfig } from '../src/features/native-todo-setup/model/config-patch'

import { todoSetupFixture } from './fixtures/todo-setup'

test('native Todo configuration uses the last experimental object, not task count or a deep merge', () => {
  expect(
    todoConfig([
      { path: '/global.json', experimental: { todo: true } },
      { path: '/project.json', experimental: {} },
    ]),
  ).toMatchObject({ enabled: false, files: ['/project.json'] })
  expect(todoConfig([{ path: '/global.json', experimental: { todo: true } }, { path: '/project.json' }])).toMatchObject(
    { enabled: true, files: ['/global.json'] },
  )
  expect(todoConfig([{ experimental: { todo: false } }, { path: '/project.json' }]).files).toEqual([])
  expect(todoConfig([{ path: '/project.json' }])).toMatchObject({ enabled: false, files: ['/project.json'] })
})

test('native Todo JSONC edits preserve comments, BOM, CRLF and unrelated settings', () => {
  const source =
    '\u{FEFF}// keep\r\n{ "model": "example/model", "experimental": { "todo": false, "schedules": true, }, }\r\n'

  expect(enableTodoConfig(source)).toBe(source.replace('false', 'true'))
  expect(enableTodoConfig('{"model":"example/model"}')).toContain('"todo": true')
  for (const invalid of [
    '[]',
    '{broken',
    '{"experimental":null}',
    '{"experimental":{},"experimental":{}}',
    '{"experimental":{"todo":false,"todo":true}}',
    '{"experimental":{"todo":"false"}}',
  ])
    expect(() => enableTodoConfig(invalid)).toThrow()
})

test('native Todo preview does not write and explicit apply preserves file content', async () => {
  const h = todoSetupFixture()

  try {
    await h.model.refresh('session')
    expect(h.model.state('session').enabled).toBe(false)
    const original = h.text()
    const preview = await h.model.prepare('session', h.path)

    expect(h.writes).toEqual([])
    await h.model.apply(preview)
    expect(h.writes).toEqual([original.replace('false', 'true')])
    expect(h.model.state('session')).toMatchObject({ status: 'ready', enabled: true })
  } finally {
    h.lifecycle.abort()
  }
})

test.each(['file', 'directory', 'route', 'sources'] as const)(
  'native Todo refuses a stale %s preview without writing',
  async (change) => {
    const h = todoSetupFixture()

    try {
      const preview = await h.model.prepare('session', h.path)

      const changes = {
        file: () => h.changeText(`${h.text()}// changed\n`),
        directory: () => h.changeDirectory('/other'),
        route: () => h.changeRoute('session-two'),
        sources: () => h.changeEntries([{ path: '/higher.json', experimental: { todo: false } }]),
      }

      changes[change]()

      await expect(h.model.apply(preview)).rejects.toThrow(/changed/iu)
      expect(h.writes).toEqual([])
    } finally {
      h.lifecycle.abort()
    }
  },
)

test('native Todo exposes retryable config errors and preserves the draft after write failure', async () => {
  const h = todoSetupFixture()

  try {
    h.failRead(true)
    await h.model.refresh('session')
    expect(h.model.state('session')).toMatchObject({ status: 'error' })
    h.failRead(false)
    await h.model.refresh('session')
    const preview = await h.model.prepare('session', h.path)

    h.failWrite(true)
    await expect(h.model.apply(preview)).rejects.toThrow('Synthetic write failure')
    expect(h.text()).toBe(preview.original)
    h.failWrite(false)
    await h.model.refresh('session')
    await h.model.apply(await h.model.prepare('session', h.path))
    expect(h.model.state('session').enabled).toBe(true)
  } finally {
    h.lifecycle.abort()
  }
})

test('native Todo blocks duplicate saves and ignores foreign config events', async () => {
  const h = todoSetupFixture()

  try {
    await h.model.refresh('session')
    h.changeText(h.text().replace('false', 'true'))
    h.notify('/other')
    expect(h.model.state('session').enabled).toBe(false)
    h.notify('/synthetic')
    await Bun.sleep(5)
    expect(h.model.state('session').enabled).toBe(true)
    h.changeText(h.text().replace('true', 'false'))
    const preview = await h.model.prepare('session', h.path)
    const save = h.model.apply(preview)

    await expect(h.model.apply(preview)).rejects.toThrow('already being saved')
    await save
    expect(h.writes).toHaveLength(1)
    h.lifecycle.abort()
    await expect(h.model.prepare('session', h.path)).rejects.toThrow('changed')
  } finally {
    h.lifecycle.abort()
  }
})

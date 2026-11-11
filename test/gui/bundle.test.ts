import { expect, test } from 'bun:test'
import { Schema } from 'effect'
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import * as Solid from 'solid-js'

import metadata from '../../package.json'

type Definition = {
  setup(context: unknown): void
  main(context: unknown): void
}

const native = createRequire(import.meta.url)
const solidRuntime: Record<string, unknown> = { ...Solid }

function unexpectedRender() {
  throw new Error('GUI setup must not render a host component')
}

function definition(main = false) {
  const exports: { default?: Definition } = {}
  const imports: string[] = []
  let evaluating = true

  runInNewContext(readFileSync('dist/gui-experimental.cjs', 'utf8'), {
    exports,
    AbortSignal,
    get window() {
      if (evaluating) throw new Error('Module-scope window access')

      return { innerWidth: 1200, innerHeight: 800 }
    },
    process: main ? { env: { XDG_STATE_HOME: '/synthetic/state' } } : undefined,
    require(name: string) {
      imports.push(name)

      if (name === '@opencode/plugin/gui')
        return {
          Plugin: { define: (value: Definition) => value },
          Command: Symbol('command'),
          Panel: Symbol('panel'),
          Slot: Symbol('slot'),
          Ipc: { define: (value: unknown) => value },
        }

      if (name === 'effect') return { Schema }

      if (name === 'solid-js')
        return new Proxy(
          {},
          {
            get:
              (_target, key: string) =>
              (...args: unknown[]) => {
                // A context declaration only allocates its descriptor; it starts no owner, effect or renderer.
                if (evaluating && key !== 'createContext') throw new Error('Module-scope renderer access')

                return (solidRuntime[key] as (...values: unknown[]) => unknown)(...args)
              },
          },
        )

      if (name === 'solid-js/web')
        return {
          // The official transform declares lazy templates/delegated event names at module scope.
          template: () => () => {
            throw new Error('Unexpected DOM rendering in a bundle contract test')
          },
          delegateEvents: () => {},
        }

      if (name.startsWith('node:'))
        return main
          ? native(name)
          : new Proxy(
              {},
              {
                get: () => () => {
                  throw new Error('Module-scope platform access')
                },
              },
            )

      throw new Error(`Unexpected GUI dependency: ${name}`)
    },
  })
  evaluating = false

  return { value: exports.default!, imports }
}

test('GUI is one independent CommonJS file with inert setup and main declarations', () => {
  const loaded = definition()

  expect(metadata.exports['./gui-experimental']).toBe('./dist/gui-experimental.cjs')
  expect(readdirSync('dist').filter((file) => file.startsWith('gui-experimental'))).toEqual(['gui-experimental.cjs'])
  expect(typeof loaded.value.setup).toBe('function')
  expect(typeof loaded.value.main).toBe('function')
  expect(loaded.imports).toContain('@opencode/plugin/gui')
  expect(
    loaded.imports.every(
      (name) =>
        ['effect', 'solid-js', 'solid-js/web', '@opencode/plugin/gui'].includes(name) || name.startsWith('node:'),
    ),
  ).toBe(true)
  expect(readFileSync('dist/gui-experimental.cjs', 'utf8')).not.toMatch(/@opentui\/|bun:ffi|bun-ffi|web-tree-sitter/u)
})

test('GUI setup contributes a host-owned version command without a TUI API', async () => {
  const commands: { id: string; title: string; run(): void | Promise<void> }[] = []
  const toasts: { title: string; variant: string }[] = []
  const settings: string[] = []

  definition().value.setup({
    id: 'synthetic.navigator',
    signal: new AbortController().signal,
    main: () => ({ flush: async () => {}, load: async () => '{}' }),
    sessions: { current: () => {} },
    router: { path: () => '/' },
    tabs: { list: () => [] },
    servers: { get: () => {} },
    layout: { narrow: () => false, settings: (id: string) => settings.push(id) },
    ui: { Dialog: unexpectedRender, Button: unexpectedRender },
    storage: { memory: (_key: string, options: { initial: object }) => [options.initial, () => {}] },
    t: (value: string) => value,
    add: (_registry: unknown, item: object | (() => object)) => {
      const value = typeof item === 'function' ? item() : item

      if ('run' in value) commands.push(value as (typeof commands)[number])
    },
    toast: {
      show: (toast: { title: string; variant: string }) => {
        toasts.push(toast)
      },
    },
  })
  expect(commands.map((command) => command.id)).toEqual(['settings', 'toolbar', 'search', 'open', 'float', 'version'])
  await Promise.resolve(commands.find((command) => command.id === 'settings')!.run())
  expect(settings).toEqual(['synthetic.navigator.settings'])
  expect(toasts).toEqual([])
  await Promise.resolve(commands.find((command) => command.id === 'version')!.run())
  expect(toasts).toEqual([{ title: `Navigator ${metadata.version}`, variant: 'default' }])
})

test('GUI main starts only when called by its real host', () => {
  const logs: string[] = []

  definition(true).value.main({
    id: 'synthetic.navigator',
    provide: () => {},
    onCleanup: () => {},
    log: {
      write: (_level: string, message: string) => {
        logs.push(message)
      },
    },
  })
  expect(logs).toEqual([`Navigator ${metadata.version} Desktop main ready`])
})

import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { PLUGIN_ID } from '../shared/config'

import type { VersionUpdater } from '../features/version-footer'
import type { Plugin } from '@opencode/plugin/tui'
import type { TuiPluginApi, TuiPluginMeta } from '@opencode-ai/plugin/tui'

type Run = (command: readonly string[]) => Promise<void>
type ReadConfig = (path: string) => Promise<unknown>

const run: Run = async (command) => {
  const child = Bun.spawn([...command], { stdout: 'ignore', stderr: 'pipe' })
  const error = new Response(child.stderr).text()

  const exitCode = await child.exited

  if (exitCode === 0) return

  const message = await error

  throw new Error(message.trim() || `Command failed with exit code ${child.exitCode}`)
}

const readConfig: ReadConfig = async (path) => {
  const file = Bun.file(path)

  return (await file.exists()) ? Bun.JSONC.parse(await file.text()) : undefined
}

function pinnedUpdate(wrapper: string, target: string, execute: Run) {
  if (basename(wrapper) !== 'tui.js' || basename(dirname(wrapper)) !== 'opencode-navigator')
    throw new Error('Unrecognized local Navigator source')

  const installer = fileURLToPath(new URL('../scripts/update-local-snapshot.mjs', import.meta.url))

  return execute(['node', installer, wrapper, target])
}

function configHasPlugin(value: unknown, spec: string) {
  if (!value || typeof value !== 'object') return false

  const plugins = (value as { plugin?: unknown }).plugin

  return (
    Array.isArray(plugins) &&
    plugins.some((item) => {
      let configured = item

      if (Array.isArray(item)) configured = item[0]
      else if (item && typeof item === 'object') configured = (item as { package?: unknown }).package

      return configured === spec
    })
  )
}

async function v1Global(api: TuiPluginApi, spec: string, read: ReadConfig) {
  const configRoot =
    process.env.OPENCODE_CONFIG_DIR ?? join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'opencode')
  const global = join(configRoot, 'tui.json')
  const configured = api.state.path.config.endsWith('.json')
    ? api.state.path.config
    : join(api.state.path.config, 'tui.json')
  const local = new Set([configured, join(api.state.path.worktree, '.opencode', 'tui.json')])

  local.delete(global)
  for (const path of local) if (configHasPlugin(await read(path), spec)) return false

  return configHasPlugin(await read(global), spec)
}

export function createOpenCodeV1VersionUpdater(
  api: TuiPluginApi,
  meta: TuiPluginMeta,
  execute: Run = run,
  read: ReadConfig = readConfig,
): VersionUpdater {
  return {
    openCode: (target) => execute([process.execPath, 'upgrade', target]),
    async navigator(target) {
      if (meta.source === 'file') {
        const wrapper = meta.spec.startsWith('file://') ? fileURLToPath(meta.spec) : meta.spec

        return pinnedUpdate(wrapper, target, execute)
      }

      if (meta.source !== 'npm') throw new Error('Unrecognized local Navigator source')

      const result = await api.plugins.install(`opencode-navigator@${target}`, {
        global: await v1Global(api, meta.spec, read),
      })

      if (!result.ok) throw new Error(result.message)
    },
  }
}

export function createOpenCodeV2VersionUpdater(context: Plugin.Context, execute: Run = run): VersionUpdater {
  return {
    openCode: (target) => execute([process.execPath, 'upgrade', target]),
    async navigator(target) {
      const response = await context.client.plugin.list(context.location ? { location: context.location } : {})
      const item = response.data.find((plugin) => plugin.id === PLUGIN_ID)

      if (!item) throw new Error('Navigator is not in the active plugin list')

      if (item.source.type === 'local')
        return pinnedUpdate(
          basename(item.source.path) === 'tui.js' ? item.source.path : join(item.source.path, 'tui.js'),
          target,
          execute,
        )

      if (item.source.type !== 'package') throw new Error('Unrecognized local Navigator source')

      if (isAbsolute(item.source.target)) return pinnedUpdate(join(item.source.target, 'tui.js'), target, execute)

      if (item.source.target.startsWith('file://'))
        return pinnedUpdate(join(fileURLToPath(item.source.target), 'tui.js'), target, execute)

      if (item.source.target.startsWith('.')) throw new Error('Unrecognized local Navigator source')

      await context.client.plugin.update({ location: response.location, targets: [item.source.target] })
    },
  }
}

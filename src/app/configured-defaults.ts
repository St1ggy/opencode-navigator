import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  type ConfiguredDefaults,
  configuredDefaultsFromPluginOptions,
  mergeConfiguredDefaults,
  parseConfiguredDefaults,
} from '../entities/preferences'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

type ProjectReader = () => Promise<string | undefined>

function isMissing(error: unknown) {
  const value = error as { code?: string; status?: number; statusCode?: number; message?: string }

  return (
    value?.code === 'ENOENT' ||
    value?.status === 404 ||
    value?.statusCode === 404 ||
    /not found|enoent/i.test(value?.message ?? '')
  )
}

async function readSource(
  source: string,
  read: () => Promise<string | undefined>,
): Promise<ConfiguredDefaults | undefined> {
  try {
    const content = await read()

    if (!content?.trim()) return

    return parseConfiguredDefaults(JSON.parse(content))
  } catch (error) {
    if (isMissing(error)) return

    throw new Error(`${source}: ${error instanceof Error ? error.message : 'could not be read'}`, { cause: error })
  }
}

export async function loadConfiguredDefaults(
  api: TuiPluginApi,
  options: Record<string, unknown> | undefined,
  readProject?: ProjectReader,
) {
  const userPath = api.state.path.config
    ? join(dirname(api.state.path.config), '.opencode-navigator', 'settings.json')
    : undefined
  const safe = async (request: Promise<ConfiguredDefaults | undefined> | undefined) => {
    try {
      return await request
    } catch (error) {
      api.ui.toast({
        variant: 'warning',
        title: 'Navigator configuration',
        message: error instanceof Error ? error.message : 'Navigator configuration could not be loaded',
        duration: 5000,
      })

      return
    }
  }
  const [user, project] = await Promise.all([
    safe(userPath ? readSource(userPath, () => readFile(userPath, 'utf8')) : undefined),
    safe(readProject ? readSource('.opencode/navigator.json', readProject) : undefined),
  ])

  return mergeConfiguredDefaults(configuredDefaultsFromPluginOptions(options), user, project)
}

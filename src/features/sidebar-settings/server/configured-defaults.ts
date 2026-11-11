import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  configuredDefaultsFromPluginOptions,
  mergeConfiguredDefaults,
  parseConfiguredDefaults,
} from '../../../entities/preferences/configuration'

import type { Context } from '@opencode/plugin/promise/plugin'

export async function readServerConfiguredDefaults(host: Context, project: boolean) {
  const warnings: string[] = []

  async function read(path: string, label: string) {
    try {
      const source = await readFile(path, 'utf8')

      if (source.length > 1_000_000) throw new Error('Configuration is too large')

      return parseConfiguredDefaults(JSON.parse(source))
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
        warnings.push(
          `${label} could not be loaded. Check its JSON and permissions, then reload Navigator preferences.`,
        )

      return
    }
  }

  const configRoot = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  const userPath = join(configRoot, '.opencode-navigator/settings.json')
  const [user, local] = await Promise.all([
    read(userPath, 'User Navigator defaults'),
    project && !host.location.workspaceID
      ? read(join(host.location.directory, '.opencode/navigator.json'), 'Project Navigator defaults')
      : undefined,
  ])

  return {
    defaults: mergeConfiguredDefaults(configuredDefaultsFromPluginOptions(host.options), user, local),
    warnings,
  }
}

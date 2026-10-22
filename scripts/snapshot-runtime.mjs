import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGES = ['@opencode/plugin', '@opentui/core', '@opentui/keymap', '@opentui/solid', 'solid-js']

export async function snapshotRuntime(directory, fallback) {
  let source

  try {
    source = await readFile(join(directory, 'dist', 'runtime-dependencies.json'), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return fallback

    throw error
  }

  const manifest = JSON.parse(source)
  const dependencies = manifest?.dependencies

  if (
    manifest?.version !== 1 ||
    Object.keys(manifest).some((key) => !['version', 'dependencies'].includes(key)) ||
    !dependencies ||
    typeof dependencies !== 'object' ||
    Array.isArray(dependencies) ||
    Object.keys(dependencies).length !== PACKAGES.length ||
    PACKAGES.some((name) => typeof dependencies[name] !== 'string' || !/^\d+\.\d+\.\d+$/.test(dependencies[name]))
  )
    throw new Error('Navigator package has an invalid runtime dependency manifest')

  return Object.fromEntries(PACKAGES.map((name) => [name, dependencies[name]]))
}

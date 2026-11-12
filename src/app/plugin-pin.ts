import { findNodeAtLocation, getNodeValue, parseTree } from 'jsonc-parser'

import { serverFileTarget } from '../shared/lib/server-file'
import { isNewerVersion } from '../shared/lib/version'

import type { OpenCodeClient } from '@opencode/client'
import type { ParseError } from 'jsonc-parser'

export function exactNavigatorPin(target: string) {
  return /^opencode-navigator@(\d+\.\d+\.\d+)$/.exec(target)?.[1]
}

export async function latestNavigator(signal: AbortSignal) {
  const response = await fetch('https://registry.npmjs.org/opencode-navigator/latest', { signal, cache: 'no-store' })

  if (!response.ok) throw new Error(`Navigator registry check failed (${response.status})`)

  const data = (await response.json()) as { version?: unknown }

  if (typeof data.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.version))
    throw new Error('The registry returned an invalid Navigator version')

  return data.version
}

export function pluginPinEdit(text: string, target: string, version: string) {
  const old = exactNavigatorPin(target)

  if (!old || !isNewerVersion(version, old)) throw new Error('Invalid pinned Navigator update target')

  const errors: ParseError[] = []
  const root = parseTree(text, errors, { allowTrailingComma: true })

  if (!root || errors.length > 0) throw new Error('Navigator configuration is invalid; no changes were made')

  const paths: (string | number)[][] = []

  for (const key of ['plugins', 'plugin']) {
    const list = findNodeAtLocation(root, [key])

    const nodes = list?.type === 'array' ? (list.children ?? []) : []

    for (const [index, node] of nodes.entries()) {
      const value = getNodeValue(node)
      const path = [key, index]

      if (value === target) paths.push(path)
      else if (Array.isArray(value) && value[0] === target) paths.push([...path, 0])
      else if (value?.package === target) paths.push([...path, 'package'])
    }
  }

  if (paths.length === 0) return

  if (paths.length !== 1) throw new Error('Navigator pin is ambiguous; no changes were made')

  const node = findNodeAtLocation(root, paths[0])!

  return (
    text.slice(0, node.offset) + JSON.stringify(`opencode-navigator@${version}`) + text.slice(node.offset + node.length)
  )
}

export async function advanceServerPin(
  client: OpenCodeClient,
  location: Parameters<OpenCodeClient['config']['get']>[0],
  target: string,
  version: string,
  signal: AbortSignal,
  valid: () => boolean = () => true,
) {
  const entries = await client.config.get(location, { signal })
  const candidates = []

  for (const entry of entries) {
    if (entry.type !== 'document' || !entry.path) continue

    const file = serverFileTarget(entry.path)
    const text = new TextDecoder().decode(await client.file.read(file, { signal }))
    const next = pluginPinEdit(text, target, version)

    if (next) candidates.push({ file, text, next })
  }

  if (candidates.length !== 1)
    throw new Error('Cannot identify one owning Navigator configuration; no changes were made')

  const selected = candidates[0]
  const current = new TextDecoder().decode(await client.file.read(selected.file, { signal }))

  if (current !== selected.text) throw new Error('Navigator configuration changed; check again before updating')

  const active = await client.plugin.list(location, { signal })

  if (!valid() || active.data.every((item) => !(item.source.type === 'package' && item.source.target === target)))
    throw new Error('Navigator installation changed; check again before updating')

  if (new TextDecoder().decode(await client.file.read(selected.file, { signal })) !== selected.text || !valid())
    throw new Error('Navigator configuration changed; check again before updating')

  signal.throwIfAborted()
  await client.experimental.file.write(
    { ...selected.file, payload: new TextEncoder().encode(selected.next) },
    { signal },
  )

  if (new TextDecoder().decode(await client.file.read(selected.file, { signal })) !== selected.next)
    throw new Error('Could not verify the Navigator configuration update; inspect it before retrying')
}

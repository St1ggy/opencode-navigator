import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

function supports(version, minimum) {
  const value = version.replace(/^v/, '').split('.').map(Number)
  const required = minimum.split('.').map(Number)

  for (let index = 0; index < 3; index++) {
    if (value[index] !== required[index]) return value[index] > required[index]
  }

  return true
}

export async function snapshotVerifier(directory, probe) {
  const source = await readFile(join(directory, 'dist', 'runtime-requirements.json'), 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })

  if (!source) return 'node'

  const requirements = JSON.parse(source)

  if (requirements.version !== 1 || ['bun', 'node'].some((name) => !/^\d+\.\d+\.\d+$/.test(requirements[name])))
    throw new Error('Navigator package has invalid runtime requirements')

  for (const runtime of ['bun', 'node']) {
    const version = await probe(runtime).catch(() => '')

    if (/^v?\d+\.\d+\.\d+$/.test(version.trim()) && supports(version.trim(), requirements[runtime])) return runtime
  }

  throw new Error(
    `Snapshot verification requires Bun >=${requirements.bun} or Node >=${requirements.node}; the installed snapshot was preserved`,
  )
}

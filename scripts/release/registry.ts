import assert from 'node:assert/strict'

export type Manifest = {
  name: string
  version: string
  dist: { integrity: string; tarball: string; attestations: { url: string } }
}

export async function registryManifest(name: string, version: string): Promise<Manifest | undefined> {
  const response = await fetch(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    {
      headers: { 'cache-control': 'no-cache' },
    },
  )

  if (response.status === 404 || response.status === 429 || response.status >= 500) return

  assert.equal(response.status, 200, `Unexpected registry response: ${response.status}`)
  const manifest = (await response.json()) as Manifest

  assert.equal(manifest.name, name)
  assert.equal(manifest.version, version)
  assert.ok(manifest.dist.integrity && manifest.dist.tarball && manifest.dist.attestations?.url)

  return manifest
}

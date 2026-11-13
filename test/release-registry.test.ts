import { afterEach, expect, mock, spyOn, test } from 'bun:test'

import { registryManifest } from '../scripts/release/registry'

afterEach(() => {
  mock.restore()
})

test('release registry lookup uses the exact HTTP version endpoint, independent of npm CLI output shapes', async () => {
  const manifest = {
    name: 'synthetic-package',
    version: '1.2.3',
    dist: {
      integrity: 'sha512-synthetic',
      tarball: 'https://registry.npmjs.org/synthetic.tgz',
      attestations: { url: 'https://registry.npmjs.org/attestations/synthetic' },
    },
  }

  const mockFetch = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(manifest))

  expect(await registryManifest('synthetic-package', '1.2.3')).toEqual(manifest)
  expect(mockFetch).toHaveBeenCalledWith('https://registry.npmjs.org/synthetic-package/1.2.3', {
    headers: { 'cache-control': 'no-cache' },
  })
})

test.each([404, 429, 500, 503])(
  'registry propagation/transient HTTP %s remains retryable without publication',
  async (status) => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }))
    expect(await registryManifest('synthetic-package', '1.2.3')).toBeUndefined()
  },
)

test('invalid/missing manifest data never counts as verification', async () => {
  for (const value of [{}, [], { name: 'other', version: '1.2.3' }, { name: 'synthetic-package', version: '1.2.4' }]) {
    mock.restore()
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(value))
    expect(
      await registryManifest('synthetic-package', '1.2.3')
        .then(() => false)
        .catch(() => true),
    ).toBe(true)
  }
})

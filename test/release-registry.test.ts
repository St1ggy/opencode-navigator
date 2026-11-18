import { afterEach, expect, mock, spyOn, test } from 'bun:test'

import { registryAsset, registryManifest } from '../scripts/release/registry'

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

test.each([404, 429, 500, 503])(
  'published artifact HTTP %s remains retryable after the manifest appears',
  async (status) => {
    const fetch = spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(Response.json({ verified: 'synthetic' }))

    const url = 'https://registry.npmjs.org/-/npm/v1/attestations/synthetic@1.2.3'

    expect(await registryAsset(url)).toBeUndefined()
    expect(await (await registryAsset(url))?.json()).toEqual({ verified: 'synthetic' })
    expect(fetch).toHaveBeenCalledWith(url, {
      headers: { 'cache-control': 'no-cache' },
      redirect: 'error',
      signal: expect.any(AbortSignal),
    })
  },
)

test('registry assets never follow a redirect or accept another origin', async () => {
  const fetch = spyOn(globalThis, 'fetch')
  const insecure = new URL('https://registry.npmjs.org/package.tgz')

  insecure.protocol = 'http:'

  for (const url of ['https://registry.npmjs.org.evil.invalid/package.tgz', insecure.href]) {
    expect(
      await registryAsset(url)
        .then(() => 'Unexpected success')
        .catch(String),
    ).toContain('Unexpected registry URL')
  }
  expect(fetch).not.toHaveBeenCalled()
})

test.each([401, 403, 302])('registry asset HTTP %s never counts as a verified response', async (status) => {
  spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }))
  expect(
    await registryAsset('https://registry.npmjs.org/synthetic.tgz')
      .then(() => 'Unexpected success')
      .catch(String),
  ).toContain(`Registry returned ${status}`)
})

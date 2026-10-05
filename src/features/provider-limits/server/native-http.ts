import { object } from './native-values'
import { withinQuotaSignal } from './quota-deadline'

export class QuotaReadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'QuotaReadError'
  }
}

export async function readProviderJson(
  fetcher: typeof fetch,
  url: string,
  token: string,
  signal: AbortSignal,
  input: { method?: 'GET' | 'POST'; headers?: Record<string, string>; apiKeyHeader?: string } = {},
) {
  const combined = AbortSignal.any([signal, AbortSignal.timeout(10_000)])
  const response = await withinQuotaSignal(combined, () =>
    fetcher(url, {
      method: input.method ?? 'GET',
      headers: {
        ...(input.apiKeyHeader ? { [input.apiKeyHeader]: token } : { Authorization: `Bearer ${token}` }),
        Accept: 'application/json',
        ...input.headers,
      },
      signal: combined,
      redirect: 'error',
    }),
  )

  if (!response.ok) throw new QuotaReadError(response.status, 'Provider quota read was rejected')

  return readQuotaResponseBody(response, combined)
}

export async function readQuotaResponseBody(response: Response, signal = AbortSignal.timeout(10_000)) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let body = ''
  let bytes = 0

  if (reader) {
    try {
      while (true) {
        const next = await withinQuotaSignal(signal, () => reader.read())

        if (next.done) break

        bytes += next.value.byteLength

        if (bytes > 1_000_000) throw new QuotaReadError(502, 'Provider quota response is too large')

        body += decoder.decode(next.value, { stream: true })
      }
      body += decoder.decode()
    } finally {
      // A cloned response is a tee: cancellation may wait for the original body.
      // Never hold the host response hook until that original stream is consumed.
      void reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  }

  try {
    return object(JSON.parse(body) as unknown)
  } catch {
    throw new QuotaReadError(502, 'Provider quota response is invalid')
  }
}

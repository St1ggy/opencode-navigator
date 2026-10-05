export async function withinQuotaSignal<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  signal.throwIfAborted()

  let abort: (() => void) | undefined

  try {
    return await Promise.race([
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason)
        signal.addEventListener('abort', abort, { once: true })
      }),
      Promise.try(() => {
        signal.throwIfAborted()

        return work()
      }),
    ])
  } finally {
    if (abort) signal.removeEventListener('abort', abort)
  }
}

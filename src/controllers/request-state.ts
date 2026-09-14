import { createSignal } from "solid-js"

export type RequestStatus = "idle" | "loading" | "refreshing" | "ready" | "error"

export type RequestError = {
  operation: string
  target: string
  message: string
  retryable: boolean
}

export type TargetRequestState = {
  status: RequestStatus
  error?: RequestError
  lastSuccessfulAt?: number
}

const idle: TargetRequestState = { status: "idle" }

export function isAbortError(cause: unknown) {
  return (
    (typeof DOMException !== "undefined" && cause instanceof DOMException && cause.name === "AbortError") ||
    (cause instanceof Error && cause.name === "AbortError") ||
    (typeof cause === "object" && cause !== null && "name" in cause && cause.name === "AbortError")
  )
}

export function isRetryableError(cause: unknown) {
  if (isAbortError(cause)) return false
  if (typeof cause !== "object" || cause === null) return true

  const value = cause as { status?: unknown; response?: { status?: unknown } }
  const status = typeof value.status === "number" ? value.status : value.response?.status
  if (typeof status !== "number") return true
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function requestError(cause: unknown, operation: string, target: string): RequestError {
  return {
    operation,
    target,
    message: cause instanceof Error ? cause.message : `Failed to ${operation}`,
    retryable: isRetryableError(cause),
  }
}

export function createRequestState(lifecycleSignal?: AbortSignal) {
  const [states, setStates] = createSignal<Record<string, TargetRequestState>>({})
  const active = new Map<string, { id: number; controller: AbortController }>()
  let sequence = 0

  function state(target: string) {
    return states()[target] ?? idle
  }

  function abortAll() {
    for (const request of active.values()) request.controller.abort()
  }

  lifecycleSignal?.addEventListener("abort", abortAll, { once: true })

  function start(target: string, operation: string, hasData: boolean, force = false) {
    const previous = active.get(target)
    if (previous && !force) return
    previous?.controller.abort()

    const id = ++sequence
    const controller = new AbortController()
    if (lifecycleSignal?.aborted) controller.abort(lifecycleSignal.reason)
    const current = state(target)
    active.set(target, { id, controller })
    setStates((values) => ({
      ...values,
      [target]: {
        status: hasData ? "refreshing" : "loading",
        lastSuccessfulAt: current.lastSuccessfulAt,
      },
    }))

    function isCurrent() {
      return active.get(target)?.id === id
    }

    function finish() {
      if (isCurrent()) active.delete(target)
    }

    return {
      signal: controller.signal,
      isCurrent,
      succeed() {
        if (!isCurrent()) return
        setStates((values) => ({
          ...values,
          [target]: { status: "ready", lastSuccessfulAt: Date.now() },
        }))
      },
      fail(cause: unknown) {
        if (!isCurrent()) return
        if (controller.signal.aborted || isAbortError(cause)) {
          setStates((values) => ({
            ...values,
            [target]: current.lastSuccessfulAt ? { status: "ready", lastSuccessfulAt: current.lastSuccessfulAt } : idle,
          }))
          return
        }
        setStates((values) => ({
          ...values,
          [target]: {
            status: "error",
            error: requestError(cause, operation, target),
            lastSuccessfulAt: current.lastSuccessfulAt,
          },
        }))
      },
      finish,
    }
  }

  return { state, start, abortAll }
}

function wait(delay: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException("Aborted", "AbortError"))
    const timer = setTimeout(resolve, delay)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })
}

export async function retryBackgroundRefresh<Value>(
  refresh: () => Promise<Value>,
  options: {
    signal?: AbortSignal
    delays?: ReadonlyArray<number>
    wait?: (delay: number, signal?: AbortSignal) => Promise<void>
  } = {},
) {
  const delays = options.delays ?? [250, 1000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await refresh()
    } catch (cause) {
      if (!isRetryableError(cause) || attempt >= delays.length) throw cause
      await (options.wait ?? wait)(delays[attempt], options.signal)
    }
  }
}

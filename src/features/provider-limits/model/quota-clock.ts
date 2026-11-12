import { createSignal, onCleanup } from 'solid-js'

// Presentation-only ticks: never refresh provider data or advance a reset window.
export function createQuotaClock() {
  const [now, setNow] = createSignal(Date.now())
  const timer = setInterval(() => setNow(Date.now()), 30_000)

  onCleanup(() => clearInterval(timer))

  return now
}

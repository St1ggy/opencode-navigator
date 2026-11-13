import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { setTimeout } from 'node:timers/promises'

export function command(program: string, args: string[], input?: string) {
  return execFileSync(program, args, { encoding: 'utf8', input, maxBuffer: 20 * 1024 * 1024 }).trim()
}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- Callers provide the endpoint's documented response contract.
export function api<T>(route: string, method = 'GET', body?: unknown): T {
  const args = ['api', route, '--method', method]

  if (body) args.push('--input', '-')

  return JSON.parse(command('gh', args, body ? JSON.stringify(body) : undefined)) as T
}

export function pages<T>(route: string, key?: string): T[] {
  const result = JSON.parse(command('gh', ['api', '--paginate', '--slurp', route])) as unknown[]

  return result.flatMap((page) => (key ? (page as Record<string, T[]>)[key] : (page as T[])))
}

export function environment(name: string) {
  const value = process.env[name]

  assert.ok(value, `Missing ${name}`)

  return value
}

export function output(name: string, value: string) {
  assert.ok(!/[\r\n]/u.test(value))
  appendFileSync(environment('GITHUB_OUTPUT'), `${name}=${value}\n`)
}

export async function waitFor<T>(
  description: string,
  read: () => T | undefined | Promise<T | undefined>,
  minutes = 30,
): Promise<T> {
  const deadline = Date.now() + minutes * 60_000

  do {
    // Read-only requests may fail transiently; no mutation is retried here.
    let value: T | undefined

    try {
      value = await read()
    } catch (error) {
      console.warn(`Retrying ${description}: ${String(error)}`)
    }

    if (value !== undefined) return value

    await setTimeout(15_000)
  } while (Date.now() < deadline)

  throw new Error(`Timed out waiting for ${description}; inspect the existing run before retrying`)
}

export function mainSha(repository: string) {
  return api<{ object: { sha: string } }>(`repos/${repository}/git/ref/heads/main`).object.sha
}

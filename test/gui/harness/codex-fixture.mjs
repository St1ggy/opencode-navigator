#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

// This executable is placed only in the disposable Docker container's PATH.
const statePath = '/tmp/navigator-synthetic-codex.json'
const logPath = '/tmp/navigator-synthetic-codex-methods.jsonl'
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { keys: [] }

createInterface({ input: process.stdin }).on('line', (line) => {
  const request = JSON.parse(line)

  if (!request.id) return

  appendFileSync(logPath, `${JSON.stringify({ method: request.method, params: request.params })}\n`)
  let result
  let error

  switch (request.method) {
    case 'initialize': {
      result = {}
      break
    }

    case 'account/read': {
      result = { account: { type: 'chatgpt', id: 'synthetic-account' } }
      break
    }

    case 'account/rateLimits/read': {
      result = {
        accountId: 'synthetic-account',
        ordinaryUsageAllowed: state.keys.length > 0,
        rateLimits: {
          limitId: 'codex',
          limitName: 'Codex',
          normalModelSlug: null,
          primary: { usedPercent: state.keys.length > 0 ? 0 : 100, windowDurationMins: 300, resetsAt: 1_900_000_000 },
          secondary: null,
        },
        rateLimitsByLimitId: null,
        rateLimitResetCredits: existsSync('/tmp/navigator-synthetic-credit-details')
          ? {
              availableCount: 3,
              credits: [
                {
                  id: 'synthetic-expiring',
                  title: 'Expiring credit',
                  description: null,
                  resetType: 'codexRateLimits',
                  status: 'available',
                  grantedAt: Date.parse('2026-10-01T12:00:00Z') / 1000,
                  expiresAt: Date.parse('2026-12-01T12:00:00Z') / 1000,
                },
                {
                  id: 'synthetic-expired',
                  title: 'Expired credit',
                  description: null,
                  resetType: 'codexRateLimits',
                  status: 'available',
                  grantedAt: Date.parse('2026-10-01T12:00:00Z') / 1000,
                  expiresAt: Date.parse('2026-10-02T12:00:00Z') / 1000,
                },
                {
                  id: 'synthetic-no-expiry',
                  title: 'Undated credit',
                  description: null,
                  resetType: 'codexRateLimits',
                  status: 'available',
                  grantedAt: Date.parse('2026-10-01T12:00:00Z') / 1000,
                  expiresAt: null,
                },
              ],
            }
          : { availableCount: state.keys.length > 0 ? 0 : 1, credits: null },
      }
      break
    }

    case 'account/rateLimitResetCredit/consume': {
      const key = request.params.idempotencyKey

      if (state.keys.includes(key)) result = { outcome: 'alreadyRedeemed' }
      else {
        state.keys.push(key)
        writeFileSync(statePath, JSON.stringify(state))
        error = { code: -32_000, message: 'Synthetic uncertain result after successful redemption' }
      }

      break
    }
    default: {
      error = { code: -32_601, message: 'Unsupported synthetic method' }
    }
  }

  process.stdout.write(`${JSON.stringify({ id: request.id, ...(error ? { error } : { result }) })}\n`)
})

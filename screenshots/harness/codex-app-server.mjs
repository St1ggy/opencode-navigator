#!/usr/bin/env node
import { createInterface } from 'node:readline'

const scene = process.env.SCREENSHOT_SCENE ?? 'limits-ready'
const now = 1_893_456_000
const credit = {
  id: 'synthetic-reset-01',
  resetType: 'codexRateLimits',
  status: 'available',
  grantedAt: now - 86_400,
  expiresAt: now + 604_800,
  title: 'Weekly reset credit',
  description: 'Provider-issued credit for eligible Codex usage windows',
}
const limit = {
  limitId: 'codex',
  limitName: null,
  normalModelSlug: null,
  primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: now + 7200 },
  secondary: { usedPercent: 74, windowDurationMins: 10_080, resetsAt: now + 172_800 },
}

function response(request) {
  switch (request.method) {
    case 'initialize': {
      return { userAgent: 'navigator-synthetic-codex' }
    }

    case 'account/read': {
      return { account: { type: 'chatgpt', email: 'demo@example.com', planType: 'plus' } }
    }

    case 'account/rateLimits/read': {
      return {
        accountId: 'synthetic-codex-account',
        ordinaryUsageAllowed: false,
        rateLimits: limit,
        rateLimitsByLimitId: { codex: limit },
        rateLimitResetCredits: { availableCount: 2, credits: scene === 'limits-count-only' ? null : [credit] },
      }
    }
    default: {
      throw new Error('Screenshot fixtures must never submit a reset or call an unknown method')
    }
  }
}

const lines = createInterface({ input: process.stdin })

for await (const line of lines) {
  const request = JSON.parse(line)

  if (request.id === undefined) continue

  const result = response(request)

  process.stdout.write(`${JSON.stringify({ id: request.id, result })}\n`)
}

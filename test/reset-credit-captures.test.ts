import { expect, test } from 'bun:test'

function credits(scene: string) {
  const result = Bun.spawnSync(['node', 'screenshots/harness/codex-app-server.mjs'], {
    stdin: Buffer.from(`${JSON.stringify({ id: 1, method: 'account/rateLimits/read' })}\n`),
    env: { ...process.env, SCREENSHOT_SCENE: scene },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  expect(result.exitCode).toBe(0)

  return JSON.parse(result.stdout.toString()).result.rateLimitResetCredits
}

test('CI reset card scenes provide two distinct synthetic credits rather than duplicate identities', () => {
  const fixture = credits('limits-credits')

  expect(fixture.availableCount).toBe(2)
  expect(fixture.credits).toHaveLength(2)
  expect(new Set(fixture.credits.map((credit: { id: string }) => credit.id)).size).toBe(2)
  expect(fixture.credits[0].expiresAt).not.toBe(fixture.credits[1].expiresAt)
})

test('CI count-only scene retains the available count without fabricating credit details', () => {
  expect(credits('limits-count-only')).toEqual({ availableCount: 2, credits: null })
})

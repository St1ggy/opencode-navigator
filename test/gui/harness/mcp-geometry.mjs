import { expect } from '@playwright/test'

async function controls(row) {
  return {
    row: await row.boundingBox(),
    routing: await row.getByRole('button', { name: /Routing mode for/u }).boundingBox(),
    info: await row.locator('[data-navigator-mcp-info-slot]').evaluate((node) => {
      const { x, y, width, height } = node.getBoundingClientRect()

      return { x, y, width, height }
    }),
    connection: await row.locator('[data-navigator-switch-slot]').boundingBox(),
  }
}

function stable(before, after) {
  for (const key of ['routing', 'info', 'connection'])
    for (const dimension of ['x', 'width', 'height'])
      expect(Math.abs(before[key][dimension] - after[key][dimension]), `${key} ${dimension}`).toBeLessThanOrEqual(1)
  expect(after.row.height).toBe(before.row.height)
}

export async function verifyMcpActionColumns(dialog) {
  const fixture = dialog.locator('[data-synthetic-mcp-layout]')
  const healthy = fixture.locator('[data-navigator-mcp-row]').filter({ hasText: 'synthetic-connected' })
  const failed = fixture.locator('[data-navigator-mcp-row]').filter({ hasText: 'synthetic-failed' })

  for (const width of [280, 420]) {
    await fixture.evaluate((node, value) => {
      node.style.width = `${value}px`
    }, width)
    const baseline = await controls(healthy)
    const mixed = await controls(failed)

    for (const key of ['routing', 'info', 'connection'])
      expect(Math.abs(baseline[key].x - mixed[key].x), `mixed-state ${key} column`).toBeLessThanOrEqual(1)
    for (let index = 0; index < 2; index++) {
      await dialog.getByRole('button', { name: 'Toggle synthetic MCP error', exact: true }).click()
      stable(baseline, await controls(healthy))
    }
    for (let index = 0; index < 2; index++) {
      await dialog.getByRole('button', { name: 'Change synthetic routing label', exact: true }).click()
      stable(baseline, await controls(healthy))
    }
  }
}

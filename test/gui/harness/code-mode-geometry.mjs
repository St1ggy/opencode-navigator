import { expect } from '@playwright/test'

export async function verifyCodeModeGeometry(dialog) {
  const fixture = dialog.locator('[data-synthetic-code-mode-layout]')

  for (const width of [260, 420]) {
    await fixture.evaluate((node, value) => {
      node.style.width = `${value}px`
    }, width)
    const rows = fixture.locator('[data-navigator-execute-run]')

    await expect(rows).toHaveCount(3)
    let previous = await fixture.locator('[data-navigator-execute-tabs]').boundingBox()

    const entries = await rows.all()

    for (const row of entries) {
      const bounds = await row.boundingBox()
      const button = await row.getByRole('button').boundingBox()
      const content = await row.locator('[data-navigator-execute-content]').boundingBox()

      expect(bounds.y, 'Execute row overlaps the preceding row or activity tabs').toBeGreaterThanOrEqual(
        previous.y + previous.height,
      )
      expect(content.y, 'Execute content escapes above its native button').toBeGreaterThanOrEqual(button.y)
      expect(content.y + content.height, 'Multiline execute content escapes its native button').toBeLessThanOrEqual(
        button.y + button.height,
      )
      expect(button.y + button.height, 'Execute button escapes its list row').toBeLessThanOrEqual(
        bounds.y + bounds.height,
      )
      expect(content.x + content.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
      previous = bounds
    }
  }
}

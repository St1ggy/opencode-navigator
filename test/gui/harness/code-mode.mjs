import { expect } from '@playwright/test'

// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { verifyCodeModeGeometry } from './code-mode-geometry.mjs'

export async function verifyCodeMode(page, command) {
  await command('Synthetic Code Mode')
  const dialog = page.getByRole('dialog').last()

  await dialog.locator('[data-navigator-execute-run="synthetic-message:running"]').getByRole('button').waitFor()
  await dialog.getByRole('button', { name: /^Recent/u }).click()
  await verifyCodeModeGeometry(dialog)
  const completed = dialog.locator('[data-navigator-execute-run="synthetic-message:completed"]').getByRole('button')

  await expect(completed).toContainText('context7')
  await expect(completed).toContainText('query-docs')
  await expect(completed).toContainText('wiki')
  await expect(completed).toContainText('In code')
  await completed.click()
  const details = page.getByRole('dialog').last()

  await details.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(details).toContainText('synthetic payload')
  const input = details.getByLabel('Execute code', { exact: true })

  await input.evaluate((node) => {
    node.scrollTop = 100
  })
  const top = await input.evaluate((node) => node.scrollTop)

  expect(top).toBeGreaterThan(0)
  await details.getByRole('button', { name: 'Response', exact: true }).click()
  await details.getByRole('button', { name: 'Code', exact: true }).click()
  await expect.poll(() => input.evaluate((node) => node.scrollTop)).toBe(top)
  await details.getByRole('button', { name: 'All execute parameters', exact: true }).click()
  await expect(details).toContainText('"code"')
  await details.getByRole('button', { name: 'Response', exact: true }).click()
  await expect(details).toContainText('Synthetic execute result')
  await details.getByRole('button', { name: 'Full response JSON', exact: true }).click()
  await expect(details).toContainText('"type"')
  await expect(details).toContainText('"text"')
  await details.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(details).toContainText('"code"')
  await details.getByRole('button', { name: 'Operation details', exact: true }).click()
  await expect(details).toContainText('synthetic-message:completed')
  await details.getByRole('button', { name: 'Hide operation details', exact: true }).click()
  await expect(details).toContainText('not exposed by this host')
  await captureGui(details, '34-desktop-code-mode-payloads')
  await details.getByRole('button', { name: 'Close', exact: true }).last().click()
  await dialog.locator('[data-navigator-execute-run="synthetic-message:failed"]').getByRole('button').click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Error', exact: true }).click()
  await expect(page.getByRole('dialog').last()).toContainText('Synthetic execute failure')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Close', exact: true }).last().click()
  await dialog.getByRole('button', { name: 'Configure synthetic routing', exact: true }).click()
  const routing = page.getByRole('dialog').last()

  await routing.getByRole('button', { name: 'Preview change', exact: true }).click()
  await expect(routing).toContainText('/synthetic/project/opencode.json')
  await captureGui(routing, '35-desktop-code-mode-routing-preview')
  await routing.getByRole('button', { name: 'Back', exact: true }).click()
  await routing.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toContainText('Saved routing changes: 0')
  await dialog.getByRole('button', { name: 'Configure synthetic routing', exact: true }).click()
  await page.getByLabel('New routing mode', { exact: true }).click()
  await page.getByText('Direct', { exact: true }).last().click()
  await routing.getByRole('button', { name: 'Preview change', exact: true }).click()
  await expect(routing).toContainText('"codemode": false')
  await routing.getByRole('button', { name: 'Apply routing change', exact: true }).click()
  await expect(dialog).toContainText('Saved routing changes: 1 · direct · Connection stays disabled')
  await dialog.getByRole('button', { name: 'Configure synthetic routing', exact: true }).click()
  await page.getByLabel('New routing mode', { exact: true }).click()
  await page.getByText('Code Mode', { exact: true }).last().click()
  await routing.getByRole('button', { name: 'Preview change', exact: true }).click()
  await expect(routing).toContainText('"codemode": true')
  await routing.getByRole('button', { name: 'Apply routing change', exact: true }).click()
  await expect(dialog).toContainText('Saved routing changes: 2 · code · Connection stays disabled')
  await captureGui(dialog, '33-desktop-code-mode-activity')
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
}

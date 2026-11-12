// oxlint-disable-next-line import-x-js/extensions
import { clickNativeSwitch } from './native-controls.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'

export async function mcpInteractions(page, command) {
  await command('Synthetic MCP switches')
  const dialog = page.getByRole('dialog').last()
  const connected = dialog.getByRole('switch', { name: 'synthetic-connected', exact: true })
  const failed = dialog.getByRole('switch', { name: 'synthetic-failed', exact: true })
  const group = dialog.getByRole('switch', { name: 'Synthetic MCP group', exact: true })

  if (!(await connected.isChecked()) || (await failed.isChecked()) || (await group.isChecked()))
    throw new Error('Native MCP switches misrepresent individual or mixed group state')

  const information = dialog.getByRole('button', { name: 'Information about synthetic-failed', exact: true })

  await information.hover()
  await captureGui(dialog, '32-desktop-mcp-switches')
  await information.click()
  await dialog.getByRole('status').filter({ hasText: 'Synthetic connection failure' }).waitFor()
  await clickNativeSwitch(dialog, 'Show one synthetic server')
  await clickNativeSwitch(dialog, 'Synthetic MCP group')

  if (!(await group.isDisabled()) || !(await connected.isDisabled()))
    throw new Error('MCP switches allow duplicate actions while a group changes')

  await expect(group).toBeChecked()
  await expect(group).toBeEnabled()

  const calls = await dialog.getByRole('list', { name: 'Synthetic MCP calls', exact: true }).textContent()

  if (!calls.includes('synthetic-connected,synthetic-failed'))
    throw new Error('Group toggle affected only the visible subset')

  await connected.focus()
  await page.keyboard.press('Space')
  await expect(connected).not.toBeChecked()
  await expect(connected).toBeEnabled()
  await clickNativeSwitch(dialog, 'Show one synthetic server')
  await failed.focus()
  await page.keyboard.press('ArrowLeft')
  const bookmark = dialog.getByRole('button', { name: /Bookmark synthetic-failed/u })

  if (!(await bookmark.evaluate((node) => node === document.activeElement)))
    throw new Error('Horizontal row navigation cannot reach the MCP bookmark from its native switch')

  await page.keyboard.press('Space')
  await dialog.getByRole('button', { name: /Unbookmark synthetic-failed/u }).waitFor()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  console.log('Native MCP individual/group switches, pending, whole-bucket, error and bookmark interactions passed.')
}
import { expect } from '@playwright/test'

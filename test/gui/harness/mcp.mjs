// oxlint-disable-next-line import-x-js/extensions
import { clickNativeSwitch } from './native-controls.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { verifyMcpActionColumns } from './mcp-geometry.mjs'

async function verifyMcpGeometry(dialog) {
  const fixture = dialog.locator('[data-synthetic-mcp-layout]')

  for (const width of [280, 420]) {
    await fixture.evaluate((node, value) => {
      node.style.width = `${value}px`
    }, width)
    const row = dialog.locator('[data-navigator-mcp-row]').filter({ hasText: 'synthetic-connected' })

    await row.hover()
    const bounds = await row.boundingBox()
    const toggle = await row.locator('[data-slot="switch-control"]').boundingBox()
    const routing = await row.getByRole('button', { name: /Routing mode for synthetic-connected/u }).boundingBox()
    const bookmark = await dialog.getByRole('button', { name: /Bookmark synthetic-connected/u }).boundingBox()

    if (!bounds || !toggle || !routing || !bookmark || Math.abs(toggle.x + toggle.width - bounds.x - bounds.width) > 3)
      throw new Error('MCP connection switch is not anchored to the right edge')

    if (routing.x + routing.width > toggle.x || routing.y >= toggle.y + toggle.height)
      throw new Error('Routing mode is not between the server label and native switch on the same row')

    if (Math.abs(bookmark.y - bounds.y) > 8) throw new Error('Multiline MCP bookmark is not top-aligned')

    const heading = dialog.locator('[data-navigator-mcp-group]')
    const groupBounds = await heading.boundingBox()
    const groupSwitch = await heading.locator('[data-slot="switch-control"]').boundingBox()

    if (
      !groupBounds ||
      !groupSwitch ||
      Math.abs(groupSwitch.x + groupSwitch.width - groupBounds.x - groupBounds.width) > 3
    )
      throw new Error('MCP group switch is not anchored to the right edge')
  }
}

export async function mcpInteractions(page, command) {
  await command('Synthetic MCP switches')
  const dialog = page.getByRole('dialog').last()
  const connected = dialog.getByRole('switch', { name: 'synthetic-connected', exact: true })
  const failed = dialog.getByRole('switch', { name: 'synthetic-failed', exact: true })
  const group = dialog.getByRole('switch', { name: 'Synthetic MCP group', exact: true })

  if (!(await connected.isChecked()) || (await failed.isChecked()) || (await group.isChecked()))
    throw new Error('Native MCP switches misrepresent individual or mixed group state')

  const information = dialog.getByRole('button', { name: 'Information about synthetic-failed', exact: true })

  await verifyMcpGeometry(dialog)
  await verifyMcpActionColumns(dialog)

  await information.hover()
  await captureGui(dialog, '32-desktop-mcp-switches')
  await information.click()
  await dialog.getByRole('status').filter({ hasText: 'Synthetic connection failure' }).waitFor()
  await clickNativeSwitch(dialog, 'Show one synthetic server')
  const slot = dialog.locator('[data-navigator-mcp-group] [data-navigator-switch-slot]')
  const before = await slot.boundingBox()
  const row = dialog.locator('[data-navigator-mcp-row]').filter({ hasText: 'synthetic-connected' })
  const rowBefore = await row.boundingBox()

  await clickNativeSwitch(dialog, 'Synthetic MCP group')

  const pendingGroup = dialog.getByRole('status', { name: 'Updating Synthetic MCP group', exact: true })

  await pendingGroup.waitFor()
  const after = await slot.boundingBox()
  const rowAfter = await row.boundingBox()

  if (
    !before ||
    !after ||
    !rowBefore ||
    !rowAfter ||
    ['x', 'y', 'width', 'height'].some(
      (key) => Math.abs(before[key] - after[key]) > 1 || Math.abs(rowBefore[key] - rowAfter[key]) > 1,
    )
  )
    throw new Error(`MCP pending geometry changed: ${JSON.stringify({ before, after, rowBefore, rowAfter })}`)

  const pendingText = await pendingGroup.textContent()
  const dialogText = await dialog.textContent()

  if (pendingText.trim() || dialogText.includes('Updating connection'))
    throw new Error('MCP pending state contains a visible loading caption')

  if (
    !(await slot.getByRole('switch', { includeHidden: true }).isDisabled()) ||
    !(await row.getByRole('switch', { includeHidden: true }).isDisabled())
  )
    throw new Error('MCP switches allow duplicate actions while a group changes')

  await dialog.getByRole('button', { name: 'Complete synthetic MCP operation', exact: true }).click()
  await expect(group).toBeChecked()
  await expect(group).toBeEnabled()

  const calls = await dialog.getByRole('list', { name: 'Synthetic MCP calls', exact: true }).textContent()

  if (!calls.includes('synthetic-connected,synthetic-failed'))
    throw new Error('Group toggle affected only the visible subset')

  await connected.focus()
  await page.keyboard.press('Space')
  await dialog.getByRole('status', { name: 'Updating synthetic-connected', exact: true }).waitFor()
  await dialog.getByRole('status', { name: 'Updating Synthetic MCP group', exact: true }).waitFor()
  await dialog.getByRole('button', { name: 'Complete synthetic MCP operation', exact: true }).click()
  await expect(connected).not.toBeChecked()
  await expect(connected).toBeEnabled()
  await clickNativeSwitch(dialog, 'Show one synthetic server')
  await failed.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(dialog.getByRole('button', { name: /Routing mode for synthetic-failed/u })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  const bookmark = dialog.getByRole('button', { name: /Bookmark synthetic-failed/u })

  if (!(await bookmark.evaluate((node) => node === document.activeElement)))
    throw new Error('Horizontal row navigation cannot reach the MCP bookmark from its native switch')

  await page.keyboard.press('Space')
  await dialog.getByRole('button', { name: /Unbookmark synthetic-failed/u }).waitFor()
  const search = dialog.getByRole('list', { name: 'Synthetic MCP search', exact: true })
  const searchSlot = search.locator('[data-navigator-switch-slot]')
  const searchBefore = await searchSlot.boundingBox()

  await clickNativeSwitch(search, 'synthetic-search')
  await search.getByRole('status', { name: 'Updating synthetic-search', exact: true }).waitFor()
  const searchAfter = await searchSlot.boundingBox()
  const searchStatusText = await search.getByRole('status').textContent()

  if (
    !searchBefore ||
    !searchAfter ||
    ['x', 'y', 'width', 'height'].some((key) => Math.abs(searchBefore[key] - searchAfter[key]) > 1) ||
    searchStatusText.trim()
  )
    throw new Error('MCP Search loader is not a caption-free in-place replacement')

  await dialog.getByRole('button', { name: 'Complete synthetic MCP operation', exact: true }).click()
  await expect(search.getByRole('switch', { name: 'synthetic-search', exact: true })).not.toBeChecked()
  await expect(search.getByRole('switch', { name: 'synthetic-search', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  console.log('Native MCP individual/group switches, pending, whole-bucket, error and bookmark interactions passed.')
}
import { expect } from '@playwright/test'

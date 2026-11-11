// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'

export async function toolbarInteractions(page, panel, command) {
  const toolbar = panel.locator('[data-navigator-toolbar]')

  if (await toolbar.count()) throw new Error('Empty toolbar did not collapse')

  await panel
    .getByRole('heading', { name: /^Quick Actions/u })
    .getByRole('button')
    .click()
  await panel.getByRole('button', { name: 'Options for Permissions settings', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Pin to toolbar', exact: true }).click()
  let dialog = page.getByRole('dialog').last()

  await dialog.getByRole('button', { name: 'Choose icons', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Add icon', exact: true }).click()
  await captureGui(page.getByRole('dialog').last(), '15-desktop-icon-picker')
  await page.getByRole('dialog').last().getByRole('button', { name: 'star', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  if (await toolbar.count()) throw new Error('Cancelled icon draft created a pin')

  await panel.getByRole('button', { name: 'Options for Permissions settings', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Pin to toolbar', exact: true }).click()
  dialog = page.getByRole('dialog').last()
  await dialog.getByRole('textbox', { name: 'Optional button text', exact: true }).fill('Permissions')
  await dialog.getByRole('button', { name: 'Choose icons', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Remove', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Use these icons', exact: true }).click()
  await dialog.getByRole('button', { name: 'Pin', exact: true }).click()
  await toolbar.getByRole('button', { name: /Permissions/u }).waitFor()
  const before = await toolbar.boundingBox()

  await toolbar.getByRole('button', { name: /Permissions/u }).hover()
  const after = await toolbar.boundingBox()

  if (before.height !== after.height) throw new Error('Toolbar hint changed its height')

  await command('Configure Navigator toolbar')
  dialog = page.getByRole('dialog').last()
  await captureGui(dialog, '16-desktop-toolbar-manager')
  await dialog.getByRole('button', { name: 'Configure', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('textbox', { name: 'Optional button text', exact: true })
    .fill('Unsaved')
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Close', exact: true }).last().click()
  await toolbar.getByRole('button', { name: /Permissions/u }).waitFor()
  await panel.getByRole('button', { name: 'Options for Rename', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Pin to toolbar', exact: true }).click()
  dialog = page.getByRole('dialog').last()
  await dialog
    .getByRole('textbox', { name: 'Optional button text', exact: true })
    .fill('Synthetic long toolbar button for measured overflow and clipping')
  await dialog.getByRole('button', { name: 'Choose icons', exact: true }).click()
  for (const icon of ['star', 'check']) {
    await page.getByRole('dialog').last().getByRole('button', { name: 'Add icon', exact: true }).click()
    await page.getByRole('dialog').last().getByRole('button', { name: icon, exact: true }).click()
  }
  await page.getByRole('dialog').last().getByRole('button', { name: 'Use these icons', exact: true }).click()
  await dialog.getByRole('button', { name: 'Pin', exact: true }).click()
  await toolbar.getByRole('button', { name: 'More toolbar items', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Rename', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await command('Configure Navigator toolbar')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Move Rename up', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Move Rename down', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Unpin Rename', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Unpin Permissions settings', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Close', exact: true }).last().click()
  await toolbar.waitFor({ state: 'detached' })
  console.log(
    'Packaged Desktop toolbar drafts, text-only/multi-icon pins, More, reorder/unpin and stable hints passed.',
  )
}

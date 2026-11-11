import { readFile } from 'node:fs/promises'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'

export async function presetInteractions(page) {
  await page.getByRole('textbox', { name: 'New preset name', exact: true }).fill('Synthetic layout')
  await page.getByRole('button', { name: 'Save layout preset', exact: true }).click()
  await page.getByText('Preset saved.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Preview layout', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('heading', { name: 'Layout preview: Synthetic layout', exact: true })
    .waitFor()
  await captureGui(page.getByRole('dialog').last(), '07-desktop-layout-preview')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByLabel('Linked MCP preset for Synthetic layout', { exact: true }).click()
  await page.getByText('Synthetic unavailable', { exact: true }).last().click()
  await page.getByRole('button', { name: 'Preview layout', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('heading', { name: 'Workspace profile: Synthetic layout', exact: true })
    .waitFor()
  await page.getByRole('dialog').last().getByRole('heading', { name: 'Skipped', exact: true }).waitFor()
  await captureGui(page.getByRole('dialog').last(), '08-desktop-workspace-profile')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByLabel('Linked MCP preset for Synthetic layout', { exact: true }).click()
  await page.getByText('No linked MCP preset', { exact: true }).last().click()
  await page.getByRole('button', { name: 'Import settings', exact: true }).click()
  let dialog = page.getByRole('dialog').last()
  const source = JSON.stringify({
    format: 'opencode-navigator/settings',
    version: 1,
    layout: { sections: { skills: false } },
    unrelated: 'synthetic unsupported field',
  })

  await dialog.getByRole('textbox', { name: 'Portable settings JSON', exact: true }).fill(source)
  await dialog.getByRole('button', { name: 'Preview import', exact: true }).click()
  await dialog.getByText('Skipped unsupported field: /unrelated', { exact: true }).waitFor()
  await captureGui(dialog, '09-desktop-import-preview')
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()

  if ((await dialog.getByRole('textbox', { name: 'Portable settings JSON', exact: true }).inputValue()) !== source)
    throw new Error('Returning from import preview lost the pasted JSON')

  await dialog.getByRole('button', { name: 'Preview import', exact: true }).click()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()

  if (!(await page.getByRole('switch', { name: 'Show Skills', exact: true }).isChecked()))
    throw new Error('Cancelled import changed the sidebar layout')

  await page.getByRole('button', { name: 'Import settings', exact: true }).click()
  dialog = page.getByRole('dialog').last()
  await dialog.getByRole('textbox', { name: 'Portable settings JSON', exact: true }).fill(source)
  await dialog.getByRole('button', { name: 'Preview import', exact: true }).click()
  await dialog.getByRole('button', { name: 'Apply imported settings', exact: true }).click()
  await dialog.waitFor({ state: 'detached' })

  if (await page.getByRole('switch', { name: 'Show Skills', exact: true }).isChecked())
    throw new Error('Confirmed import did not change the selected scope')

  await page.getByText('Show Skills', { exact: true }).click()
  await page.getByRole('button', { name: 'Save project profile…', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('textbox', { name: 'Project profile name', exact: true })
    .fill('Synthetic project profile')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Preview file', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('heading', { name: 'Project profile file preview', exact: true })
    .waitFor()
  await captureGui(page.getByRole('dialog').last(), '10-desktop-project-profile')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()

  if (await readFile('/synthetic/project/.opencode/navigator.json', 'utf8').catch(() => ''))
    throw new Error('Cancelled project profile preview wrote a file')

  await page.getByRole('button', { name: 'Save project profile…', exact: true }).click()
  await page
    .getByRole('dialog')
    .last()
    .getByRole('textbox', { name: 'Project profile name', exact: true })
    .fill('Synthetic project profile')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Preview file', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Save project profile', exact: true }).click()
  await page
    .getByText('Project profile saved; reload preferences, then apply it manually from presets', { exact: true })
    .waitFor()
  const project = JSON.parse(await readFile('/synthetic/project/.opencode/navigator.json', 'utf8'))

  if (
    !project.layoutPresets?.['Synthetic project profile'] ||
    project.user ||
    project.favoriteSkills ||
    project.codexAccountBindings
  )
    throw new Error('Project profile is missing or contains private preferences')

  await page.getByRole('button', { name: 'Reload preferences', exact: true }).click()
  await page.getByText('Private preferences reloaded.', { exact: true }).waitFor()
  await page.getByText('Synthetic project profile', { exact: true }).waitFor()

  console.log('Packaged Desktop layout-preset preview and portable import/back/cancel/apply passed.')
}

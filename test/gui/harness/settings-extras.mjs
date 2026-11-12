import { readFile } from 'node:fs/promises'
// oxlint-disable-next-line import-x-js/extensions
import { clickNativeSwitch } from './native-controls.mjs'

export async function extraSettingsInteractions(page) {
  const tabs = page.getByRole('navigation', { name: 'Navigator settings categories', exact: true })

  await tabs.getByRole('button', { name: 'Layout', exact: true }).click()
  const skills = page.getByRole('group', { name: 'Skills section controls', exact: true })
  const limit = skills.getByRole('textbox', { name: 'Skills item limit (0 for all)', exact: true })
  const save = skills.getByRole('button', { name: 'Save item limit', exact: true })

  await limit.fill('-1')

  if (!(await save.isDisabled())) throw new Error('Settings accepted a negative item limit')

  await limit.fill('2')
  await save.click()
  await limit.fill('0')
  await save.click()
  await tabs.getByRole('button', { name: 'Skills', exact: true }).click()
  const skillGroup = page.getByRole('group', { name: /^synthetic-monitoring .* grouping$/u }).first()

  await skillGroup.getByRole('button', { name: 'New group', exact: true }).click()
  await skillGroup.getByRole('textbox').fill('Synthetic Skill Group')
  await skillGroup.getByRole('button', { name: 'Save group', exact: true }).click()
  await tabs.getByRole('button', { name: 'MCP', exact: true }).click()
  const mcpGroup = page.getByRole('group', { name: 'synthetic-absent grouping', exact: true })

  await mcpGroup.getByRole('button', { name: 'New group', exact: true }).click()
  await mcpGroup.getByRole('textbox').fill('Synthetic MCP Updated')
  await mcpGroup.getByRole('button', { name: 'Save group', exact: true }).click()
  await tabs.getByRole('button', { name: 'Quick Actions', exact: true }).click()
  await clickNativeSwitch(page, 'Show action Permissions settings')
  await page.getByRole('switch', { name: 'Show action Permissions settings', exact: true }).focus()
  await page.keyboard.press('Space')
  await tabs.getByRole('button', { name: 'Behavior', exact: true }).click()
  await page.getByRole('button', { name: 'Restore shared behavior', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await tabs.getByRole('button', { name: 'MCP', exact: true }).click()
  await page.getByRole('button', { name: 'Clear remembered MCP states', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Reset', exact: true }).click()
  await page.getByText('Navigator preferences reset', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Reload preferences', exact: true }).click()
  await page.getByText('Private preferences reloaded.', { exact: true }).waitFor()
  const saved = JSON.parse(
    await readFile('/tmp/navigator-desktop-fixture/state/opencode/opencode-pretty-sidebar/preferences.json', 'utf8'),
  )

  if (saved.user.mcpServerGroups?.['synthetic-absent'] !== 'Synthetic MCP Updated')
    throw new Error('Absent MCP group was not persisted')

  if (
    Object.entries(saved.user.skillGroups ?? {}).every(
      ([source, group]) => !source.endsWith('/synthetic-monitoring/SKILL.md') || group !== 'Synthetic Skill Group',
    )
  )
    throw new Error('Skill group did not persist its exact source')

  console.log('Packaged Desktop section limits, Skill/MCP groups, action visibility and confirmed reset passed.')
}

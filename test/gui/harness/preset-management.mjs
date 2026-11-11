export async function presetManagementInteractions(page) {
  const controls = () => page.getByRole('group', { name: 'layout preset Synthetic layout controls', exact: true })

  await controls().getByRole('button', { name: 'Update from current settings', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await controls().getByRole('button', { name: 'Update from current settings', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Update preset', exact: true }).click()
  await controls().getByRole('button', { name: 'Rename preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('textbox').fill('Synthetic renamed')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Rename', exact: true }).click()
  const renamed = page.getByRole('group', { name: 'layout preset Synthetic renamed controls', exact: true })

  await renamed.getByRole('button', { name: 'Delete preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await renamed.getByRole('button', { name: 'Delete preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Delete preset', exact: true }).click()
  await renamed.waitFor({ state: 'detached' })
  const mcp = page.getByRole('group', { name: 'mcp preset Synthetic unavailable controls', exact: true })

  await mcp.getByRole('button', { name: 'Rename preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('textbox').fill('Synthetic MCP renamed')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Rename', exact: true }).click()
  const renamedMcp = page.getByRole('group', { name: 'mcp preset Synthetic MCP renamed controls', exact: true })

  await renamedMcp.getByRole('button', { name: 'Delete preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel', exact: true }).click()
  await renamedMcp.getByRole('button', { name: 'Rename preset', exact: true }).click()
  await page.getByRole('dialog').last().getByRole('textbox').fill('Synthetic unavailable')
  await page.getByRole('dialog').last().getByRole('button', { name: 'Rename', exact: true }).click()
  await renamedMcp.waitFor({ state: 'detached' })
  console.log('Packaged Desktop preset update, rename, delete and cancellation passed.')
}

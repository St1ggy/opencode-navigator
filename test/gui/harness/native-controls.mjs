export async function clickNativeSwitch(scope, name) {
  const input = scope.getByRole('switch', { name, exact: true })
  const root = input.locator('xpath=ancestor::*[@data-component="switch"][1]')

  await root.locator('[data-slot="switch-control"]').evaluate((node) => node.scrollIntoView({ block: 'center' }))
  await root.locator('[data-slot="switch-control"]').click()
}

export async function verifyTrustSwitch(dialog) {
  const trust = dialog.getByLabel('Trust this exact source for future use', { exact: true })
  const native = await trust.evaluate((node) => node.closest('[data-component]')?.dataset.component?.includes('switch'))

  if (!native) throw new Error('Skill trust does not use the host UI-kit switch')
}

export async function verifyTodoSelect(dialog) {
  const tag = await dialog.getByLabel('Todo configuration file', { exact: true }).evaluate((node) => node.tagName)

  if (tag === 'SELECT') throw new Error('Todo source picker still renders an unthemed HTML select')
}

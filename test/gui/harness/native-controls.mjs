export async function verifyTrustSwitch(dialog) {
  const trust = dialog.getByLabel('Trust this exact source for future use', { exact: true })
  const native = await trust.evaluate((node) => node.closest('[data-component]')?.dataset.component?.includes('switch'))

  if (!native) throw new Error('Skill trust does not use the host UI-kit switch')
}

export async function verifyTodoSelect(dialog) {
  const tag = await dialog.getByLabel('Todo configuration file', { exact: true }).evaluate((node) => node.tagName)

  if (tag === 'SELECT') throw new Error('Todo source picker still renders an unthemed HTML select')
}

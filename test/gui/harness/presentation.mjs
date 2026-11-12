// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { mcpInteractions } from './mcp.mjs'

export async function presentationInteractions(page, command) {
  await command('Synthetic Todo states')
  const tasks = page.getByRole('dialog').last()
  const rows = await tasks.locator('[data-navigator-todo-row]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const text = node.querySelector('[data-navigator-todo-text]')
      const style = getComputedStyle(text)

      return {
        status: node.dataset.status,
        decoration: style.textDecorationLine,
        color: style.color,
        icon: node.querySelector('[role="img"]')?.getAttribute('aria-label'),
      }
    }),
  )

  for (const row of rows) {
    const finished = ['completed', 'cancelled'].includes(row.status)

    if (row.decoration.includes('line-through') !== finished || row.icon !== row.status)
      throw new Error(`Incorrect native-style task state: ${JSON.stringify(row)}`)
  }

  if (rows.length !== 4 || new Set(rows.map((row) => row.status)).size !== 4)
    throw new Error('The production task renderer did not show all four synthetic states')

  await captureGui(tasks, '30-desktop-todo-states')
  await tasks.getByRole('button', { name: 'Close', exact: true }).last().click()
  await command('Synthetic update stages')
  const updates = page.getByRole('dialog').last()
  const transfer = updates.getByRole('progressbar', { name: 'Navigator · Downloading 40%', exact: true })

  if ((await transfer.getAttribute('aria-valuenow')) !== '40') throw new Error('Real-byte progress lost its percentage')

  if (
    (await updates
      .getByRole('progressbar', { name: 'Navigator · Downloading / installing', exact: true })
      .getAttribute('aria-valuenow')) !== null
  )
    throw new Error('An opaque installation stage fabricated a percentage')

  await captureGui(updates, '31-desktop-update-stages')
  await updates.getByRole('button', { name: 'Close', exact: true }).last().click()
  console.log('Production Todo presentation and determinate/indeterminate update states passed in Desktop.')
  await mcpInteractions(page, command)
}

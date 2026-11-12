// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { mcpInteractions } from './mcp.mjs'

export async function presentationInteractions(page, command) {
  await command('Synthetic quota scales')
  const quotas = page.getByRole('dialog').last()
  const states = await quotas.locator('[data-navigator-quota-window]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const meters = [...node.querySelectorAll('[role="meter"]')]
      const labels = [...node.querySelectorAll('[data-navigator-quota-label]')]
      const quotaBox = meters[0].getBoundingClientRect()
      const timeBox = meters[1].getBoundingClientRect()

      return {
        pace: node.dataset.pace,
        quota: meters[0].getAttribute('aria-valuenow'),
        time: meters[1].getAttribute('aria-valuenow'),
        quotaColor: getComputedStyle(meters[0].firstElementChild).backgroundColor,
        timeColor: getComputedStyle(meters[1].firstElementChild).backgroundColor,
        bounded: meters.every((meter) => meter.getBoundingClientRect().width <= 301),
        paired: Math.abs(timeBox.top - quotaBox.bottom) <= 2,
        labelOrder:
          labels[0].getBoundingClientRect().bottom < quotaBox.top &&
          labels[1].getBoundingClientRect().top > timeBox.bottom,
      }
    }),
  )

  if (
    states.map((state) => state.pace).join(',') !== 'normal,yellow,orange,red' ||
    states.some(
      (state) =>
        state.time !== '81' ||
        state.timeColor !== 'rgb(66, 165, 245)' ||
        !state.bounded ||
        !state.paired ||
        !state.labelOrder,
    ) ||
    new Set(states.map((state) => state.quotaColor)).size !== 4
  )
    throw new Error(`Incorrect quota/time scales: ${JSON.stringify(states)}`)

  const reset = quotas.locator('[data-navigator-quota-window]').first().getByRole('button')

  await reset.getByText(/Reset in/u).waitFor()
  await reset.click()
  await reset.getByText(/^Resets /u).waitFor()

  if (
    (await quotas
      .locator('[data-navigator-quota-window]')
      .first()
      .getByText(/Reset in/u)
      .count()) !== 0
  )
    throw new Error('Reset row duplicated relative and absolute dates')

  await reset.focus()
  await page.keyboard.press('Enter')
  await reset.getByText(/Reset in/u).waitFor()
  await page.keyboard.press('Space')
  await reset.getByText(/^Resets /u).waitFor()

  await quotas.getByRole('button', { name: 'Close', exact: true }).last().click()
  console.log('Two quota/period scales, blue period fill and four pace colors passed.')
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
  const slot = updates.locator('[data-navigator-update-control]')

  await slot.getByRole('button', { name: 'Check for updates', exact: true }).click()
  await slot.getByRole('button', { name: 'Update Navigator…', exact: true }).click()
  await slot.getByRole('progressbar', { name: 'Downloading 40%', exact: true }).waitFor()
  await updates.getByRole('button', { name: 'Finish synthetic update', exact: true }).click()
  await slot.getByText('Restart OpenCode to load the update.', { exact: true }).waitFor()

  if (await slot.getByRole('button').count()) throw new Error('Restart state retained an update button')

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

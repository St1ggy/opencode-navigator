export async function verifyIdleSubagent(panel) {
  const section = panel.getByRole('region', { name: 'Subagents', exact: true })
  const heading = section.getByRole('heading').getByRole('button')
  const expanded = (await heading.getAttribute('aria-expanded')) === 'true'

  if (!expanded) await heading.click()

  await section.getByRole('button', { name: 'Synthetic child session', exact: true }).waitFor({ timeout: 30_000 })
  await section.getByText('Idle · run history not observed', { exact: true }).waitFor()

  if (!(await section.getByRole('button', { name: /^Active/u }).isDisabled()))
    throw new Error('An idle child was misrepresented as active')

  if (!expanded) await heading.click()

  console.log('Native idle child is discoverable without fabricated run timing or model execution.')
}

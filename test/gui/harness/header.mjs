export async function verifyNavigatorHeader(page, surface, groupName) {
  const title = surface.locator('[data-navigator-session-title]').first()
  const actions = surface.getByRole('group', { name: groupName, exact: true })
  // Read every relative bound in one renderer turn; the host animates panel entry.
  const { geometry, group, controls } = await title.evaluate((node, name) => {
    const parent = node.closest('header')
    const bounds = node.getBoundingClientRect()
    const header = parent.getBoundingClientRect()
    const style = getComputedStyle(parent)
    const actionGroup = [...parent.querySelectorAll('[role="group"]')].find(
      (item) => item.getAttribute('aria-label') === name,
    )
    const groupBounds = actionGroup.getBoundingClientRect()

    return {
      geometry: {
        text: node.textContent.trim(),
        full: node.getAttribute('title'),
        width: bounds.width,
        available:
          header.width - Number(style.paddingLeft.replace(/px$/u, '')) - Number(style.paddingRight.replace(/px$/u, '')),
        bottom: bounds.bottom,
      },
      group: { x: groupBounds.x, y: groupBounds.y, width: groupBounds.width },
      controls: [...actionGroup.querySelectorAll('button')].map((button) => {
        const rect = button.getBoundingClientRect()

        return {
          native: button.dataset.component,
          label: button.getAttribute('aria-label'),
          text: button.textContent.trim(),
          left: rect.left,
          right: rect.right,
        }
      }),
    }
  }, groupName)

  if (
    geometry.text.length < 50 ||
    geometry.full !== geometry.text ||
    geometry.width < geometry.available - 3 ||
    !group ||
    group.y < geometry.bottom - 1
  )
    throw new Error(
      `Navigator actions squeezed or overlapped the long session title: ${JSON.stringify({ geometry, group })}`,
    )

  if (
    controls.some(
      (control) =>
        control.native !== 'icon-button-v2' ||
        !control.label ||
        control.text ||
        control.left < group.x - 1 ||
        control.right > group.x + group.width + 1,
    )
  )
    throw new Error(
      `Header actions must be bounded native icon controls with accessible names: ${JSON.stringify(controls)}`,
    )

  const action = actions.getByRole('button', {
    name: groupName === 'Navigator actions' ? 'Search' : 'Dock',
    exact: true,
  })
  const label = await action.getAttribute('aria-label')

  await action.hover()
  await page.getByRole('tooltip').filter({ hasText: label }).waitFor()
  await action.focus()
  await action.evaluate((node) => node.blur())
  await title.hover()
  await page.getByRole('tooltip').filter({ hasText: label }).waitFor({ state: 'hidden' })
  console.log(`${groupName}: full-width long title, native icons and tooltip verified.`)
  await verifySectionIcons(surface, groupName === 'Navigator actions')
}

async function verifySectionIcons(surface, initialLayout) {
  const icons = surface.locator('[data-navigator-section-icon]')
  const ids = await icons.evaluateAll((nodes) => nodes.map((node) => node.dataset.navigatorSectionIcon))

  if (
    initialLayout &&
    ['limits', 'todo', 'subagents', 'skills', 'quick_actions', 'mcp'].some((id) => !ids.includes(id))
  )
    throw new Error(`Missing initial sidebar section icons: ${ids.join(', ')}`)

  // Settings interactions deliberately hide sections before entering Float.
  for (const id of ids) {
    const icon = surface.locator(`[data-navigator-section-icon="${id}"]`)
    const button = icon.locator('..')
    const before = await icon.evaluate((node) => {
      const bounds = node.getBoundingClientRect()
      const chevron = node.parentElement.querySelector('[data-navigator-disclosure]').getBoundingClientRect()
      const title = node.nextElementSibling.getBoundingClientRect()

      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        chevronRight: chevron.right,
        titleLeft: title.left,
        native: Boolean(node.querySelector('svg')),
        hidden: node.getAttribute('aria-hidden'),
      }
    })

    if (
      !before.native ||
      before.hidden !== 'true' ||
      before.width !== 16 ||
      before.height !== 16 ||
      before.x < before.chevronRight ||
      before.titleLeft < before.x + before.width
    )
      throw new Error(`Invalid section icon geometry: ${id} ${JSON.stringify(before)}`)

    const expanded = await button.getAttribute('aria-expanded')

    await button.click()

    if ((await button.getAttribute('aria-expanded')) === expanded)
      throw new Error(`Section icon blocked disclosure: ${id}`)

    const after = await icon.boundingBox()

    if (!after || Math.abs(after.x - before.x) > 1 || after.width !== before.width || after.height !== before.height)
      throw new Error(`Section icon moved on disclosure: ${id}`)

    await button.click()
  }
  console.log('Native sidebar section icons and stable disclosure geometry passed.')
}

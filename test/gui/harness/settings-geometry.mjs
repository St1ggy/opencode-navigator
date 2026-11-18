import { expect } from '@playwright/test'

// oxlint-disable-next-line import-x-js/extensions
import { captureGui, capturesEnabled } from './capture.mjs'
// oxlint-disable-next-line import-x-js/extensions
import { verifySettingsScroll } from './settings-scroll.mjs'

async function captureCategory(page, category, width) {
  if (!capturesEnabled || width !== 1280) return

  if (category === 'About')
    await page.getByRole('region', { name: 'About settings', exact: true }).getByRole('list').first().waitFor()

  await captureGui(page, `33-desktop-settings-${category.toLowerCase().replaceAll(' ', '-')}`)
}

async function verifyNativeTabs(page, navigation, category, width) {
  const current = navigation.getByRole('button', { name: category, exact: true })

  await expect(current.locator('svg')).toHaveCount(1)
  const scope = page.getByLabel('Navigator preference scope', { exact: true })

  await (category === 'About' || category === 'Skills' ? expect(scope).toHaveCount(0) : expect(scope).toBeVisible())

  if (category !== 'Behavior') return

  const panel = page.getByRole('region', { name: 'Behavior settings', exact: true })
  const input = panel.getByRole('textbox', { name: 'Limits refresh in minutes', exact: true })

  await expect(input).toBeVisible()
  const geometry = await panel.evaluate((region) => {
    const field = region.querySelector('input[aria-label="Limits refresh in minutes"]')
    const interval = field?.closest('[data-component="settings-row"]')
    const controls = interval?.querySelector('[data-slot="settings-row-control"]')
    const copy = interval?.querySelector('[data-slot="settings-row-copy"]')
    const save = interval?.querySelector('button')
    const toolbar = [...region.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === 'Configure toolbar',
    )

    return {
      wrapper: controls?.getBoundingClientRect().toJSON(),
      copy: copy?.getBoundingClientRect().toJSON(),
      field: field?.getBoundingClientRect().toJSON(),
      save: save?.getBoundingClientRect().toJSON(),
      toolbar: toolbar?.getBoundingClientRect().toJSON(),
    }
  })

  expect(geometry.field.width, `${width}px: numeric field should be compact`).toBeLessThanOrEqual(84)
  expect(
    Math.abs(geometry.field.y + geometry.field.height / 2 - geometry.save.y - geometry.save.height / 2),
    `${width}px: input and save should stay together`,
  ).toBeLessThanOrEqual(2)

  if (geometry.wrapper.top >= geometry.copy.bottom) {
    expect(
      Math.abs(geometry.field.left - geometry.copy.left),
      `${width}px: stacked group aligns with its label`,
    ).toBeLessThanOrEqual(2)

    return
  }

  expect(
    Math.abs(geometry.toolbar.right - geometry.save.right),
    `${width}px: actions share one right edge`,
  ).toBeLessThanOrEqual(2)
}

export async function verifySettingsGeometry(page) {
  const original =
    page.viewportSize() ??
    (await page.evaluate(() => ({ width: globalThis.innerWidth, height: globalThis.innerHeight })))

  try {
    for (const [width, height] of [
      [1280, 900],
      [1040, 900],
      [800, 900],
      [1280, 600],
      [800, 600],
    ]) {
      await page.setViewportSize({ width, height })
      const navigation = page.getByRole('navigation', { name: 'Navigator settings categories', exact: true })

      for (const category of ['Layout', 'Behavior', 'Quick Actions', 'Skills', 'MCP', 'Presets', 'About']) {
        await navigation.getByRole('button', { name: category, exact: true }).click()
        await verifyNativeTabs(page, navigation, category, width)
        const failures = await page.locator('.settings-tab-body').evaluateAll((bodies) => {
          const errors = []

          const rows = bodies.flatMap((body) => [...body.querySelectorAll('[data-component="settings-row"]')])

          for (const row of rows) {
            const bounds = row.getBoundingClientRect()

            if (!bounds.width) continue

            if (row.scrollWidth > row.clientWidth + 2)
              errors.push({ label: 'Row content overflows', width: bounds.width, content: row.scrollWidth })

            for (const control of row.querySelectorAll('button, input, textarea, [role="switch"]')) {
              const rect = control.getBoundingClientRect()

              if (rect.width && (rect.left < bounds.left - 2 || rect.right > bounds.right + 2))
                errors.push({
                  label: control.getAttribute('aria-label') || control.textContent,
                  width: bounds.width,
                  left: rect.left - bounds.left,
                  right: rect.right - bounds.right,
                })
            }
            const copy = row.querySelector('[data-slot="settings-row-copy"]')?.getBoundingClientRect()

            if (copy && copy.width < Math.min(160, bounds.width * 0.3))
              errors.push({ label: 'Compressed row label', width: copy.width })
          }

          return errors.slice(0, 8)
        })

        if (failures.length > 0)
          throw new Error(`Navigator Settings geometry fails at ${width}px: ${JSON.stringify(failures)}`)

        await verifySettingsScroll(page, width, category)

        if (height === 900) await captureCategory(page, category, width)
      }
    }
  } finally {
    await page.setViewportSize(original)
    await page
      .getByRole('navigation', { name: 'Navigator settings categories', exact: true })
      .getByRole('button', { name: 'Layout', exact: true })
      .click()
  }
}

export async function verifySectionDrag(page) {
  const list = page.getByRole('list', { name: 'Section order', exact: true })
  const order = () =>
    list.locator('[data-sortable-item]').evaluateAll((nodes) => nodes.map((node) => node.dataset.sortableItem))
  const before = await order()
  const source = list.getByRole('button', { name: 'Reorder Limits', exact: true })

  await source.scrollIntoViewIfNeeded()
  const grip = await source.boundingBox()
  const destination = await list.locator('[data-sortable-item]').nth(1).boundingBox()

  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2, { steps: 8 })
  await page.mouse.up()
  const moved = await order()

  if (moved[1] !== before[0] || moved[0] !== before[1]) throw new Error('Section pointer drag did not change the order')

  await source.focus()
  await page.keyboard.press('Space')
  await expect(list.getByRole('status')).toContainText('Picked up.')
  await page.keyboard.press('ArrowUp')
  await expect(list.getByRole('status')).toContainText(`Drop at position 1 of ${before.length}`)
  await page.keyboard.press('Space')
  await page.waitForFunction(
    (expected) => {
      const root = document.querySelector('[role="list"][aria-label="Section order"]')
      const actual = [...(root?.querySelectorAll('[data-sortable-item]') ?? [])].map(
        (node) => node.dataset.sortableItem,
      )

      return JSON.stringify(actual) === JSON.stringify(expected)
    },
    before,
    { timeout: 5000 },
  )

  await verifySettingsScroll(page, page.viewportSize()?.width ?? 1280, 'Layout after reorder')
  console.log('Section pointer and keyboard ordering preserve stable rows.')
}

export async function verifyDisclosure(panel) {
  const toggle = panel.getByRole('button', { name: /^Limits(?:\s|$)/u }).first()
  const icon = toggle.locator('[data-navigator-disclosure]')
  const before = await icon.boundingBox()
  const title = await toggle.locator('span').nth(1).boundingBox()
  const expanded = await toggle.getAttribute('aria-expanded')

  await toggle.click()
  const after = await icon.boundingBox()
  const movedTitle = await toggle.locator('span').nth(1).boundingBox()

  if (
    !before ||
    !after ||
    !title ||
    !movedTitle ||
    Math.abs(before.width - after.width) > 0.5 ||
    Math.abs(before.height - after.height) > 0.5 ||
    Math.abs(title.x - movedTitle.x) > 0.5
  )
    throw new Error('Section disclosure changed size or shifted its title')

  if ((await toggle.getAttribute('aria-expanded')) === expanded) throw new Error('Section disclosure did not toggle')

  await toggle.click()
}

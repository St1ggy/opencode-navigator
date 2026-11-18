import { expect } from '@playwright/test'
// oxlint-disable-next-line import-x-js/extensions
import { captureGui } from './capture.mjs'

export async function startupInteractions(page, command) {
  await command('Synthetic startup skeletons')
  const dialog = page.getByRole('dialog').last()
  const fixture = dialog.locator('[data-startup-fixture]')

  await expect(fixture).toHaveAttribute('data-layouts-ready', 'true')
  for (const width of [420, 260]) {
    await fixture.evaluate((node, value) => {
      node.style.width = `${value}px`
    }, width)
    // Wait for ResizeObserver to record the new width, without arbitrary sleeps.
    const surfaces = fixture.locator('[data-loading-surface]')
    const contentWidth = await fixture.evaluate((node) => node.clientWidth)
    const geometry = () =>
      surfaces.evaluateAll((nodes) =>
        nodes.map((node) => {
          const root = node.closest('[data-startup-fixture]')
          const rect = node.getBoundingClientRect()

          return { height: rect.height, top: rect.top - root.getBoundingClientRect().top + root.scrollTop }
        }),
      )

    await expect
      .poll(() => surfaces.first().evaluate((node) => Math.round(node.getBoundingClientRect().width)))
      .toBe(contentWidth)
    await fixture
      .getByRole('textbox')
      .first()
      .evaluate((node) => {
        node.dataset.syntheticIdentity = 'same-input'
      })
    const before = await geometry()

    await dialog.getByRole('button', { name: 'Begin startup', exact: true }).click()
    await expect(fixture.locator('[data-loading-skeleton]')).toHaveCount(6)
    const during = await geometry()

    expect(during).toEqual(before)
    await expect(fixture.locator('[data-loading-skeleton] span').first()).toBeVisible()
    await expect(fixture.getByRole('textbox')).toHaveCount(0)
    await expect(fixture.locator('[data-loading-surface][aria-busy="true"] > [inert]')).toHaveCount(6)
    await fixture.getByRole('button', { name: 'limits', exact: true }).focus()
    await page.keyboard.press('Tab')
    await expect(fixture.getByRole('button', { name: 'todo', exact: true })).toBeFocused()

    if (width === 420) await captureGui(dialog, '36-desktop-startup-skeletons')

    await fixture.getByRole('button', { name: 'code_mode', exact: true }).click()
    await expect(
      fixture.getByRole('region', { name: 'code_mode', exact: true }).locator('[data-loading-skeleton]'),
    ).toHaveCount(0)
    await fixture.getByRole('button', { name: 'code_mode', exact: true }).click()
    await dialog.getByRole('button', { name: 'Receive synthetic data', exact: true }).click()
    const updated = await geometry()

    expect(updated).toEqual(before)
    await dialog.getByRole('button', { name: 'Finish startup', exact: true }).click()
    await expect(fixture.locator('[data-loading-skeleton]')).toHaveCount(0)
    await expect(fixture.getByRole('textbox')).toHaveCount(6)
    await expect(fixture.getByRole('textbox').first()).toHaveAttribute('data-synthetic-identity', 'same-input')
    await dialog.getByRole('button', { name: 'Begin startup', exact: true }).click()
    await dialog.getByRole('button', { name: 'Fail startup', exact: true }).click()
    await expect(fixture.locator('[data-loading-skeleton]')).toHaveCount(0)
    await expect(fixture.getByRole('alert')).toHaveCount(6)
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  console.log('Startup skeletons preserve measured geometry, late expansion, inert controls and error release.')
}

/** @jsxImportSource @opentui/solid */
import { expect, test } from 'bun:test'

import { openSettings } from '../src/features/sidebar-settings'

import { aboutServicesFixture } from './fixtures/about-services'
import { bugReportTransportFixture } from './fixtures/bug-report-transport'
import { toolbarHarness } from './fixtures/toolbar-harness'

import type { BoxRenderable, InputRenderable, TextareaRenderable } from '@opentui/core'

test('synthetic public editor changes reach the confirmed Bug report draft', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)
  const transport = bugReportTransportFixture()

  info.service.bugReportTransport = transport.transport

  try {
    openSettings(h.api, h.preferences, 'about:bug-report')
    await h.wait('Report a bug')
    await h.click('Report a bug')
    await h.wait('Issue title')
    const title = h.renderer.root.findDescendantById('opencode-navigator.bug-report.title') as InputRenderable
    const body = h.renderer.root.findDescendantById('opencode-navigator.bug-report.body') as TextareaRenderable

    title.value = 'Synthetic report'
    body.setText('Synthetic body')
    await h.flush()
    h.api.keymap.dispatchCommand('opencode-navigator.bug-report.send')
    await h.wait('Send Bug report')
    expect(h.captureCharFrame()).toContain('Synthetic report')
    expect(h.captureCharFrame()).toContain('Synthetic body')
    expect(transport.sent).toEqual([])
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

test('editable report preserves multiline text and nested confirmation; only confirmed sending creates an issue', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)
  const transport = bugReportTransportFixture()

  info.service.bugReportTransport = transport.transport

  try {
    openSettings(h.api, h.preferences, 'about:bug-report')
    await h.wait('Report a bug')
    await h.click('Report a bug')
    await h.wait('Issue title')
    await h.mockInput.typeText('Synthetic typing defect')
    h.mockInput.pressTab()
    await h.mockInput.typeText('First line')
    h.mockInput.pressEnter()
    await h.mockInput.typeText('Second line')
    await h.flush()
    expect(transport.sent).toEqual([])
    h.mockInput.pressTab()
    await h.flush()
    expect(h.api.renderer.currentFocusedRenderable?.id).toBe('opencode-navigator.bug-report.actions')
    const command = h.api.keymap
      .getCommands({ visibility: 'registered' })
      .find((item) => item.name === 'opencode-navigator.bug-report.activate')

    expect(command).toBeDefined()
    expect(typeof command?.enabled === 'function' ? command.enabled() : command?.enabled).not.toBe(false)
    expect(
      h.api.keymap
        .getCommandBindings({ commands: ['opencode-navigator.bug-report.activate'], visibility: 'registered' })
        .get('opencode-navigator.bug-report.activate'),
    ).not.toEqual([])
    h.mockInput.pressEnter()
    await h.wait('Send Bug report')
    expect(h.captureCharFrame()).toContain('Type: Bug')
    expect(h.captureCharFrame()).toContain('Synthetic typing defect')
    h.mockInput.pressEscape()
    await h.wait('Issue title')
    expect(h.captureCharFrame()).toContain('Synthetic typing defect')
    expect(transport.sent).toEqual([])
    h.mockInput.pressEnter()
    await h.wait('Send Bug report')
    h.mockInput.pressArrow('right')
    h.mockInput.pressEnter()
    await h.wait('Bug report created')
    expect(transport.sent).toHaveLength(1)
    expect(transport.sent[0].body).toContain('First line\nSecond line')
    await h.click('Open in browser')
    expect(transport.opened).toEqual(['https://github.com/St1ggy/opencode-navigator/issues/123'])
    await h.click('New report')
    const nextTitle = h.renderer.root.findDescendantById('opencode-navigator.bug-report.title') as InputRenderable
    const nextBody = h.renderer.root.findDescendantById('opencode-navigator.bug-report.body') as TextareaRenderable

    expect(nextTitle.value).toBe('')
    expect(nextBody.plainText).not.toContain('First line')
    expect(nextBody.plainText).toContain('## Environment')
    expect(transport.sent).toHaveLength(1)
    h.mockInput.pressEscape()
    await h.wait('Navigator settings')
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

test('unauthenticated gh still allows the same editable draft to open in the browser', async () => {
  const h = await toolbarHarness(() => <box height={6} />)
  const info = aboutServicesFixture(h.api)
  const transport = bugReportTransportFixture()

  transport.readiness({ status: 'unauthenticated', message: 'Use the browser or sign in with gh' })
  info.service.bugReportTransport = transport.transport

  try {
    openSettings(h.api, h.preferences, 'about:bug-report')
    await h.wait('Report a bug')
    await h.click('Report a bug')
    await h.wait('Issue title')
    await h.mockInput.typeText('Browser report')
    await h.click('Open in browser')
    expect(transport.sent).toEqual([])
    const url = new URL(transport.opened[0])

    expect(url.searchParams.get('title')).toBe('Browser report')
    expect(url.searchParams.get('report')).toContain('## Environment')
    expect(url.searchParams.get('template')).toBe('bug_report.yml')
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

test('a narrow report keeps its fields and actions visible and recovers from a headless browser with an explicit copy', async () => {
  const h = await toolbarHarness(() => <box height={6} />, 48)
  const info = aboutServicesFixture(h.api)
  const transport = bugReportTransportFixture()

  transport.readiness({ status: 'missing', message: 'Synthetic missing gh' })
  transport.browser(false)
  info.service.bugReportTransport = transport.transport
  const copied: string[] = []

  h.api.renderer.copyToClipboardOSC52 = (value) => {
    copied.push(value)

    return true
  }

  try {
    h.renderer.resize(48, 24)
    openSettings(h.api, h.preferences, 'about:bug-report')
    await h.wait('Report a bug')
    await h.click('Report a bug')
    await h.wait('Issue title')
    const title = h.renderer.root.findDescendantById('opencode-navigator.bug-report.title') as InputRenderable
    const body = h.renderer.root.findDescendantById('opencode-navigator.bug-report.body') as TextareaRenderable
    const actions = h.renderer.root.findDescendantById('opencode-navigator.bug-report.actions') as BoxRenderable

    expect(body.screenX + body.width).toBeLessThanOrEqual(48)
    expect(actions.screenY + actions.height).toBeLessThanOrEqual(24)
    await h.mockInput.typeText('Headless report')
    await h.click('Open in browser')
    await h.wait('Copy browser link')
    await h.click('Copy browser link')
    expect(copied[0]).toBe(transport.opened[0])
    expect(title.value).toBe('Headless report')
    expect(transport.sent).toEqual([])
  } finally {
    info.dispose()
    h.renderer.destroy()
  }
})

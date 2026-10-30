import { expect, test } from 'bun:test'

import { getNavigatorAboutServices, registerNavigatorAboutServices } from '../src/features/sidebar-settings'

import { aboutServicesFixture } from './fixtures/about-services'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('release About/report scenes use synthetic services and public editor operations, never authenticated processes', async () => {
  const module = (await import(new URL('../screenshots/harness/about-scenes.mjs', import.meta.url).href)) as {
    configureAboutFixture(
      api: TuiPluginApi,
      scene: string,
      now: number,
      registry: {
        getNavigatorAboutServices: typeof getNavigatorAboutServices
        registerNavigatorAboutServices: typeof registerNavigatorAboutServices
      },
    ): void
    openAboutScene(
      api: TuiPluginApi,
      scene: string,
      dispatch: (name: string) => void,
      schedule: (function_: () => void, ms: number) => void,
    ): void
  }
  const cleanups: (() => void)[] = []
  const title = { value: '' }
  let text = ''
  const body = {
    cursorOffset: 0,
    showCursor: true,
    setText(value: string) {
      text = value
    },
  }
  const renderer = { currentFocusedRenderable: title as unknown }
  const api = {
    renderer,
    lifecycle: { onDispose: (dispose: () => void) => cleanups.push(dispose) },
  } as unknown as TuiPluginApi
  const info = aboutServicesFixture(api)

  try {
    module.configureAboutFixture(api, 'bug-report-browser', 1000, {
      getNavigatorAboutServices,
      registerNavigatorAboutServices,
    })
    const service = getNavigatorAboutServices(api)!

    expect((await service.bugReportTransport!.probe()).status).toBe('missing')
    expect((await service.changelog())[0].version).toBe(info.service.navigatorVersion)
    const scheduled: { fn: () => void; ms: number }[] = []
    const commands: string[] = []

    module.openAboutScene(
      api,
      'bug-report-confirmation',
      (name) => {
        commands.push(name)

        if (name === 'opencode-navigator.bug-report.next') renderer.currentFocusedRenderable = body
      },
      (function_, ms) => {
        scheduled.push({ fn: function_, ms })
      },
    )
    const tasks = scheduled.sort((a, b) => a.ms - b.ms)

    for (const task of tasks) task.fn()
    expect(title.value).toContain('Synthetic')
    expect(text).toContain('Fully synthetic screenshot fixture')
    expect(commands).toContain('opencode-navigator.bug-report.send')
    expect(commands).not.toContain('opencode-navigator.bug-report.confirm.activate')
    expect(body.showCursor).toBe(false)
  } finally {
    for (const dispose of cleanups) dispose()
    info.dispose()
  }
})

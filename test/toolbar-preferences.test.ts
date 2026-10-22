import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  PORTABLE_SETTINGS_FORMAT,
  type ToolbarPin,
  changeToolbarPins,
  configuredDefaultsFromPluginOptions,
  createPreferencesController,
  createPreferencesStore,
  parsePortableSettings,
  parsePreferencesDocument,
  toolbarPinKey,
} from '../src/entities/preferences'
import { pluginConfig } from '../src/shared/config'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const action: ToolbarPin = { kind: 'action', id: 'session.new', icon: 'plus' }
const skill: ToolbarPin = { kind: 'skill', location: '/synthetic/skills/review', name: 'review', icon: 'check' }

test('toolbar overflow inherits configured defaults, updates scopes, reloads and imports independently of private pins', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-overflow-'))

  try {
    const defaults = pluginConfig({ toolbar_overflow: 'wrap' })

    expect(defaults.toolbarOverflow).toBe('wrap')
    expect(pluginConfig({ toolbar_overflow: 'invalid' }).toolbarOverflow).toBe('menu')
    expect(configuredDefaultsFromPluginOptions({ toolbar_overflow: 'wrap' }).behavior?.toolbarOverflow).toBe('wrap')
    const api = { ui: { toast() {} } } as unknown as TuiPluginApi
    const controller = createPreferencesController(api, defaults, createPreferencesStore(directory))

    await controller.load()
    expect(controller.toolbarOverflow()).toBe('wrap')
    controller.toggleToolbarOverflow()
    controller.setActiveScope('/workspace')
    controller.setPreferenceScope('worktree')
    expect(controller.toolbarOverflow()).toBe('menu')
    controller.toggleToolbarOverflow()
    expect(controller.toolbarOverflow()).toBe('wrap')
    controller.changeToolbarPin({ operation: 'pin', pin: skill })
    const exported = controller.exportPortableSettings()

    expect(parsePortableSettings(exported).settings.behavior?.toolbarOverflow).toBe('wrap')
    expect(exported).not.toContain(skill.location)
    const source = JSON.stringify({
      format: PORTABLE_SETTINGS_FORMAT,
      version: 1,
      behavior: { toolbarOverflow: 'menu' },
      user: { toolbarPins: [skill] },
    })
    const preview = controller.previewPortableSettings(source)

    expect(preview.unsupported).toEqual(['/user'])
    expect(preview.behaviorChanged).toBe(true)
    await controller.applyPortableSettings(preview)
    expect(controller.toolbarOverflow()).toBe('menu')
    expect(controller.toolbarPins()).toEqual([skill])
    await controller.reloadFromFile()
    expect(controller.toolbarOverflow()).toBe('menu')
    controller.resetPluginSettings()
    controller.setPreferenceScope('global')
    controller.resetPluginSettings()
    expect(controller.toolbarOverflow()).toBe('wrap')
    await controller.flush()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('validates private pins without conflating bookmarks or exact source paths', () => {
  const parsed = parsePreferencesDocument({
    user: {
      toolbarPins: [
        action,
        skill,
        action,
        { ...skill, location: '/synthetic/other/review' },
        { ...action, id: 'arbitrary.command' },
        { ...action, icon: '\u{1B}[31m' },
      ],
      favoriteQuickActions: ['session.new'],
    },
  })

  expect(parsed.user.toolbarPins).toHaveLength(3)
  expect(parsed.user.favoriteQuickActions).toEqual(['session.new'])
  expect(changeToolbarPins(parsed.user.toolbarPins, { operation: 'remove', key: toolbarPinKey(action) })).toEqual([
    skill,
    { ...skill, location: '/synthetic/other/review' },
  ])
})

test('merges interleaved pin edits and unrelated preferences under the existing file lock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-toolbar-'))

  try {
    const first = createPreferencesStore(directory)
    const second = createPreferencesStore(directory)

    await Promise.all([
      first.update({ user: { toolbarPin: { operation: 'pin', pin: action } } }),
      second.update({
        user: {
          toolbarPin: { operation: 'pin', pin: skill },
          favoriteSkill: { location: skill.location, favorite: true },
        },
      }),
    ])
    await first.update({
      user: {
        toolbarPin: { operation: 'configure', key: toolbarPinKey(action), icon: 'star', stateIcons: { on: 'check' } },
      },
    })
    await second.update({
      user: {
        toolbarPin: { operation: 'configure', key: toolbarPinKey(action), icon: 'star', stateIcons: { off: 'circle' } },
      },
    })
    await first.update({
      user: { toolbarPin: { operation: 'move', key: toolbarPinKey(skill), before: toolbarPinKey(action) } },
    })
    await second.update({
      behavior: { cornerFont: false },
      user: { skillGroup: { location: skill.location, group: 'Review' } },
    })
    const saved = await first.load()

    expect(saved.user.toolbarPins).toEqual([
      skill,
      { ...action, icon: 'star', stateIcons: { on: 'check', off: 'circle' } },
    ])
    expect(saved.user.favoriteSkills).toEqual([skill.location])
    const api = { ui: { toast() {} } } as unknown as TuiPluginApi
    const controller = createPreferencesController(api, pluginConfig(undefined), first)

    await controller.load()
    controller.resetPluginSettings()
    expect(controller.toolbarPins()).toEqual(saved.user.toolbarPins!)
    expect(controller.exportPortableSettings()).not.toContain(skill.location)
    await second.update({ user: { toolbarPin: { operation: 'remove', key: toolbarPinKey(skill) } } })
    await controller.reloadFromFile()
    expect(controller.toolbarPins()).toHaveLength(1)
    await expect(
      first.update({ user: { toolbarPin: { operation: 'configure', key: toolbarPinKey(skill), icon: 'check' } } }),
    ).rejects.toThrow('no longer exists')
    expect(() =>
      controller.changeToolbarPin({
        operation: 'configure',
        key: toolbarPinKey(action),
        icon: 'check',
        expected: JSON.stringify(action),
      }),
    ).toThrow('Pin changed')
    await controller.flush()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

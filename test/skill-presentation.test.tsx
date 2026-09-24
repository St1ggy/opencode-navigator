/** @jsxImportSource @opentui/solid */
import { testRender } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { createSignal } from 'solid-js'

import { SkillDialog } from '../src/dialogs/skill'
import { uiIcon } from '../src/icons/ui'
import { SkillsSection } from '../src/pages/session-sidebar'

import type { PreferencesController } from '../src/controllers/preferences'
import type { SkillController, SkillInfo } from '../src/controllers/skills'
import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

test('skill dialog stays compact for short text and scrolls long text above its controls', async () => {
  for (const isLong of [false, true]) {
    let commands: { name: string; run: () => void }[] = []
    let favoriteToggles = 0
    const [favorite, setFavorite] = createSignal(false)
    const api = {
      theme: {
        current: {
          text: '#ffffff',
          textMuted: '#888888',
          accent: '#00ffff',
          primary: '#222222',
          selectedListItemText: '#ffffff',
          borderSubtle: '#444444',
        },
      },
      keymap: {
        registerLayer: (layer: { commands: typeof commands }) => {
          commands = layer.commands

          return () => {}
        },
      },
      ui: { dialog: { clear() {} } },
    } as unknown as TuiPluginApi
    const skill = {
      name: 'review',
      content: '',
      location: '/skills/review/SKILL.md',
      description: isLong
        ? Array.from({ length: 60 }, (_, index) => `Description line ${index}`).join('\n')
        : 'Review changes.',
    }
    const setup = await testRender(
      () => (
        <SkillDialog
          api={api}
          skill={skill}
          favorite={favorite()}
          favoriteDisabled={false}
          onToggleFavorite={() => {
            favoriteToggles++
            setFavorite((value) => !value)
          }}
          onAccept={() => {}}
        />
      ),
      {
        width: 60,
        height: isLong ? 32 : 80,
      },
    )

    try {
      await setup.flush()
      const frame = setup.captureCharFrame()

      expect(frame).toContain('Description')
      expect(frame).toContain('Confirmation')
      expect(frame).toContain("Don't show again")
      expect(frame).toContain('Accept')
      expect(frame).toContain('Cancel')
      expect(frame).toContain(uiIcon('bookmarkEmpty'))
      expect(frame.trimEnd().split('\n').length).toBeLessThanOrEqual(isLong ? 24 : 16)

      commands.find((command) => command.name.endsWith('.previous'))!.run()
      commands.find((command) => command.name.endsWith('.submit'))!.run()
      await setup.flush()
      expect(favoriteToggles).toBe(1)
      expect(setup.captureCharFrame()).toContain(uiIcon('bookmark'))

      const favoriteFrame = setup.captureCharFrame().split('\n')
      const favoriteRow = favoriteFrame.findIndex((line) => line.includes(uiIcon('bookmark')))

      await setup.mockMouse.click(favoriteFrame[favoriteRow].indexOf(uiIcon('bookmark')), favoriteRow)
      await setup.flush()
      expect(favoriteToggles).toBe(2)
      expect(setup.captureCharFrame()).toContain(uiIcon('bookmarkEmpty'))

      if (isLong) {
        expect(frame).not.toContain(skill.location)
        const down = commands.find((command) => command.name.endsWith('.scroll-down'))!

        for (let index = 0; index < 70; index++) down.run()
        await setup.flush()
        expect(setup.captureCharFrame()).toContain(skill.location)
        expect(setup.captureCharFrame()).toContain('Accept')
      } else {
        expect(frame.indexOf('Description')).toBeLessThan(frame.indexOf('Source'))
        expect(frame.indexOf('Source')).toBeLessThan(frame.indexOf('Confirmation'))
        expect(frame.indexOf('Confirmation')).toBeLessThan(frame.indexOf("Don't show again"))
        expect(frame).toContain(skill.location)
      }
    } finally {
      setup.renderer.destroy()
    }
  }
})

test('Skills keep favorites before recent, use bookmark controls, and record only successful uses', async () => {
  const items = ['alpha', 'favorite', 'zebra'].map((name) => ({
    name,
    location: `/skills/${name}/SKILL.md`,
    content: '',
    description: 'Skill description',
  }))
  const [recent, setRecent] = createSignal([items[2].location])
  let uses = 0
  let isFail = false
  const api = {
    theme: {
      current: {
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#00ffff',
        warning: '#ffff00',
        backgroundPanel: '#111111',
      },
    },
    keymap: { registerLayer: () => () => {} },
    ui: {
      toast() {},
      dialog: {
        replace() {},
        clear() {},
        setSize() {},
      },
    },
  } as unknown as TuiPluginApi
  const controller = {
    target: () => ({ key: 'test' }),
    list: () => items,
    state: () => ({ status: 'ready' }),
    refresh: async () => items,
    use: async () => {
      uses++

      if (isFail) throw new Error('failed')

      return true
    },
  } as unknown as SkillController
  const preferences = {
    expanded: () => ({ skills: true }),
    favoriteSkills: () => new Set([items[1].location]),
    isFavoriteSkill: (item: SkillInfo) => item.location === items[1].location,
    recentSkills: recent,
    shouldConfirmSkill: () => false,
    sectionItemLimit: () => 0,
    recordSkillUse: async (item: SkillInfo) =>
      setRecent([item.location, ...recent().filter((location) => location !== item.location)]),
  } as unknown as PreferencesController
  const setup = await testRender(() => <SkillsSection api={api} controller={controller} preferences={preferences} />, {
    width: 60,
    height: 30,
  })

  async function clickSkill(name: string) {
    const lines = setup.captureCharFrame().split('\n')
    const row = lines.findIndex((line) => line.includes(name))

    await setup.mockMouse.click(lines[row].indexOf(name), row)
    await setup.flush()
  }
  try {
    await setup.flush()
    const frame = setup.captureCharFrame()

    expect(frame.indexOf('favorite')).toBeLessThan(frame.indexOf('zebra'))
    expect(frame.indexOf('zebra')).toBeLessThan(frame.indexOf('alpha'))
    expect(frame).toContain(uiIcon('bookmark'))
    expect(frame).toContain(uiIcon('bookmarkEmpty'))
    expect(frame).not.toContain(uiIcon('info'))
    await clickSkill('alpha')
    expect(recent()[0]).toBe(items[0].location)
    isFail = true
    await clickSkill('zebra')
    expect(recent()[0]).toBe(items[0].location)
    expect(uses).toBe(2)
  } finally {
    setup.renderer.destroy()
  }
})

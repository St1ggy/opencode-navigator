import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadConfiguredDefaults } from '../src/app/configured-defaults'
import { parseConfiguredDefaults } from '../src/entities/preferences/model/configured-defaults'
import { createPreferencesController } from '../src/entities/preferences/model/controller'
import { serializePortableSettings } from '../src/entities/preferences/model/portable-settings'
import { previewProjectProfile, saveProjectProfile } from '../src/entities/preferences/model/project-profile'
import { pluginConfig } from '../src/shared/config'

import type { TuiPluginApi } from '@opencode-ai/plugin/tui'

const input = serializePortableSettings(
  { sections: { todo: true, skills: false }, expanded: { mcp: true }, order: ['todo', 'skills', 'mcp'] },
  { docs: 'enabled', tracker: 'disabled' },
)

test('project profiles save portable layout and MCP presets without exporting private preferences', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-project-profile-'))
  const configDirectory = join(directory, '.opencode')
  const file = join(configDirectory, 'navigator.json')

  try {
    await mkdir(configDirectory)
    await writeFile(
      file,
      JSON.stringify({
        behavior: { rowDensity: 'compact' },
        layoutPresets: { Existing: { sections: { lsp: false } } },
      }),
    )
    const preview = await previewProjectProfile(
      directory,
      'Review',
      JSON.stringify({ ...JSON.parse(input), favoriteSkills: ['/private/skill'] }),
    )

    expect(await readFile(file, 'utf8')).not.toContain('Review')
    expect(preview.skipped).toEqual(['/favoriteSkills'])
    await saveProjectProfile(preview, directory)
    const saved = await readFile(file, 'utf8')
    const configured = parseConfiguredDefaults(JSON.parse(saved))

    expect(configured.behavior?.rowDensity).toBe('compact')
    expect(configured.layoutPresets?.Existing?.sections).toEqual({ lsp: false })
    expect(configured.layoutPresets?.Review?.sections).toEqual({ todo: true, skills: false })
    expect(configured.mcpPresets?.Review).toEqual({ docs: 'enabled', tracker: 'disabled' })
    expect(configured.workspaceProfiles?.Review).toBe('Review')
    expect(saved).not.toContain('/private/skill')
    expect(saved).not.toContain('favoriteSkills')
    const api = { state: { path: {} }, ui: { toast() {} } } as unknown as TuiPluginApi
    const merged = await loadConfiguredDefaults(api, undefined, async () => saved)
    const controller = createPreferencesController(
      api,
      pluginConfig(undefined),
      {
        load: async () => ({ global: {}, worktrees: {}, user: {} }),
        update: async () => {},
        flush: async () => {},
      },
      merged,
    )

    await controller.load()
    expect(controller.layoutPresets().Review).toBeDefined()
    expect(controller.mcpPresets().Review).toEqual({ docs: 'enabled', tracker: 'disabled' })
    expect(controller.workspaceProfiles().Review).toBe('Review')
    await expect(previewProjectProfile(directory, 'review', input)).rejects.toThrow('already exists')
    const updated = await previewProjectProfile(
      directory,
      'Review',
      serializePortableSettings({ sections: { todo: false }, expanded: {} }, {}),
      true,
    )

    await saveProjectProfile(updated, directory)
    const revised = parseConfiguredDefaults(JSON.parse(await readFile(file, 'utf8')))

    expect(revised.layoutPresets?.Review?.sections.todo).toBe(false)
    expect(revised.workspaceProfiles?.Review).toBeUndefined()
    expect(revised.mcpPresets?.Review).toEqual({ docs: 'enabled', tracker: 'disabled' })
    await writeFile(
      file,
      JSON.stringify({
        ...JSON.parse(await readFile(file, 'utf8')),
        workspaceProfiles: { Other: 'Review' },
      }),
    )
    await expect(previewProjectProfile(directory, 'Review', input, true)).rejects.toThrow('linked to another')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('project profile preview rejects stale targets, concurrent edits, path-like server names, and symlinks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-project-stale-'))
  const other = await mkdtemp(join(tmpdir(), 'navigator-other-project-'))
  const file = join(directory, '.opencode', 'navigator.json')

  try {
    const preview = await previewProjectProfile(directory, 'Focus', input)

    await expect(saveProjectProfile(preview, other)).rejects.toThrow('Workspace changed')
    await mkdir(join(directory, '.opencode'))
    await writeFile(file, '{"mcpServerGroups":{"docs":"Knowledge"}}')
    await expect(saveProjectProfile(preview, directory)).rejects.toThrow('Project settings changed')
    expect(await readFile(file, 'utf8')).toContain('Knowledge')
    for (const key of ['favoriteSkills', 'codexAccountBindings', 'pendingResetAttempt']) {
      await writeFile(file, JSON.stringify({ [key]: ['/private/value'] }))
      await expect(previewProjectProfile(directory, 'Focus', input)).rejects.toThrow('private field')
    }
    await expect(
      previewProjectProfile(
        directory,
        'Unsafe',
        serializePortableSettings({ sections: { todo: true }, expanded: {} }, { '/private/server': 'enabled' }),
      ),
    ).rejects.toThrow('private path')
    await expect(previewProjectProfile(directory, '/private/Focus', input)).rejects.toThrow('private paths')
    await rm(join(directory, '.opencode'), { recursive: true })
    await symlink(other, join(directory, '.opencode'))
    await expect(saveProjectProfile(preview, directory)).rejects.toThrow('symlink')
  } finally {
    await rm(directory, { recursive: true, force: true })
    await rm(other, { recursive: true, force: true })
  }
})

test('published profile command previews before writing and requires explicit --apply', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'navigator-profile-cli-'))
  const command = join(import.meta.dir, '..', 'scripts', 'save-project-profile.mjs')

  async function run(flags: string[]) {
    const child = Bun.spawn(['node', command, 'save', 'Focus', ...flags], {
      cwd: directory,
      stdin: new Blob([input]),
      stdout: 'pipe',
      stderr: 'pipe',
    })

    return { code: await child.exited, output: await new Response(child.stdout).text() }
  }

  try {
    const preview = await run([])

    expect(preview.code).toBe(0)
    expect(preview.output).toContain('Preview only')
    await expect(readFile(join(directory, '.opencode', 'navigator.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    })
    const applied = await run(['--apply'])

    expect(applied.code).toBe(0)
    expect(applied.output).toContain('Saved.')
    expect(await readFile(join(directory, '.opencode', 'navigator.json'), 'utf8')).toContain('workspaceProfiles')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

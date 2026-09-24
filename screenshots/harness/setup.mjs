import { mkdir, writeFile } from 'node:fs/promises'

const scene = process.env.SCREENSHOT_SCENE ?? 'hero'
const hasCornerFont = process.env.SCREENSHOT_NO_CORNER_FONT !== 'true'
const stateRoot = process.env.XDG_STATE_HOME
const workspace = '/workspace/atlas-console'
const sessionID = 'ses_01J00000000000000000000000'
const preferenceDirectory = `${stateRoot}/opencode/opencode-pretty-sidebar`
const allSections = {
  todo: true,
  subagents: true,
  skills: true,
  quick_actions: true,
  lsp: true,
  mcp: true,
}
const defaultOrder = ['todo', 'subagents', 'skills', 'quick_actions', 'lsp', 'mcp']
const subagentsOrder = ['subagents', 'todo', 'skills', 'quick_actions', 'lsp', 'mcp']
const sectionOrder = scene.startsWith('subagents')
  ? subagentsOrder
  : scene === 'sidebar-skills'
    ? ['skills', 'todo', 'subagents', 'quick_actions', 'lsp', 'mcp']
    : scene === 'sidebar-actions-lsp' || scene === 'text-fallback'
      ? ['quick_actions', 'lsp', 'todo', 'subagents', 'skills', 'mcp']
      : scene.startsWith('sidebar-mcp') || scene.startsWith('mcp-')
        ? ['mcp', 'todo', 'subagents', 'skills', 'quick_actions', 'lsp']
        : defaultOrder
const collapsedSections = Object.fromEntries(Object.keys(allSections).map((section) => [section, false]))
const expandedSections = scene.startsWith('subagents')
  ? { ...collapsedSections, subagents: true }
  : scene === 'sidebar-skills'
    ? { ...collapsedSections, skills: true }
    : scene === 'sidebar-actions-lsp' || scene === 'text-fallback'
      ? { ...collapsedSections, quick_actions: true, lsp: true }
      : scene.startsWith('sidebar-mcp') || scene.startsWith('mcp-')
        ? { ...collapsedSections, mcp: true }
        : { ...collapsedSections, todo: true, subagents: scene === 'hero' }
const preferences = {
  global: {
    behavior: {
      toggleKey: 'ctrl+shift+b',
      focusKey: 'ctrl+shift+f',
      searchKey: 'alt+y',
      persistMcp: false,
      cornerFont: hasCornerFont,
      lspIconStyle: scene === 'text-fallback' ? 'text' : 'nerd',
      sectionItemLimits: { todo: 3, subagents: 2, skills: 2, quick_actions: 3, lsp: 3, mcp: 3 },
    },
    layout: {
      sections: allSections,
      expanded: expandedSections,
      order: sectionOrder,
    },
  },
  worktrees: {
    [workspace]: {
      layout: {
        sections: allSections,
        expanded: expandedSections,
        order: sectionOrder,
      },
    },
  },
  user: {
    onboardingCompleted: !scene.startsWith('setup-'),
    ...(scene === 'settings-trusted-skills' && {
      skippedSkillConfirmations: [
        `${workspace}/.opencode/skills/release-check/SKILL.md`,
        `${workspace}/.opencode/skills/review-changes/SKILL.md`,
      ],
    }),
    favoriteSkills: [`${workspace}/.opencode/skills/review-changes/SKILL.md`],
    favoriteMcpServers: ['docs'],
    favoriteQuickActions: ['session.fork', 'messages.copy'],
    mcpServerGroups: {
      browser: 'Research',
      issue_tracker: 'Project tools',
      metrics: 'Operations',
      repository: 'Project tools',
      'archived-docs': 'Research',
    },
    recentSkills: [`${workspace}/.opencode/skills/release-check/SKILL.md`],
    layoutPresets: {
      'Deep review': {
        sections: { ...allSections, quick_actions: false, lsp: false },
        expanded: { ...allSections, quick_actions: false, lsp: false, mcp: false },
        order: ['todo', 'subagents', 'skills', 'mcp', 'quick_actions', 'lsp'],
      },
      'Operations view': {
        sections: allSections,
        expanded: { ...allSections, skills: false, quick_actions: false },
        order: ['mcp', 'todo', 'subagents', 'lsp', 'skills', 'quick_actions'],
      },
    },
    mcpPresets: {
      'Documentation only': {
        browser: 'disabled',
        docs: 'enabled',
        issue_tracker: 'disabled',
        metrics: 'disabled',
        repository: 'disabled',
      },
      'Full workspace': {
        browser: 'enabled',
        docs: 'enabled',
        issue_tracker: 'enabled',
        metrics: 'enabled',
        repository: 'enabled',
      },
    },
    workspaceProfiles: { 'Deep review': 'Documentation only' },
  },
}
const config = {
  $schema: 'https://opencode.ai/tui.json',
  theme: 'tokyonight',
  plugin: [
    [
      'file:///harness/fixture-plugin.mjs',
      {
        persist_mcp: false,
        icon_style: scene === 'text-fallback' ? 'text' : 'nerd',
        focus_key: 'ctrl+shift+f',
        search_key: 'alt+y',
        toggle_key: 'ctrl+shift+b',
      },
    ],
  ],
  plugin_enabled: {
    'internal:sidebar-context': false,
    'internal:sidebar-mcp': false,
    'internal:sidebar-lsp': false,
    'internal:sidebar-todo': false,
  },
}
const session = {
  info: {
    id: sessionID,
    slug: 'navigator-product-tour',
    projectID: 'fixture-project',
    directory: workspace,
    title: 'Navigator product tour',
    version: '1.18.30',
    time: { created: 1_893_455_100_000, updated: 1_893_456_000_000 },
  },
  messages: [],
}

await Promise.all([
  mkdir(preferenceDirectory, { recursive: true }),
  mkdir(workspace, { recursive: true }),
  mkdir(process.env.HOME, { recursive: true }),
  mkdir(process.env.XDG_CACHE_HOME, { recursive: true }),
  mkdir(process.env.XDG_CONFIG_HOME, { recursive: true }),
  mkdir(process.env.XDG_DATA_HOME, { recursive: true }),
])
await Promise.all([
  writeFile(`${preferenceDirectory}/preferences.json`, `${JSON.stringify(preferences, null, 2)}\n`),
  writeFile(process.env.OPENCODE_TUI_CONFIG, `${JSON.stringify(config, null, 2)}\n`),
  writeFile('/tmp/navigator-session.json', `${JSON.stringify(session, null, 2)}\n`),
])

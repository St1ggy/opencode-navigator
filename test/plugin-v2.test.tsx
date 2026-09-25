/** @jsxImportSource @opentui/solid */
import { Host } from '@opencode/plugin/host'
import { testRender, useRenderer } from '@opentui/solid'
import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

import type { Plugin } from '@opencode/plugin/tui'
import type { JSX } from '@opentui/solid'

type Claim = {
  append?: string
  replace?: string
  render: (input: { sessionID: string }) => JSX.Element
}

function hue(color: string) {
  return Object.fromEntries([100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [step, color]))
}

function stateful(color: string) {
  return {
    base: color,
    disabled: color,
    pressed: color,
    focused: color,
    selected: color,
    hovered: color,
    state: () => color,
  }
}

const syntax = {
  comment: '#565f89',
  keyword: '#bb9af7',
  function: '#7aa2f7',
  variable: '#c0caf5',
  string: '#9ece6a',
  number: '#ff9e64',
  type: '#7dcfff',
  operator: '#89ddff',
  punctuation: '#a9b1d6',
}
const markdown = {
  text: '#c0caf5',
  heading: '#7aa2f7',
  link: '#7dcfff',
  linkText: '#bb9af7',
  code: '#9ece6a',
  blockQuote: '#a9b1d6',
  emphasis: '#ff9e64',
  strong: '#e0af68',
  horizontalRule: '#565f89',
  listItem: '#7aa2f7',
  listEnumeration: '#7aa2f7',
  image: '#bb9af7',
  imageText: '#c0caf5',
  codeBlock: '#9ece6a',
}
const theme = {
  hue: {
    interactive: hue('#7aa2f7'),
    accent: hue('#ff9e64'),
    neutral: hue('#565f89'),
  },
  categorical: [hue('#9d7cd8')],
  decrease: (color: string) => color,
  text: {
    base: '#c0caf5',
    muted: '#a9b1d6',
    action: {
      primary: stateful('#16161e'),
      secondary: stateful('#c0caf5'),
      destructive: stateful('#f7768e'),
    },
    feedback: {
      error: { base: '#f7768e', muted: '#f7768e' },
      warning: { base: '#e0af68', muted: '#e0af68' },
      success: { base: '#9ece6a', muted: '#9ece6a' },
      info: { base: '#7dcfff', muted: '#7dcfff' },
    },
  },
  background: {
    base: '#1a1b26',
    raised: { base: '#16161e', high: '#292e42', max: '#24283b' },
  },
  border: { base: '#565f89' },
  scrollbar: { base: '#27a1b9' },
  diff: {
    text: { added: '#9ece6a', removed: '#f7768e', context: '#a9b1d6', hunkHeader: '#7aa2f7' },
    background: { added: '#1f3a2b', removed: '#3b2028', context: '#1a1b26' },
    highlight: { added: '#2f5a3b', removed: '#5a3038' },
    lineNumber: { text: '#565f89', background: { added: '#1f3a2b', removed: '#3b2028' } },
  },
  syntax,
  markdown,
}

test('the packaged plugin mounts through the OpenCode 2.x contract', async () => {
  const loaded = (await Host.load(fileURLToPath(new URL('../dist/tui.js', import.meta.url)))) as {
    default: Plugin.Definition & { tui: unknown }
  }
  const plugin = loaded.default
  const claims: Claim[] = []
  const slotCleanups: string[] = []
  const rendererSubscriptions: string[] = []
  let dialogShows = 0
  const session = {
    id: 'session-v2',
    projectID: 'project',
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: 1, updated: 2 },
    title: 'OpenCode 2 session',
    location: { directory: '/workspace' },
  }
  let context!: Plugin.Context
  const originalFetch = globalThis.fetch

  globalThis.fetch = Object.assign(() => Promise.resolve(Response.json({ version: '0.15.0' })), {
    preconnect() {},
  })

  function Harness() {
    const renderer = useRenderer()

    context = {
      options: {},
      location: { directory: '/workspace' },
      app: { version: '2.0.16', channel: 'stable' },
      renderer: Object.assign(renderer, {
        on(name: string) {
          rendererSubscriptions.push(name)
        },
        off() {},
      }),
      client: {
        session: {
          list: async () => ({ data: [], cursor: {} }),
          active: async () => ({}),
          skill: async () => {},
        },
        skill: {
          list: async () => ({
            location: { directory: '/workspace' },
            data: [
              {
                id: 'skill-1',
                name: 'review',
                description: 'Review changes',
                path: '/workspace/.opencode/skills/review.md',
                content: '# Review',
              },
            ],
          }),
        },
        mcp: {
          list: async () => ({
            location: { directory: '/workspace' },
            data: [{ name: 'docs', status: { status: 'connected' } }],
          }),
          connect: async () => {},
          disconnect: async () => {},
        },
      },
      data: {
        on: () => () => {},
        listen: () => () => {},
        session: {
          list: () => [session],
          get: (sessionID: string) => (sessionID === session.id ? session : undefined),
          status: () => 'idle',
        },
        location: {
          default: () => ({ directory: '/workspace' }),
          mcp: { server: { list: () => [{ name: 'docs', status: { status: 'connected' } }] } },
        },
      },
      attention: {},
      theme,
      themeMode: 'dark',
      markdown: {},
      keymap: {
        layer: () => {},
        dispatch: () => {},
        shortcuts: () => [],
        commands: () => [],
        pending: () => [],
        active: () => [],
        mode: { current: () => 'base', push: () => () => {} },
      },
      storage: {},
      ui: {
        dialog: {
          show: () => {
            dialogShows++
          },
          set: () => {},
          clear: () => {},
          prompt: async () => {},
        },
        toast: { show: () => {} },
        router: {
          current: () => ({ type: 'session', sessionID: session.id }),
          navigate: () => {},
        },
        slot(claim: Claim) {
          claims.push(claim)

          return () => slotCleanups.push(claim.append ?? claim.replace ?? '')
        },
      },
    } as unknown as Plugin.Context

    return <box />
  }

  const bootstrap = await testRender(() => <Harness />, { width: 50, height: 40 })
  let app: Awaited<ReturnType<typeof testRender>> | undefined
  let sidebar: Awaited<ReturnType<typeof testRender>> | undefined
  let footer: Awaited<ReturnType<typeof testRender>> | undefined

  try {
    await bootstrap.renderOnce()
    const cleanup = await plugin.setup(context)

    expect(plugin.id).toBe('opencode-navigator')
    expect(typeof plugin.tui).toBe('function')
    expect(typeof cleanup).toBe('function')

    if (!cleanup) throw new Error('OpenCode 2 setup did not return cleanup')

    expect(claims.map((claim) => claim.append ?? claim.replace)).toEqual(['app', 'sidebar.content', 'sidebar.footer'])

    const appClaim = claims.find((claim) => claim.append === 'app')!

    app = await testRender(() => appClaim.render({ sessionID: session.id }), { width: 50, height: 40 })
    await app.flush()
    dialogShows = 0
    bootstrap.renderer.stdin.emit('data', Buffer.from('\u{1B}[44;5u'))
    await app.renderOnce()
    expect(dialogShows).toBe(1)

    const sidebarClaim = claims.find((claim) => claim.replace === 'sidebar.content')!

    sidebar = await testRender(() => sidebarClaim.render({ sessionID: session.id }), { width: 50, height: 40 })
    await sidebar.flush()
    await Bun.sleep(20)
    await sidebar.flush()

    const frame = sidebar.captureCharFrame()

    expect(frame).not.toContain('OpenCode 2 session')
    expect(frame).toContain('TODO')
    expect(frame).toContain('OpenCode 2 does not expose Todo data')
    expect(frame).toContain('SUBAGENTS')
    expect(frame).toContain('SKILLS')
    expect(frame).toContain('QUICK ACTIONS')
    expect(frame).toContain('MCP')
    expect(frame).not.toContain('LSP')
    expect(rendererSubscriptions).toEqual(['focused_renderable'])

    const footerClaim = claims.find((claim) => claim.append === 'sidebar.footer')!

    footer = await testRender(() => footerClaim.render({ sessionID: session.id }), { width: 38, height: 4 })
    await footer.renderOnce()
    const footerFrame = footer.captureCharFrame()

    expect(footerFrame).toMatch(/OpenCode \d+\.\d+\.\d+ \| Navigator \d+\.\d+\.\d+/)
    expect(footerFrame).toContain('\u{EAF8}')

    await cleanup()
    expect(slotCleanups).toEqual(['sidebar.footer', 'sidebar.content', 'app'])
  } finally {
    globalThis.fetch = originalFetch
    footer?.renderer.destroy()
    sidebar?.renderer.destroy()
    app?.renderer.destroy()
    bootstrap.renderer.destroy()
  }
})

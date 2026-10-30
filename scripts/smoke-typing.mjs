import { createOpencode } from '@opencode-ai/sdk/v2'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const original = { ...process.env }
const majors = original.NAVIGATOR_TYPING_MAJOR ? [Number(original.NAVIGATOR_TYPING_MAJOR)] : [1, 2]

for (const major of majors) {
  const temporary = await mkdtemp(join(tmpdir(), `navigator-typing-${major}-`))

  for (const name of [
    'home',
    'cache',
    'config/opencode',
    'data',
    'state/opencode/opencode-pretty-sidebar',
    'workspace',
    'plugin',
  ])
    await mkdir(join(temporary, name), { recursive: true })
  const env = {
    ...original,
    HOME: join(temporary, 'home'),
    XDG_CACHE_HOME: join(temporary, 'cache'),
    XDG_CONFIG_HOME: join(temporary, 'config'),
    XDG_DATA_HOME: join(temporary, 'data'),
    XDG_STATE_HOME: join(temporary, 'state'),
    OPENCODE_CONFIG_DIR: join(temporary, 'config/opencode'),
    OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
    OPENCODE_DISABLE_EXTERNAL_SKILLS: 'true',
    OPENCODE_DISABLE_CLAUDE_CODE_SKILLS: 'true',
    OPENCODE_DISABLE_AUTOUPDATE: 'true',
    OPENCODE_DISABLE_LSP_DOWNLOAD: 'true',
    OPENCODE_DISABLE_MODELS_FETCH: 'true',
    OPENCODE_DISABLE_TERMINAL_TITLE: 'true',
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    NAVIGATOR_TYPING_ENTRY: pathToFileURL(join(root, 'dist/tui.js')).href,
    NAVIGATOR_TYPING_REPORT: join(temporary, 'frames.json'),
    NAVIGATOR_TYPING_TRANSCRIPT: join(temporary, 'pty.log'),
    NAVIGATOR_TYPING_WORKSPACE: join(temporary, 'workspace'),
  }

  for (const key of [
    'OPENCODE_CONFIG',
    'OPENCODE_CONFIG_CONTENT',
    'OPENCODE_CLI_CONFIG',
    'OPENCODE_CLI_CONFIG_CONTENT',
    'OPENCODE_TUI_CONFIG',
    'OPENCODE_TUI_CONFIG_CONTENT',
  ])
    delete env[key]
  const binary = major === 1 ? original.OPENCODE_SMOKE_BIN : original.OPENCODE_V2_SMOKE_BIN

  if (!binary) throw new Error('Both isolated smoke binaries must be selected explicitly')

  env.NAVIGATOR_TYPING_BIN = resolve(binary)
  env.NAVIGATOR_TYPING_MAJOR = String(major)
  env.PATH = `${dirname(resolve(binary))}:${original.PATH}`
  const sections = {
    limits: false,
    todo: false,
    subagents: false,
    skills: false,
    quick_actions: true,
    lsp: false,
    mcp: false,
  }

  await writeFile(
    join(temporary, 'state/opencode/opencode-pretty-sidebar/preferences.json'),
    JSON.stringify({
      version: 1,
      global: { layout: { sections, expanded: sections } },
      worktrees: {},
      user: { onboardingCompleted: true },
    }),
  )
  const fixture = pathToFileURL(join(root, `test/fixtures/typing-host-v${major}.mjs`)).href

  await writeFile(
    join(temporary, 'plugin/package.json'),
    JSON.stringify({ name: 'navigator-typing-fixture', type: 'module', exports: { './tui': './tui.mjs' } }),
  )
  await writeFile(join(temporary, 'plugin/tui.mjs'), `export { default } from ${JSON.stringify(fixture)}\n`)

  if (major === 1) {
    env.OPENCODE_TUI_CONFIG = join(temporary, 'tui.json')
    await writeFile(
      env.OPENCODE_TUI_CONFIG,
      JSON.stringify({
        plugin: [[fixture, { persist_mcp: false }]],
        plugin_enabled: {
          'internal:sidebar-context': false,
          'internal:sidebar-mcp': false,
          'internal:sidebar-todo': false,
          'internal:sidebar-lsp': false,
        },
      }),
    )
    for (const key of [
      'OPENCODE_CONFIG',
      'OPENCODE_CONFIG_CONTENT',
      'OPENCODE_CLI_CONFIG',
      'OPENCODE_CLI_CONFIG_CONTENT',
      'OPENCODE_TUI_CONFIG_CONTENT',
    ])
      delete process.env[key]
    Object.assign(process.env, env)
    const { client, server } = await createOpencode({ port: 0, timeout: 15_000 })

    try {
      const result = await client.session.create({
        directory: env.NAVIGATOR_TYPING_WORKSPACE,
        title: 'Synthetic typing probe',
      })

      env.NAVIGATOR_TYPING_SESSION = result.data.id
    } finally {
      server.close()
    }
  } else {
    env.OPENCODE_CLI_CONFIG_CONTENT = JSON.stringify({
      plugins: [{ package: join(temporary, 'plugin'), options: { persist_mcp: false } }],
      animations: false,
      session: { sidebar: 'auto' },
    })
    const result = spawnSync(
      binary,
      [
        'api',
        '--standalone',
        'session.create',
        '--data',
        JSON.stringify({ title: 'Synthetic typing probe', location: { directory: env.NAVIGATOR_TYPING_WORKSPACE } }),
      ],
      { env, encoding: 'utf8' },
    )

    if (result.status !== 0) throw new Error(result.stderr)

    const session = JSON.parse(result.stdout)

    env.NAVIGATOR_TYPING_SESSION = session.id ?? session.data?.id
  }

  const result = spawnSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- Use the installed expect tool with an isolated host environment.
    'expect',
    [
      '-c',
      String.raw`
    log_user 0
    log_file -a -noappend $env(NAVIGATOR_TYPING_TRANSCRIPT)
    set timeout 30
    set stty_init "rows 40 columns 120"
    set extra {}
    if {$env(NAVIGATOR_TYPING_MAJOR) == 2} { lappend extra --standalone }
    spawn -noecho $env(NAVIGATOR_TYPING_BIN) $env(NAVIGATOR_TYPING_WORKSPACE) {*}$extra --session $env(NAVIGATOR_TYPING_SESSION)
    after 200
    set esc [format %c 27]
    set bell [format %c 7]
    send -- [format {%s]10;rgb:ffff/ffff/ffff%s%s]11;rgb:0000/0000/0000%s} $esc $bell $esc $bell]
    send -- "\033P>|xterm(370)\033\\"
    send -- "\033P1+r4d73=31\033\\"
    send -- "\033\[?1016;2\044y\033\[?2027;2\044y\033\[?2031;2\044y"
    send -- "\033\[?1004;2\044y\033\[?2004;2\044y\033\[?2026;2\044y"
    send -- "\033\[?0u\033\[?1;2c\033\[4;800;1200t\033\[1;3R\033\[1;3R"
    send -- "\033]99;i=opentui-notifications:p=0;\007"
    send -- "\033]1337;Capabilities=\007"
    send -- "\033\[I"
    expect {
      -re {Rename} {}
      timeout { puts stderr "Sidebar did not mount"; exit 1 }
      eof { puts stderr "Host exited before sidebar mounted"; exit 1 }
    }
    after 1000
    send -- [format {%s[<0;5;34M%s[<0;5;34m} $esc $esc]
    after 200
    foreach character {t y p i n g a b c d} {
      send -- $character
      for {set tick 0} {$tick < 12} {incr tick} {
        set timeout 0
        expect {
          -re {.+} {}
          timeout {}
        }
        after 10
      }
    }
    after 800
    send -- [format %c 3]
    after 200
    send -- [format %c 3]
    expect {
      eof {}
      timeout { close }
    }
  `,
    ],
    { env, encoding: 'utf8', timeout: 50_000 },
  )

  if (result.status !== 0) throw new Error(`Host ${major}: ${result.stderr}; artifacts ${temporary}`)

  const report = JSON.parse(await readFile(env.NAVIGATOR_TYPING_REPORT, 'utf8'))

  console.log(
    JSON.stringify({
      host: major,
      keys: report.keys,
      input: report.input,
      frames: report.frames,
      replacements: report.replacements,
      artifacts: temporary,
    }),
  )

  if (report.input !== 'typingabcd') throw new Error('Probe did not type into the real main prompt')

  if (report.keys < 6 || report.frames < 1) throw new Error('Typing probe did not observe actual input frames')

  if (report.replacements > 0) process.exitCode = 1
}

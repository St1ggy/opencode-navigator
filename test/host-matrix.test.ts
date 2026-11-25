import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

test('required TUI and packaged Desktop checks execute both compatibility endpoints', async () => {
  const workflow = Bun.YAML.parse(await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')) as {
    jobs: Record<string, { steps: { run?: string }[] }>
  }

  for (const [job, command, line] of [
    ['opencode-smoke-v1', 'bash scripts/smoke-opencode.sh', 'v1'],
    ['opencode-smoke-v2', 'bash scripts/smoke-opencode-v2.sh', 'v2'],
    ['desktop-smoke', 'node scripts/smoke-opencode-gui.mjs', 'v2'],
  ]) {
    const commands = workflow.jobs[job].steps.map((step) => step.run).join('\n')

    expect(commands).toContain(`NAVIGATOR_HOST_ENDPOINT=minimum ${command}`)
    expect(commands).toContain(`latest=$(node scripts/published-host.mjs ${line})`)
    expect(commands).toContain('NAVIGATOR_HOST_ENDPOINT=latest NAVIGATOR_HOST_VERSION="$latest"')
    expect(commands.split(command)).toHaveLength(3)
  }
})

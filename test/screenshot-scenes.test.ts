import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

test('every screenshot scene has an output filename and a registered container capture fixture', async () => {
  const [manifest, capture] = await Promise.all([
    readFile(new URL('../scripts/capture-screenshots.sh', import.meta.url), 'utf8'),
    readFile(new URL('../screenshots/harness/capture.sh', import.meta.url), 'utf8'),
  ])
  const scenes = /\nscenes=\(([^)]+)\)/.exec(manifest)![1].split(/\s+/)
  const aliases = new Map(
    [...manifest.matchAll(/^ {4}([a-z-]+)\) fixture_scene=([a-z-]+);/gm)].map((match) => [match[1], match[2]]),
  )
  const cases = /case "\$scene" in([\s\S]*?)\nesac/.exec(capture)![1]
  const supported = new Set(
    cases.split('\n').flatMap((line) => {
      if (!line.includes(')')) return []

      return line
        .split(')', 1)[0]
        .split('|')
        .map((name) => name.trim())
    }),
  )

  expect(scenes.length).toBeGreaterThan(10)
  expect(new Set(scenes).size).toBe(scenes.length)
  for (const scene of scenes) {
    expect(manifest).toContain(String.raw`${scene}) printf '%s\n'`)
    expect(supported.has(aliases.get(scene) ?? scene)).toBe(true)
  }
})

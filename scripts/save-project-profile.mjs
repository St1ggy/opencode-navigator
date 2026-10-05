#!/usr/bin/env node
// This entrypoint is built before packaging; resolve it at runtime from the published dist directory.
const modulePath = '../dist/project-profile.js'
const { previewProjectProfile, saveProjectProfile } = await import(modulePath)

const [command, name, ...flags] = process.argv.slice(2)

if (command !== 'save' || !name || flags.some((flag) => flag !== '--apply' && flag !== '--replace')) {
  console.error('Usage: opencode-navigator-profile save <name> [--apply] [--replace] < portable-settings.json')
  process.exitCode = 1
} else if (process.stdin.isTTY) {
  console.error('Paste the JSON exported by Navigator through standard input.')
  process.exitCode = 1
} else {
  try {
    let source = ''

    for await (const chunk of process.stdin) {
      source += chunk.toString()

      if (source.length > 1_000_000) throw new Error('Portable settings exceed 1 MB')
    }
    const preview = await previewProjectProfile(process.cwd(), name, source, flags.includes('--replace'))

    console.log(`Project profile: ${preview.name}`)
    console.log(`Target: ${preview.file}`)
    console.log(
      `Layout: ${Object.keys(preview.layout.sections).length} sections, ${Object.keys(preview.layout.expanded).length} expansions`,
    )
    console.log(`MCP: ${Object.keys(preview.mcp ?? {}).length} server states`)
    for (const path of preview.skipped) console.log(`Skipped unsupported field: ${path}`)

    if (flags.includes('--apply')) {
      await saveProjectProfile(preview, process.cwd())
      console.log('Saved. Restart OpenCode to load the project profile, then preview it from Settings → Presets.')
    } else console.log('Preview only. Repeat with --apply to save this profile.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

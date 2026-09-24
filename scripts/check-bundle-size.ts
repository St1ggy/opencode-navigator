const bundle = Bun.file(new URL('../dist/tui.js', import.meta.url))

if (!(await bundle.exists())) {
  console.error('dist/tui.js is missing; run the build before checking bundle size')
  process.exit(1)
}

// Includes onboarding, preset previews, persistent tabs and shortcut mode; the TUI bundle stays unminified.
const MAX_BUNDLE_BYTES = 360_000
const size = bundle.size

console.log(`dist/tui.js: ${size.toLocaleString('en-US')} bytes (budget: ${MAX_BUNDLE_BYTES.toLocaleString('en-US')})`)

if (size > MAX_BUNDLE_BYTES) {
  console.error(`Bundle exceeds the ${MAX_BUNDLE_BYTES.toLocaleString('en-US')}-byte budget`)
  process.exit(1)
}

# Development Team: Start Here

This file is the handoff for active development. The roadmap is directional, not
a release commitment; scope and ordering should respond to user feedback and
public OpenCode TUI API capabilities.

## Current Release

- Package: `opencode-pretty-sidebar`
- Release version: `0.5.0`
- Release tag: `v0.5.0`
- GitHub: <https://github.com/St1ggy/opencode-pretty-sidebar>
- npm: <https://www.npmjs.com/package/opencode-pretty-sidebar>
- Supported OpenCode version: `1.18.30` or newer

## Recently Completed

- Split the plugin into focused controllers, components, dialogs, icons,
  persistence, and keyboard interaction modules behind the `src/tui.tsx` facade.
- Added unified preference storage, exact-scope MCP state, atomic writes,
  locking, reset controls, and runtime settings updates.
- Added sidebar focus, arrow and `j`/`k` navigation, activation, focus return,
  direct section palette commands, visible focus, scrolling, and keyboard help.
- Added consistent request state, stale-response guards, cached-data errors,
  retries, reconnect backoff, and lifecycle cancellation.
- Added built-plugin smoke coverage, an advisory OpenCode 1.18.30 PTY smoke,
  large-list performance budgets, Oxlint, Prettier, and bundle-size checks.

## Relevant Files

- `src/tui.tsx`: plugin composition and public export facade.
- `src/controllers/`: Todo, Subagents, Skills, MCP, preferences, and request state.
- `src/components/`: sidebar composition, shared interaction primitives, and sections.
- `src/dialogs/`: setup, settings, skill confirmation, and keyboard help.
- `src/sidebar-interaction.ts`: focus ownership, navigation, filters, and commands.
- `src/preferences-schema.ts`: unversioned schema, parsers, scope keys, and precedence model.
- `src/preferences-store.ts`: durable storage, locking, and atomic writes.
- `test/preferences-controller.test.ts`: controller persistence and reset coverage.
- `test/sidebar-keyboard.test.tsx`: real renderer keyboard and focus coverage.
- `test/plugin-smoke.test.tsx`: complete built-plugin slot and disposal smoke.
- `test/section-performance.test.tsx`: 500-row renderer budgets.
- `scripts/smoke-opencode.sh`: isolated packaged-plugin PTY smoke.
- `ARTICLE.md`: article draft for Atushka.
- `screenshots/`: article screenshots and roadmap artwork.

`ARTICLE.md`, `ROADMAP.md`, and `screenshots/` are committed project artifacts.

## Behavioral Requirements

- Section visibility and expansion remain in-memory for the current OpenCode
  process until the user selects `Save current layout as default`.
- Behavior settings persist immediately.
- `Restore configured layout` removes the saved layout override.
- `Restore configured behavior` removes shortcut, MCP memory, and icon style
  overrides.
- Invalid shortcut syntax must not replace the active shortcut.
- Changing either shortcut must unregister the previous base keymap layer.
- Enabling remembered MCP state must reapply saved enabled and disabled server
  states for the active worktree.
- Disabling remembered MCP state must stop both writing and reapplying those states.
- LSP icon style changes must update the mounted sidebar without restart.
- Group headings are not keyboard-selectable.
- Every interactive settings row remains usable with keyboard and mouse.
- Sidebar navigation uses arrows or `j`/`k`, `Enter`, `Escape`, and `?` after
  focus moves into the sidebar.

## Remaining Foundation Follow-ups

See [`ROADMAP.md`](ROADMAP.md) for status, later product ideas, and API-dependent
constraints. The remaining partial foundation work is:

- Unify loading, empty, and pending presentation behind a formal section contract.
- Add explicit global/worktree selection and inherited precedence for layout and
  behavior; project-local profiles remain deferred.
- Cancel old-target mutations eagerly when supported instead of relying only on
  immutable target isolation and lifecycle disposal.
- Harden the advisory PTY smoke before making it a blocking CI job.

## Verification

Run from the repository root:

```sh
bun run check
bun run test:e2e
git diff --check
npm pack --dry-run --ignore-scripts --json
```

For UI verification, load `src/tui.tsx` through `.opencode/tui.json`, restart
OpenCode, and check both keyboard and mouse interaction in Ghostty at the article
screenshot dimensions.

## Article And Screenshots

- Article draft: `ARTICLE.md`
- Main sidebar: `screenshots/01-hero-sidebar.png`
- Built-in sidebar comparison: `screenshots/02-default-sidebar-before.png`
- Grouped settings: `screenshots/03-layout-settings.png`
- Skills search: `screenshots/04-skills-search.png`
- MCP search: `screenshots/05-mcp-search.png`
- Setup guide: `screenshots/06-setup-guide.png`
- Live subagent: `screenshots/07-live-subagent.png`
- Roadmap artwork: `screenshots/roadmap/opencode-pretty-sidebar-roadmap.png`

The roadmap image is illustrative. The article must state that it is not a fixed
release schedule and will change based on feedback.

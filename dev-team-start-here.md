# Development Team: Start Here

This file is the handoff for active development and the approximate product roadmap.
The roadmap is directional, not a release commitment. Scope and ordering should
change in response to user feedback and public OpenCode TUI API capabilities.

## Current Release

- Package: `opencode-pretty-sidebar`
- Released version: `0.4.9`
- Release tag: `v0.4.9`
- GitHub: <https://github.com/St1ggy/opencode-pretty-sidebar>
- npm: <https://www.npmjs.com/package/opencode-pretty-sidebar>
- Supported OpenCode version: `1.18.30` or newer

## Active Work

Expose every current plugin option in the in-app settings dialog instead of
requiring users to edit `tui.json` for routine changes.

Settings are grouped into three sections:

- `Sections`: Todo, Subagents, Skills, Quick actions, LSP, and MCP visibility.
- `Behavior`: remembered MCP state, LSP icon style, and sidebar shortcut.
- `Defaults & help`: save or restore layout, restore configured behavior, reset
  skill confirmations, and open the setup guide.

Runtime changes should apply immediately. Values configured in `tui.json` remain
the defaults; in-app changes are durable overrides. `Restore configured behavior`
must remove those overrides so future configuration changes are visible again.

## Implementation Status

- [x] Extend the preferences model with `toggleKey`, `persistMcp`, and
  `lspIconStyle` overrides.
- [x] Add a real layout reset that removes the saved layout override.
- [x] Draft grouped settings UI for `Sections`, `Behavior`, and `Defaults & help`.
- [x] Draft runtime shortcut editing with `DialogPrompt` and OpenCode key parsing.
- [x] Draft reactive MCP persistence and LSP icon style wiring.
- [x] Run the built-artifact tests and fix all failures caused by changed component
  props and option indexes.
- [x] Add durable preference tests for save, restart, pre-hydration changes, and
  restore-to-configured behavior.
- [x] Add a keymap test that verifies the old shortcut is unregistered when the
  shortcut changes.
- [x] Add MCP tests for turning remembered state off and back on at runtime.
- [x] Verify the grouped dialog fits at the target Ghostty dimensions without
  clipping and that keyboard navigation skips group headings.
- [x] Bound the settings list to the terminal height, add vertical scrolling,
  and keep the selected row visible during keyboard navigation.
- [x] Update `README.md` with in-app settings behavior and configuration precedence.
- [x] Update `ARTICLE.md` so `persist_mcp`, LSP style, and shortcut are described as
  in-app settings rather than configuration-only options.
- [x] Recapture the article screenshots in Ghostty, including settings and setup.
- [x] Run `bun run check`, `git diff --check`, and `npm pack --dry-run --json`.

The final built-artifact suite passes 36 tests with 152 assertions, type checking
passes, and the npm dry-run archive contains only `LICENSE`, `README.md`,
`dist/tui.js`, and `package.json`.

## Relevant Files

- `src/tui.tsx`: preferences controller, grouped settings dialog, runtime keymap,
  reactive MCP persistence, and reactive LSP icon style.
- `src/preferences-store.ts`: durable plugin setting overrides and reset behavior.
- `test/preferences-controller.test.ts`: controller persistence and reset coverage.
- `test/mcp-controller.test.ts`: runtime MCP persistence coverage.
- `test/section-interaction.test.tsx`: grouped settings and runtime interaction
  coverage.
- `test/preferences-store.test.ts`: durable setting persistence coverage.
- `ARTICLE.md`: article draft for Atushka.
- `screenshots/`: article screenshots and roadmap artwork.

`ARTICLE.md`, `ROADMAP.md`, and `screenshots/` are committed project artifacts.

## Behavioral Requirements

- Section visibility and expansion remain session-local until the user selects
  `Save current layout as default`.
- Behavior settings persist immediately.
- `Restore configured layout` removes the saved layout override.
- `Restore configured behavior` removes shortcut, MCP memory, and icon style
  overrides.
- Invalid shortcut syntax must not replace the active shortcut.
- Changing the shortcut must unregister the previous base keymap layer.
- Enabling remembered MCP state must reapply saved enabled and disabled server
  states for the active worktree.
- Disabling remembered MCP state must stop both writing and reapplying those states.
- LSP icon style changes must update the mounted sidebar without restart.
- Group headings are not keyboard-selectable.
- Every interactive settings row remains usable with keyboard and mouse.

## Approximate Roadmap

The full working list also exists in `ROADMAP.md`. The order below is a planning
aid and should be rearranged when feedback identifies more valuable work.

### Presets And Layout

- Built-in `Minimal`, `Coding`, `Agents`, and `Full` layout presets.
- Named custom layout and MCP presets.
- Configurable section order, row density, and visible-row limits.
- Global and worktree defaults with a preview before applying changes.

### Keyboard Navigation

- Focus the sidebar without using the mouse.
- Navigate sections and rows with arrows or `j` and `k`.
- Add direct shortcuts for Todo, Subagents, Skills, LSP, and MCP.
- Keep focused rows visible and add a compact keyboard help dialog.

### Section Improvements

- Todo filters, grouping, progress counts, and completed-item visibility.
- Subagent runtime, retry countdown, recent completions, and failure attention.
- Pinned and recently used Skills with fuzzy matching and source details.
- Configurable Quick actions and custom registered commands.
- Better LSP and MCP sorting, error details, retries, and bulk actions.

### Agents And Limits

- Show the active OpenCode agent, model, and provider.
- Add independent adapters for supported provider quota APIs.
- Detect supported Claude Code, Codex CLI, and Gemini CLI installations.
- Preserve provider-native limit windows and always show data freshness.
- Never read undocumented credential files or store provider credentials.

### Unified Search

- Search Skills, Subagents, MCP, and actions from one entry point.
- Add fuzzy matching, grouped results, recent selections, and keyboard-first use.

### Profiles And Portability

- Import and export settings as versioned JSON.
- Support project-local profiles that can be committed with a repository.
- Document precedence across plugin options, global settings, worktree settings,
  and project settings.

### Stable 1.0

- Split `src/tui.tsx` into focused controllers, components, dialogs, and icons.
- Add actionable errors, stale-request protection, and bounded retries.
- Add end-to-end, accessibility, large-list performance, and bundle-size checks.
- Maintain screenshots, changelog entries, and generated release notes.

## API-Dependent Candidates

Do not simulate these features when OpenCode has no supported public API:

- Editing Todo status or priority.
- Restarting LSP servers or exposing diagnostic counters.
- Switching agents or models without a public TUI command.
- Showing session token, context-window, cost, or provider quota data from
  undocumented sources.
- Preventing MCP servers remembered as disabled from connecting before TUI plugins
  initialize.

## Verification

Run from the repository root:

```sh
bun run check
git diff --check
npm pack --dry-run --json
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

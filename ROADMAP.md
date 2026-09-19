# Roadmap

This roadmap focuses on making the sidebar reliable, configurable, keyboard-friendly,
and useful as a compact control center for an OpenCode session.

## Status Legend

- `[x]` Completed in the current implementation.
- `[~]` Partially implemented or covered only for some sections and flows.
- `[ ]` Planned.

## Product Principles

- Keep important session state visible without turning the sidebar into a dashboard.
- Make every interactive feature usable with both keyboard and mouse.
- Prefer progressive disclosure: compact summaries first, details on demand.
- Preserve useful defaults while supporting global and worktree-specific preferences.
- Treat unavailable OpenCode APIs as explicit constraints rather than simulating unsupported actions.

## P0: Foundation

Stabilize the architecture, persistence, request lifecycle, interaction model, and
verification workflow before expanding the product surface.

### Architecture

- [x] Separate stateful logic from rendering; Todo, Subagents, Skills, MCP, preferences, and sidebar interaction live outside the section components.
- [x] Keep `src/tui.tsx` as a composition and export facade, with controllers, components, dialogs, and icons in focused modules.
- [x] Keep Solid and OpenTUI packages external so the plugin shares OpenCode's reactive runtime.
- [x] Share request-state, loading/empty/error/pending presentation, retry, focus, disabled, and activation primitives across asynchronous sections.

### Unified Persistence

- [x] Store layout, behavior, MCP, onboarding, and skill-confirmation state in one validated, atomic, concurrency-safe preferences file.
- [x] Remember desired enabled and disabled MCP state by exact worktree, directory, or global location key.
- [x] Use one preferences document and shared value types for global and exact-worktree layout, behavior, and MCP overrides.
- [x] Provide explicit global/worktree scope selection, inherited precedence, and per-scope layout, behavior, and MCP reset controls.
- [x] Keep commit-safe project-local profiles and project persistence scope deferred to the portability phase.

### Request And Error Reliability

- [x] Prevent stale Todo refreshes and failures from overwriting newer events or current-target state.
- [x] Preserve Subagent events that arrive during an in-flight refresh.
- [x] Scope Skills and MCP snapshots by directory/workspace and ignore superseded MCP activation work.
- [x] Surface Todo, Subagent, Skills, and MCP refresh failures with inline retries, plus mutation and persistence failures.
- [x] Isolate refresh state and responses by immutable target, eagerly invalidate reads and mutations on context changes, and abort all work on disposal.
- [x] Add explicit section and MCP mutation retries plus bounded reconnect backoff.

### Toolchain

- [x] Build the distributable before tests and keep Solid/OpenTUI out of the bundle.
- [x] Run built-artifact tests and TypeScript checks through `bun run check` and CI.
- [x] Limit the published package to the license, README, bundle, package metadata, and corner font with its installer.
- [x] Run TypeScript, ESLint with the shared Solid preset, and Prettier checks through `bun run check`.
- [x] Enforce a 320,000-byte raw bundle budget through `bun run check` and CI.

### Keyboard Navigation

- [x] Provide a configurable sidebar toggle key and unregister the previous binding when it changes.
- [x] Support keyboard navigation in setup, settings, and filters, including scrolling the selected settings row into view.
- [x] Add a sidebar focus command and configurable keybinding.
- [x] Navigate interactive sections and rows with arrow keys or `j` and `k`, activate with `Enter`, and return focus with `Escape`.
- [x] Add direct section palette commands, visible focus states, focused-row scrolling, and compact keyboard help.

### Smoke Coverage

- [x] Cover controllers and durable preference behavior with automated tests.
- [x] Render the built bundle with OpenTUI's test renderer and exercise slot mounting plus representative mouse, filter, settings, wizard, retry, and keybinding flows.
- [x] Add an advisory end-to-end PTY smoke test that loads the packaged plugin in OpenCode 1.18.30.
- [x] Cover keyboard focus/navigation and a shared Nerd Font/text fallback mode across sections, search, Quick Actions, and dialogs.
- [x] Enforce renderer performance budgets for 500-row Todo, Skills, Subagents, and MCP lists.

## Product Direction

### Presets And Layout

- [x] Start with an empty preset list and allow named layout presets to be saved, applied, updated, renamed, and deleted.
- [ ] Preview layout presets before applying them.
- [~] Configurable section ordering and per-section item limits with Show all / Show less exist; row density remains planned.
- [x] Save layout defaults globally or for the current worktree using the unified persistence model.
- [~] Named MCP state presets support save, apply, update, rename, delete, per-server progress, and partial-failure retry; change previews remain planned.
- [x] Add `Connect all` and `Disconnect all` with per-server progress, partial-failure reporting, and failed-only retry.
- [ ] Optionally link one layout preset and one MCP preset as a workspace profile.

### Section Improvements

- [x] Todo: All / Active / Finished filters, status grouping, separate cancelled tasks, and status counts.
- [x] Subagents: observed runtime, retry countdown, in-memory recent runs, failure attention, text/status filters, and parent-session navigation.
- [~] Skills: user-wide favorites, recent items, and source details exist; fuzzy keyboard selection and trusted-skill confirmation settings remain planned.
- [~] Quick Actions: scoped ordering and visibility exist; recent actions, additional registered commands, and route-aware disabled reasons remain planned.
- [~] LSP: icons/text badges, error-first sorting, and live ID/root/status details exist; diagnostic-specific actions depend on public API support.
- [~] MCP: filtering, pending rows, error text, individual/bulk connect/disconnect, retry, and user-wide favorites exist; custom grouping remains planned.

### Agents And Limits

- Use OpenCode's existing agent/model display above the prompt; omit a duplicate sidebar overview.
- [ ] Define independent adapters for OpenCode, stable provider quota APIs, and machine-readable external agent CLIs.
- [ ] Preserve provider-native units and reset windows while showing freshness, unsupported, authentication, stale, and rate-limited states.
- [ ] Never read undocumented credential files or store provider credentials in sidebar preferences or logs.

### Unified Search

- [x] Search Skills, Subagents, MCP servers, and Quick Actions in a tabbed Search Everything modal with a configurable shortcut and consistent section icons.
- [~] Fuzzy matching, category tabs, keyboard/mouse activation, and cached-source retries exist; dedicated search history and configurable result providers remain planned.

### Profiles And Portability

- [ ] Import and export layout and MCP settings as versioned JSON with validation and unsupported-field previews.
- [ ] Add commit-safe project-local profiles after global/worktree persistence is stable.
- [~] Current configured-default, global, worktree, and session precedence is documented; project-local profiles remain deferred.

### Release Polish

- [ ] Maintain current screenshots or a short demo in the README.
- [ ] Publish a changelog and generated release notes for each version.

## API-Dependent Candidates

Schedule these only after the required capability is available through a supported
public OpenCode TUI or stable authenticated provider API:

- Editing Todo status or priority.
- Restarting LSP servers or exposing diagnostic counters.
- Switching agents or models when no public TUI command is available.
- Showing session or subagent token, context-window, and cost summaries.
- Reading provider quota data without a stable authenticated API.
- Showing recently changed files or workspace diagnostics.
- Preventing MCP servers remembered as disabled from connecting before TUI plugins initialize.

## Suggested Delivery Order

1. Maintain the completed P0 architecture, persistence, reliability, keyboard, and smoke-test foundation.
2. Add layout and MCP presets on the unified global/worktree preference model.
3. Improve existing sections using the shared request and interaction contracts.
4. Add stable provider and CLI adapters for supported quota information.
5. Build unified search after section keyboard behavior is consistent.
6. Add portable project-local profiles after the settings schema has settled.
7. Finish performance, accessibility, bundle, and release polish for 1.0.

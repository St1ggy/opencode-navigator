# Roadmap

This roadmap focuses on making the sidebar configurable, keyboard-friendly, and
useful as a compact control center for an OpenCode session.

## Product Principles

- Keep important session state visible without turning the sidebar into a dashboard.
- Make every interactive feature usable with both keyboard and mouse.
- Prefer progressive disclosure: compact summaries first, details on demand.
- Preserve useful defaults while allowing per-project customization.
- Treat unavailable OpenCode APIs as explicit constraints rather than simulating unsupported actions.

## 0.5: Presets and Layout

Make it possible to switch between task-focused layouts without configuring every
section manually.

### Layout Presets

- [ ] Add built-in presets:
  - `Minimal`: Todo only.
  - `Coding`: Todo, Skills, Quick actions, and LSP.
  - `Agents`: Todo, Subagents, Skills, and agent limits.
  - `Full`: every available section.
- [ ] Add a preset picker to the settings dialog and first-run wizard.
- [ ] Preview a preset before applying it.
- [ ] Allow the current layout to be saved as a named custom preset.
- [ ] Support renaming and deleting custom presets.
- [ ] Save a default preset globally or for the current worktree.
- [ ] Add configurable section ordering.
- [ ] Add `comfortable` and `compact` row density options.
- [ ] Add per-section limits for visible rows before scrolling.
- [ ] Preserve preset compatibility when new sidebar sections are introduced.

### MCP State Presets

- [ ] Save the current desired enabled and disabled MCP server set as a named preset.
- [ ] Add quick actions for `Connect all`, `Disconnect all`, and restoring the last saved state.
- [ ] Preview which servers will be enabled and disabled before applying a preset.
- [ ] Show per-server progress while a preset is being applied.
- [ ] Report partial failures and allow failed operations to be retried.
- [ ] Save a default MCP preset globally or for the current worktree.
- [ ] Define how a preset handles missing servers and servers added after the preset was created.
- [ ] Allow an MCP preset to be linked to a layout preset as a workspace profile.
- [ ] Support renaming, duplicating, and deleting custom MCP presets.
- [ ] Add an MCP preset switcher directly to the MCP section.

## 0.6: Keyboard Navigation

Make the sidebar fully usable without switching to the mouse.

- [ ] Add a sidebar focus command and configurable keybinding.
- [ ] Navigate sections and rows with arrow keys or `j` and `k`.
- [ ] Expand sections and activate rows with `Enter`.
- [ ] Close filters and return focus to the session with `Escape`.
- [ ] Add shortcuts for opening Todo, Subagents, Skills, LSP, and MCP directly.
- [ ] Keep focused rows visible while scrolling long sections.
- [ ] Show a compact keyboard help dialog.
- [ ] Add consistent focus, hover, disabled, and pending states to interactive rows.

## 0.7: Section Improvements

### Todo

- [ ] Filter tasks by status and priority.
- [ ] Add `Hide completed` and `Active only` display modes.
- [ ] Group tasks by status or priority.
- [ ] Show separate completed, active, pending, and cancelled counts.
- [ ] Keep Todo read-only until OpenCode exposes a supported mutation API.

### Subagents

- [ ] Show agent runtime and retry countdown.
- [ ] Show the agent or model when that information is available.
- [ ] Keep recently completed subagents visible for a configurable short period.
- [ ] Add status filters for running, retrying, completed, and failed agents.
- [ ] Add an attention indicator when an agent fails or requires input.
- [ ] Add a quick action to return from a child session to its parent.

### Skills

- [ ] Add pinned and recently used skills.
- [ ] Group skills by source or location.
- [ ] Show the skill description and source path in an inline details view.
- [ ] Add a setting to run trusted skills without confirmation.
- [ ] Add keyboard selection and fuzzy matching to the skill filter.

### Quick Actions

- [ ] Allow built-in actions to be reordered or hidden.
- [ ] Allow registered OpenCode commands to be added as custom quick actions.
- [ ] Add recently used actions.
- [ ] Disable actions that are unavailable for the current route and explain why.

### LSP

- [ ] Sort servers by connection state and language.
- [ ] Show full server details in an expandable row.
- [ ] Add a text-only icon fallback that does not require Nerd Fonts.
- [ ] Surface connection errors and provide a retry action when supported.

### MCP

- [ ] Sort and group servers by connected, pending, disabled, and failed state.
- [ ] Show connection errors in an expandable details row.
- [ ] Add retry, connect all, and disconnect all actions.
- [ ] Allow MCP servers to be pinned above the rest of the list.
- [ ] Make remembered MCP state configurable globally or per worktree.
- [ ] Show pending state while a connect or disconnect operation is running.

## 0.8: Agents and Usage Limits

Provide one place to see which agent and model are active and how much provider
capacity remains.

### Shared Integration Model

- [ ] Define an adapter contract for OpenCode, provider APIs, and external agent CLIs.
- [ ] Normalize agent identity, model, provider, availability, limits, reset windows, and data freshness.
- [ ] Keep source-specific limit windows instead of reducing incompatible quotas to one percentage.
- [ ] Isolate adapter failures so one unavailable source does not break the section.
- [ ] Add capability detection for agent listing, model listing, switching, usage, and quota refresh.
- [ ] Show which adapter and account produced every value.

### OpenCode Agents

- [ ] Show the active OpenCode agent, model, and provider in a compact section.
- [ ] List configured agents and their availability state.
- [ ] Add quick switching between agents and models when supported by the public TUI API.
- [ ] Show relevant permissions, capabilities, or mode metadata exposed by OpenCode.
- [ ] Track the active agent separately for parent and child sessions.

### Provider Quotas

- [ ] Add provider adapters for OpenAI, Anthropic, and Google when stable authenticated quota APIs are available.
- [ ] Reuse supported OpenCode or provider authentication without copying credentials into plugin storage.
- [ ] Support multiple accounts for the same provider without merging their limits.
- [ ] Display request, token, credit, and subscription limits using provider-native units.
- [ ] Display rolling-window, daily, weekly, and credit-based limits without forcing them into one misleading percentage.
- [ ] Link authentication and quota errors to provider-specific recovery instructions.

### External Agent CLIs

- [ ] Detect supported installations of Claude Code, Codex CLI, and Gemini CLI.
- [ ] Show CLI version, authentication state, and last successful status refresh.
- [ ] Read limits only through stable machine-readable commands or documented local APIs.
- [ ] Never parse interactive terminal output or undocumented credential files.
- [ ] Allow each CLI integration to be enabled or disabled independently.
- [ ] Show an update hint when an installed CLI is too old for the integration.

### Limits UX

- [ ] Introduce a normalized usage model with used, remaining, total, reset time, and data freshness fields.
- [ ] Show loading, stale, unsupported, authentication-required, and rate-limited states explicitly.
- [ ] Refresh limits manually and at a configurable background interval.
- [ ] Add warning thresholds for nearly exhausted limits and upcoming resets.
- [ ] Show the last successful refresh time and the source of each limit.
- [ ] Add compact, expanded, and hidden display modes for every limit source.
- [ ] Never store provider credentials in sidebar preferences or logs.
- [ ] Add adapters only for providers with a stable authenticated API or data exposed by OpenCode.
- [ ] Add contract tests with recorded, secret-free provider responses.

## 0.9: Unified Sidebar Search

Provide one fast entry point for everything exposed by the sidebar.

- [ ] Add a global sidebar search command.
- [ ] Search skills, subagents, MCP servers, and quick actions together.
- [ ] Group results by type and show the action each result will perform.
- [ ] Support fuzzy matching and keyboard-only result selection.
- [ ] Keep a short list of recent selections.
- [ ] Allow result providers to be enabled or disabled in settings.

## 0.10: Profiles and Portability

Make personalized layouts easy to reuse across projects and machines.

- [ ] Export and import custom presets as JSON.
- [ ] Add a versioned schema for portable settings.
- [ ] Validate imported settings and show unsupported fields before applying them.
- [ ] Support project-local profiles that can be committed with the repository.
- [ ] Export and import layout and MCP presets together or independently.
- [ ] Add commands to reset global, worktree, or project-local preferences.
- [ ] Document precedence between plugin options, global settings, and project settings.

## 1.0: Stability and Polish

- [ ] Split `src/tui.tsx` into controllers, components, dialogs, and icon definitions.
- [ ] Show actionable notifications when Todo, Subagents, Skills, LSP, or MCP refreshes fail.
- [ ] Cancel or ignore stale requests after session, workspace, or worktree changes.
- [ ] Add retry with bounded backoff for transient API failures.
- [ ] Add end-to-end smoke tests that load the plugin in OpenCode TUI.
- [ ] Add accessibility tests for keyboard navigation and text-only icons.
- [ ] Add performance tests for large Todo, Skills, Subagents, and MCP lists.
- [ ] Add linting and formatting checks to `bun run check`.
- [ ] Add bundle-size tracking to CI.
- [ ] Add screenshots or a short demo recording to the README.
- [ ] Publish a changelog and generate release notes for each version.

## API-Dependent Candidates

These features should be scheduled only after the required capabilities are
available in the public OpenCode TUI plugin API.

- Editable Todo status and priority.
- LSP restart controls and diagnostic counters.
- Agent or model switching when no public TUI command is available.
- Session and subagent token, context-window, and cost summaries.
- Provider quota data that is not exposed through a stable authenticated API.
- Recently changed files and workspace diagnostics.
- Preventing MCP servers remembered as disabled from connecting during startup.

## Suggested Delivery Order

1. Ship layout presets, MCP connection presets, section ordering, and density controls.
2. Add keyboard focus and navigation before introducing more interactive rows.
3. Improve MCP, Skills, Todo, and Subagents using the shared interaction patterns.
4. Add the shared limit contract and native OpenCode agent overview.
5. Add provider quota adapters, followed by external CLI adapters with stable machine-readable interfaces.
6. Build unified search on top of the stabilized section APIs.
7. Add portable profiles after the settings schema has settled.
8. Complete the architectural split, end-to-end coverage, and release polish for 1.0.

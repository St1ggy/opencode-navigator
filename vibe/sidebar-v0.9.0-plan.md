# v0.9.0 Plan: Todo, Subagents, and List Limits

## Task

Add an `All / Active / Finished` switch to Todo and group active, completed, and cancelled tasks. In Subagents, show the observed duration of the current run, errors, and the last 10 completed runs per parent session; keep the history in memory until the OpenCode process exits.

Add a setting for the number of displayed items to each of the six sections. Show all items by default. When a limit is set, provide `Show all` and `Show less`; apply the limit after filtering and sorting. Save limit settings in the existing global/worktree preferences, support mouse and keyboard interaction, and update documentation and checks.

## Plan Structure

Execute the stages sequentially: limit settings -> shared limiting and navigation mechanism -> section integration -> Todo -> observed Subagent run model -> Subagents interface -> final verification. Follow every implementation stage with a separate behavioral-test stage. When implementation begins, create `vibe/sidebar-v0.9.0-plan-track.md` with `[ ]` / `[X]` markers for stages 1-13.

## Execution Plan

### Stage 1: Item Count Settings

**What to add/implement:**

- Add `SectionItemLimits = Partial<Record<SidebarSection, number>>` and `PluginSettings.sectionItemLimits`. A value of `0` means `All`; allow nonnegative safe integers. Reject unknown sections, fractions, negative numbers, strings, `NaN`, and `Infinity` while parsing the document.
- Add `parseSectionItemLimits()` and the `section_item_limits` plugin option. Use `0` for missing values in every section: Todo, Subagents, Skills, Quick Actions, LSP, and MCP.
- When parsing scoped overrides, retain only explicitly specified sections. In `resolvePreferences()` and `applyPreferencesUpdate()`, merge `sectionItemLimits` by individual section keys with respect to `clearBehavior`; do not replace the whole map when one section changes.
- In `createPreferencesController()`, add `sectionItemLimit(section)`, `selectedSectionItemLimit(section)`, and `setSectionItemLimit(section, value)`. Persist a change immediately to `selectedTarget()` through a one-section delta update. Include limits in the behavior reset.
- In Settings, combine limits with the `Sections` tab: add an `Items: All/number` field to every section row. Clicking the field or pressing `L` opens `DialogPrompt`: an integer, with `0` meaning all; Enter saves without toggling visibility. Show a toast for invalid input and preserve the entered text; after confirmation or cancellation, return to the original tab row.
- Keep limits as behavior settings; `Show all` must not write preferences. Update existing typed fixtures for the new `PluginSettings` field.

**Files to edit:**

- `src/preferences-schema.ts` - types, parsing, and per-item limit resolution.
- `src/config.ts` - read `section_item_limits`.
- `src/preferences-store.ts` - delta merging for the limit map.
- `src/controllers/preferences.ts` - defaults, getters, and setter.
- `src/dialogs/settings.tsx` - Items field in the Sections tab, prompt, contextual hint, and selected-row restoration.
- `test/config.test.ts`, `test/preferences-schema.test.ts`, `test/preferences-controller.test.ts` - update existing required fixture fields.

**Documentation:**

- [Public TUI plugin API](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/specs/tui-plugins.md) - `ui.DialogPrompt`, dialog stack.
- `node_modules/@opencode-ai/plugin/dist/tui.d.ts` - use the installed version `1.18.30` definitions when verifying the API.

**Examples in the project:** `setFocusKey()`, `selectedResolved()`, and `resetPluginSettings()` in `src/controllers/preferences.ts`; `openPresetPrompt()` and `focus_key` handling in `src/dialogs/settings.tsx`.

**Verification commands:** `bun run typecheck`; `bun run lint`.

### Stage 2: Limit Settings Tests

**What to add/implement:**

- Verify default `All`, valid numbers, unknown keys, invalid input, and persistence of an explicit `0` over a positive inherited limit.
- Verify configured -> global -> worktree precedence, independent changes to two sections, behavior reset, controller restart, and changes before hydration.
- Verify concurrent updates from independent store instances: limits for different sections are saved alongside MCP presets and favorites.
- Add a renderer test for the combined `Sections` tab: Tab/Shift+Tab transitions, the L key and clicking Items, value entry, cancellation, and active-row restoration. Verify independence from visibility toggling and preservation of tab order.

**Files to edit:** `test/config.test.ts`, `test/preferences-schema.test.ts`, `test/preferences-store.test.ts`, `test/preferences-controller.test.ts`, `test/section-interaction.test.tsx`.

**Examples in the project:** concurrent MCP preset save tests in `test/preferences-store.test.ts`; preference persistence tests in `test/section-interaction.test.tsx`.

**Verification commands:** `bun run build`; `bun test --preload @opentui/solid/preload test/config.test.ts test/preferences-schema.test.ts test/preferences-store.test.ts test/preferences-controller.test.ts test/section-interaction.test.tsx`; `bun run typecheck`.

### Stage 3: Shared List Limit and Navigation Order

**What to add/implement:**

- Create `createListVisibility()` with accessor parameters `items`, `limit`, and `resetKey`, returning `visible`, `hiddenCount`, `expanded`, `canToggle`, `showAll`, and `showLess`.
- When `limit === 0`, return the entire list without controls. For a positive limit, return the first N items; `Show all` expands the entire current list in one action, and `Show less` restores N items.
- Reset temporary expansion when the target, search query, Todo filter, or limit changes. Ordinary data, timer, and favorite updates must not reset expansion. If the list becomes no longer than the limit, hide the control and reset expansion.
- Create `ListVisibilityControl` using `useSidebarItem()`: one stable navigation ID per section, labeled `Show all (N more)` or `Show less`. When collapsing, keep focus on this control; if it disappears, move focus to the section heading.
- Add `SidebarOrder = number | readonly [section: number, item: number]`. Extend descriptor and accessor order, normalize legacy numeric values to `[number, 0]`, and sort lexicographically.
- Use `[baseOrder, 10 + index * 2]` for section rows, the next fractional item index for star/retry, and a position after the last visible row for the footer control. Use `[baseOrder, 0]` for the heading, and place the header action and other controls before rows. Preserve dynamic `baseOrder` calculation when sections are reordered.

**Files to create/edit:**

- `src/controllers/list-visibility.ts` - `createListVisibility()`.
- `src/components/list-visibility.tsx` - `ListVisibilityControl`.
- `src/sidebar-interaction.ts` - `SidebarOrder` and order comparison.
- `src/components/common.tsx` - order types for filters/header actions.
- `src/components/sections.tsx` - row and request-control order types; convert every interactive section element to compound order.

**Documentation:** [Solid effects](https://docs.solidjs.com/concepts/effects), [onCleanup](https://docs.solidjs.com/reference/lifecycle/on-cleanup).

**Examples in the project:** `useSidebarItem()` in `src/components/common.tsx`; `available()` and `select()` in `src/sidebar-interaction.ts`; `SkillRow` and `McpRow` in `src/components/sections.tsx`.

**Verification commands:** `bun run typecheck`; `bun run lint`.

### Stage 4: Limiting and Navigation Tests

**What to add/implement:**

- Create `createListVisibility()` tests for an empty list, `0`, N, the exact N threshold, `Show all`, `Show less`, target/query/limit changes, and data updates that preserve expansion.
- Verify navigation through 500 items in one section and transition to the next: rows from different sections do not interleave, star/retry follows its main row immediately, and section reordering changes navigation order.
- Verify Enter and mouse release on the footer control, focus preservation on `Show less`, footer disappearance, and removal of hidden rows from the navigation registry.

**Files to create/edit:** `test/list-visibility.test.ts`, `test/sidebar-interaction.test.ts`, `test/sidebar-keyboard.test.tsx`, `test/section-interaction.test.tsx`.

**Examples in the project:** dynamic row order test in `test/sidebar-interaction.test.ts`; real keyboard-input harness in `test/sidebar-keyboard.test.tsx`.

**Verification commands:** `bun run build`; `bun test --preload @opentui/solid/preload test/list-visibility.test.ts test/sidebar-interaction.test.ts test/sidebar-keyboard.test.tsx test/section-interaction.test.tsx`; `bun run typecheck`.

### Stage 5: Limits in Every Section

**What to add/implement:**

- Integrate `createListVisibility()` and `ListVisibilityControl` into Todo, Subagents, Skills, MCP, Quick Actions, and LSP. Count data items, not terminal rows: wrapped text and error details belong to one item, and one LSP badge is one item.
- Use sessionID + directory + workspace as the target key for Todo/Subagents, `controller.target().key` for Skills/MCP, and `currentLocation(api).key` for LSP/Quick Actions. Export the existing Todo/Subagents `target()` through the returned controller API.
- In Skills, apply the limit after favorites-first sorting and text filtering; render an empty separator only between groups that are actually visible.
- In MCP, apply the limit after filtering. Preserve summary, preset matching, `Connect all`, `Disconnect all`, preset application, and bulk retry over the complete server list.
- Keep section-wide counters based on complete data. Use different messages for an empty filter result and an empty section. Controls, loading errors, group headings, and the footer do not count toward the limit.
- Keep LSP badges in `flexWrap`; place the footer on a separate row after the badge container.

**Files to edit:** `src/components/sections.tsx`, `src/controllers/todo.ts`, `src/controllers/subagents.ts`; update renderer-test doubles that use the new public accessors.

**Examples in the project:** `SkillsSection.filtered()`, `McpSection.filtered()`, `LspSection`, and `SectionRequestBody` in `src/components/sections.tsx`; `src/location.ts`.

**Verification commands:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Stage 6: Section Limit Tests

**What to add/implement:**

- Verify default `All` for all six sections, a positive limit and both controls, clearing/changing a filter, and changing the current session.
- Verify the Skills favorites separator after limiting; MCP bulk actions must affect servers outside the visible list and filter.
- Extend performance tests: 500 items with `All`, 500 input items with limit 5, expansion to the full list, and collapse back to the limit; verify the number of mounted rows and navigation descriptors.
- Preserve the existing `MAX_RENDER_MS = 10_000` budget for each performance test.

**Files to edit:** `test/section-interaction.test.tsx`, `test/section-performance.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/plugin-smoke.test.tsx`.

**Examples in the project:** `expectLargeList()` in `test/section-performance.test.tsx`; filter and favorite-toggle tests in `test/section-interaction.test.tsx`.

**Verification commands:** `bun run build`; `bun test --preload @opentui/solid/preload test/section-interaction.test.tsx test/section-performance.test.tsx test/sidebar-keyboard.test.tsx test/plugin-smoke.test.tsx`; `bun run typecheck`.

### Stage 7: Todo Filtering and Grouping

**What to add/implement:**

- Create `TodoViewMode = "all" | "active" | "finished"` and `buildTodoView(todos, mode)` with groups and counts.
- `All`: groups `Active`, `Completed`, `Cancelled`, then `Other` for unknown future statuses. `Active`: `pending` and `in_progress`. `Finished`: `completed` and `cancelled` as two separate groups.
- In Active, place `in_progress` before `pending` while preserving source order within each status; preserve source order in all other groups as well. Do not merge tasks with identical text.
- Add an `All / Active / Finished` selector row with counts; default to `All`, keep state local to the current target, and reset it when the target changes.
- For rendering, first filter and group, then apply the shared limit to the flat task list, then render headings for nonempty visible groups. Leave one blank row between groups.
- Keep `completed/total` in the header; for `Finished`, count completed + cancelled. When the selected mode has no tasks, show `No active tasks` or `No finished tasks`.

**Files to create/edit:** `src/todo-view.ts` - `buildTodoView()`; `src/components/sections.tsx` - selectors, groups, and mode state in `TodoSection`.

**Documentation:** `node_modules/@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts` - `Todo`, the four current statuses, and the string status type; [Solid Show](https://docs.solidjs.com/reference/components/show).

**Examples in the project:** `TodoRow`, `SkillsSection` in `src/components/sections.tsx`; tab buttons in `src/dialogs/settings.tsx`.

**Verification commands:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Stage 8: Todo Tests

**What to add/implement:**

- Verify modes, counts, `in_progress` priority, source order, unknown status, and duplicate text.
- Verify the separate Cancelled group in All/Finished and the absence of cancelled tasks from Active.
- Verify filtering together with a limit, disappearance of empty headings, correct header summary, and live `todo.updated` behavior in the selected mode.
- Verify keyboard and mouse interaction on selectors; changing the target resets the mode and `Show all`. Preserve stale-refresh and request-cancellation coverage.

**Files to create/edit:** `test/todo-view.test.ts`, `test/section-interaction.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/todo-controller.test.ts`.

**Examples in the project:** `test/todo-controller.test.ts` - stale-refresh protection; `test/section-interaction.test.tsx` - reactive renderer assertions.

**Verification commands:** `bun run build`; `bun test --preload @opentui/solid/preload test/todo-view.test.ts test/todo-controller.test.ts test/section-interaction.test.tsx test/sidebar-keyboard.test.tsx`; `bun run typecheck`.

### Stage 9: Observed Subagent Runs and History

**What to add/implement:**

- Create `SubagentRun` with `sessionID`, `startedAt`, `finishedAt?`, `outcome?: "finished" | "error" | "cancelled"`, `errorMessage?`, and `startedBeforeObservation`. Create `createSubagentHistory({ now })` with public `observeStatus(targetKey, sessionID, status)`, `observeError(...)`, `remove(...)`, `active(...)`, and `recent(...)` methods.
- Use the local event-receipt time. When first discovering a session that is already busy/retrying, set `startedBeforeObservation = true`; for a known idle -> busy transition, set it to false. Do not use `Session.time.created` as the run start or `time.updated` as the end.
- Busy <-> retry preserves `startedAt`. A transition from observed busy/retry -> idle closes the run and adds it to recent. First observing idle without an active run does not create history. Repeated idle events do not duplicate an entry.
- A `session.error` with a sessionID stores the error for the current run; mark `MessageAbortedError` as cancelled. Idle after an error preserves error/cancelled. An error received immediately after idle applies to the latest completed run for that session if no new run has been observed. Use `Session error` when the error payload is absent.
- On a repeated run, remove the previous recent entry for that child session and establish a new start time. Keep the last 10 entries per target, sort by descending finishedAt, and break ties by sessionID. Removing a child removes its active and recent entries.
- Integrate history into `createSubagentController()`: extend `list(parentID)` with run metadata and add `recent(parentID)`. History survives deactivation and transitions between parent sessions within the process.
- Apply session/error/status events and journal replay so that a stale refresh cannot finish a new run or restore a deleted session. Record transitions only after validating the request generation.
- Distinguish confirmed idle from missing status caused by an error. For a complete successful host status snapshot, an absent sessionID means idle. For dev-team, use the result of its successful worker request; timeout, cooldown, and HTTP error do not create completion. Preserve the last confirmed status with a worker-unavailable flag and later recovery.
- Store explicit idle so `api.state.session.status()` cannot return stale busy state after idle has already been accepted. Add error mutation to journals and subscribe to `session.error`; stop subscriptions and polling on dispose, and prevent duplicate poll timers when the target changes.

**Files to create/edit:** `src/controllers/subagent-history.ts` - model and reducer API; `src/controllers/subagents.ts` - history, status, error, and remote-availability integration; update existing typed row fixtures in tests.

**Documentation:**

- `node_modules/@opencode-ai/sdk/dist/v2/gen/types.gen.d.ts` - `Session`, `SessionStatus`, and `EventSessionError` from version `1.18.30`.
- [OpenCode events](https://opencode.ai/docs/plugins/#events) - session.status/error/idle.
- [OpenCode server](https://opencode.ai/docs/server/) - `GET /session/status`, `GET /session/:id/children`.
- [OpenCode status/error handling](https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/feature-plugins/system/notifications.ts) - error takes priority over a subsequent idle event.

**Examples in the project:** journals, `fetchDevTeamStatus()`, and `activate()` in `src/controllers/subagents.ts`; generation guard in `src/controllers/request-state.ts`.

**Verification commands:** `bun run typecheck`; `bun run lint`.

### Stage 10: Subagent Lifecycle and History Tests

**What to add/implement:**

- Create history tests with a controlled `now`: busy -> retry -> idle, repeated idle, initial idle, already-busy discovery, repeated run, error -> idle, idle -> error, aborted, and missing sessionID/error payload.
- Verify the last 10 entries, order, child removal, target isolation, parent transitions, and empty history in a new controller instance.
- Verify status/error/delete events during children/status/worker refresh, a late response from an old target, and preservation of a new run under a stale snapshot.
- Verify worker timeout/cooldown without false completion, explicit idle after recovery, no fallback to stale host status, no duplicate polling, and timer cleanup.
- Preserve existing loopback URL and `redirect: "error"` checks.

**Files to create/edit:** `test/subagent-history.test.ts`, `test/subagent-controller.test.ts`.

**Examples in the project:** deferred fetch and `session.deleted` test in `test/subagent-controller.test.ts`; abort-ignoring request test in `test/todo-controller.test.ts`.

**Verification commands:** `bun test --preload @opentui/solid/preload test/subagent-history.test.ts test/subagent-controller.test.ts`; `bun run typecheck`.

### Stage 11: Duration, Errors, and Recent Runs in Subagents

**What to add/implement:**

- Create `formatSubagentDuration(startedAt, now, approximate)` with `12s`, `2m 03s`, and `1h 02m` formats; for already-busy discovery, use the `>=` prefix and measure from the beginning of observation. Clamp negative values to zero.
- In `SubagentRow`, show the title and compact duration; for retry, show `Retry #N` and a countdown from `status.next`; for an execution error, show an error icon and message; for worker unavailability, show a separate status-unavailable message.
- Add one shared time signal to `SubagentSection`, updated once per second only while the section is expanded and has visible active rows. Stop the interval on collapse, target change, and unmount through `onCleanup()`.
- Render Active, then Recent. Place active rows with errors and retries before other active rows while preserving source order within categories. Sort Recent by finishedAt; use neutral `Finished`, `Error`, and `Cancelled` labels without presenting idle as confirmed task success.
- Apply one shared Subagents limit to Active + Recent, with active rows first. Group headings and loading errors do not count toward the limit. Every recent row opens its corresponding child session through the existing `controller.open()`.
- The header shows active and recent counts. Show recent entries when there are no active ones; display the empty message only when both groups are empty. Freeze a completed run's duration at finishedAt.

**Files to create/edit:** `src/subagent-view.ts` - `formatSubagentDuration()` and row sorting; `src/components/sections.tsx` - `SubagentRow`, `SubagentSection`, clock, and groups.

**Documentation:** [Solid cleanup](https://docs.solidjs.com/reference/lifecycle/on-cleanup), [Solid effects](https://docs.solidjs.com/concepts/effects); installed SDK definition of `SessionStatus.retry.next`.

**Examples in the project:** `TodoRow` - status colors; `McpRow` - inline error; `SubagentSection` - target lifecycle; `SkillRow` - focus preservation when order changes.

**Verification commands:** `bun run typecheck`; `bun run lint`; `bun run build`.

### Stage 12: Subagents UI and Performance Tests

**What to add/implement:**

- Verify duration formats, approximate-time indicators, zero countdown, and frozen recent-run duration.
- In the renderer, verify Active/Recent, error/cancelled, error preservation after idle, opening a child, limits and `Show all / Show less`, and absence of empty headings.
- Verify real keyboard selection when active/recent rows reorder, a child disappears, and the list collapses; focus must not jump unexpectedly to another section.
- Verify that ticks stop after collapse/unmount and that the UI clock does not trigger new network requests. Time updates must not recreate every row and navigation descriptor.
- Update the 500-subagent test for the new row shape and both All/limited modes. Verify plugin disposal with active polling and clock.

**Files to create/edit:** `test/subagent-view.test.ts`, `test/section-interaction.test.tsx`, `test/sidebar-keyboard.test.tsx`, `test/section-performance.test.tsx`, `test/plugin-smoke.test.tsx`.

**Examples in the project:** renderer/keyboard harness in `test/sidebar-keyboard.test.tsx`; complete mount/dispose in `test/plugin-smoke.test.tsx`.

**Verification commands:** `bun run build`; `bun test --preload @opentui/solid/preload test/subagent-view.test.ts test/section-interaction.test.tsx test/sidebar-keyboard.test.tsx test/section-performance.test.tsx test/plugin-smoke.test.tsx`; `bun run typecheck`.

### Stage 13: Documentation and Final Verification

**What to add/implement:**

- Update README with Todo filters, cancelled tasks in Finished, session-local filter mode, observed subagent duration, in-memory recent runs, six independent limits, default All, a `section_item_limits` example, and global/worktree reset semantics.
- Update the roadmap only for implemented items; leave expanded Subagent search/filters and all other directions as separate future tasks.
- Extend keyboard help with Todo selectors and `Show all / Show less`; describe application of the limit after filtering.
- Set the raw bundle budget to `240_000` bytes for this feature set in `scripts/check-bundle-size.ts` and ROADMAP. Preserve external Solid/OpenTUI, the unminified build, and minimum OpenCode version `1.18.30`.
- Format changed TS/TSX files, run the complete quality gate and PTY smoke test, and verify the package dry run includes LICENSE, README, package.json, and dist/tui.js.
- Manually verify the narrow sidebar: filters, long names, limit 1 and All, session transitions, recent/error, and mouse and keyboard operation. Verify that saving limits does not change visibility/order/layout presets.
- Mark every verified stage in the tracking file. Version preparation and publication must happen only under a separate release command.

**Files to edit:** `README.md`, `ROADMAP.md`, `src/dialogs/keyboard-help.tsx`, `scripts/check-bundle-size.ts`, `vibe/sidebar-v0.9.0-plan-track.md`.

**Examples in the project:** `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `scripts/smoke-opencode.sh`, `scripts/check-bundle-size.ts`.

**Verification commands:** `bun run check`; `bun run test:e2e`; `git diff --check`; `npm pack --dry-run --ignore-scripts --json`.

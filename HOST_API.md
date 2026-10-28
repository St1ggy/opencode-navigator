# Public Host APIs And Remaining Gaps

Navigator supports only OpenCode **1.19.5** and **2.2.0**, the current stable
release in each major line. Published SDK declarations and real-host checks
define the boundary; internal host components are not plugin APIs.

## Host-Owned Services

| Capability | OpenCode 1.19.5 | OpenCode 2.2.0 |
| --- | --- | --- |
| Todo | Supported host Todo source/events | Public message cache, completed `todowrite` and revert boundary |
| Skills | Host discovery and prompt insertion | Native Skill cache and `session.skill` with exact ID |
| MCP | Host status and connection API | Native cache, sync/invalidate and connect/disconnect |
| Subagents | Supported child/status API and events | Native session cache/status and typed execution events |
| Commands | Public keymap | Public owned layers, targets, priorities, modes, discovery and dispatch |
| Dialogs/toasts | Public dialog components and mounting | Public show/prompt/confirm/set/clear and toast |
| Model/variant | Saved session model and host pickers | Reactive prompt model, variant API and host pickers |
| Provider usage | Codex's documented external protocol | Public Console/Go usage first; documented external sources outside coverage |
| Package updates | Public plugin manager | Public plugin manager |

## Focused Navigator Implementations

Each row records a missing capability, rather than a request failure that would
justify bypassing a native API.

| Implementation | Missing equivalent / preserved semantics | Removal condition |
| --- | --- | --- |
| Shared private preferences and atomic lock | A common 1.x/2.x store with existing data, Global/Worktree overrides, portable-default precedence and user-wide pins/groups/trust. The 2.x host store is per-channel/plugin, not this cross-host contract. No mirrored store is created. | A public shared store and supported migration preserving scopes and concurrency. |
| Nested dialog frames | The host has one active dialog, not the preceding frame's query, selection, scroll and unsaved draft. Simple prompts/confirms delegate to native APIs. | Native nested frames with equivalent restore and stale-target behavior. |
| Literal Ctrl+, hook on 2.x | Public plugin bindings are strings; the comma expander splits literal commas into alternatives. The named parser does not normalize `comma` to the actual comma event. Dispatch still uses the native command API. | A documented literal-comma binding passing the real Settings smoke. |
| Subagent child discovery | Published TUI Data caches sessions but has no complete children-sync operation. Initial/manual/reconnect discovery uses the public paginated API and syncs unknown IDs into the host cache. | A complete children-sync/query on the supplied public Data interface. |
| Subagent observation history and retry details | Native status and cached transcript retry data are used first; recent runs, pre-observation clock markers, errors and unloaded-child retry detail remain observation history. | Equivalent public observed-run/retry history without loading every transcript. |
| Read-only Todo projection | Native completed tool calls and revert are public; the host's `sessionTodos` helper is not exported. No direct CRUD/priority API exists. | A public equivalent projection; editing also requires an explicitly selected interaction and supported API. |
| Console/Go request lifecycle and projection | `client.usage.limits` is public, but the internal usage cache and budget selectors are not in published Plugin Context. Workspace IDs are not provider account IDs. | Equivalent public cache and selector on the plugin interface. |
| External quotas / reset credits | Console/Go is not a universal provider API and has no Codex reset-credit consume operation. Sources stay documented, account-bound and portable. Native auth/request errors never enable a bypass reader. | Host APIs matching provider/account/units/resets and idempotent consume semantics. |
| Pinned-file snapshot installer | Native package updates do not implement the recognized versioned wrapper/staging layout. Preserve installation source and scope. | A public atomic file-snapshot update API with equivalent verification. |
| Corner masks and product UI | Multiline shape, three-cell controls, filters, groups, presets and pins are product features. Paint hooks only draw; scroll restoration runs outside paint. | Equivalent public primitives preserving geometry, behavior and fallback mode. |

## Unavailable Features

- OpenCode 2.2 publishes no LSP source, restart operation or diagnostic counters
  to TUI plugins. The 1.x status source remains available.
- The 2.x title is host-owned; no public fixed-title/date visibility slot exists.
- The 1.19.5 TUI API lacks a prompt-model accessor before submission.
- GUI, image-generation and instructions-entry APIs do not reactivate retired
  Todo guidance or unrelated features.

## Verification And Runtime

Both current hosts have isolated real-host checks. Historical installer fixtures
exercise migration only; they do not extend the supported host matrix.
Development uses Bun 1.4.4 and OpenTUI 0.7, leaving Solid/OpenTUI external so the
host owns its runtime. The 1.x host ships older runtime modules; its actual smoke
must pass rather than injecting the development modules into it.

OpenTUI 0.7 supports Node >=26.4.0 or Bun >=1.3.14. The updater verifies a staged
target with an available compatible runtime before switching a recognized local
wrapper. A lazy root import succeeding under an older Node does not prove full
renderer/FFI support. CI and package verification use Node 26.12.1.

# Public Host APIs And Remaining Gaps

Navigator supports only OpenCode **1.19.5** and **2.2.6**, the current stable
release in each major line. Published SDK declarations and real-host checks
define the boundary; internal host components are not plugin APIs.

## Approved Desktop Integration Contract

Desktop support uses the independent `./gui-experimental` entry available from
Navigator 0.27.0, not the TUI entrypoint. Earlier packages do not include this GUI.
The approved target is OpenCode Desktop 2.2.6, with TUI 1.19.5 and 2.2.6 kept
behind explicit adapters. The published 2.2.6 plugin package preserves every TUI
declaration from 2.2.5; its changed declarations are GUI-specific.

| Capability | Published Desktop contract | Navigator integration constraint |
| --- | --- | --- |
| GUI loading | `./gui-experimental`, `@opencode/plugin/gui`, one CJS bundle through `gui/vite` | Load from global server configuration; a CLI-only plugin entry does not enable Desktop. Preserve the server plugin's historical identity. |
| Data and requests | Reactive session `server.data` and live `server.client` | Resolve the selected session's server on every operation; the plugin-level client is the desktop sidecar, not an arbitrary remote session. |
| Session identity | Host session keys include server identity; location can be unavailable during reconnect | Partition domain state and reject stale actions by server/session/location; never put credentials in cache keys. |
| Layout | Native side panels, host-controlled bottom placement, narrow drawers, panel-specific width | Use native containers first. The optional floating view is an in-app presentation of the same state, not a detached OS window. |
| Commands and composer | Native command registry and reactive routed composer/model | Map verified commands explicitly; never emulate GUI actions by fabricating terminal command events. |
| Dialogs and settings | Native nested dialogs, SettingsPage and settings/menu components | Share validation and action state, not terminal dialog renderers or focus loops. |
| Local operations | Desktop main, validated IPC, Node/Electron only in main | Renderer models have no filesystem, subprocess or token access. Preserve the existing private store and lock rather than copying preferences to GUI storage. |
| Remote operations | The selected server's public client and existing plugin RPC | Do not read local project files or use local provider credentials for a remote target. Missing server capabilities remain explicit. |
| Native windows | Public main context can inspect existing windows; no panel detach operation | Detached OS windows are outside this delivery. Do not mutate host DOM or use private app internals to simulate support. |

The GUI API is experimental. Browser Web is not a verified target in this cycle.
The renderer and headless models must remain independent of Electron so a later
Web adapter does not require a second implementation of product rules.

Verification uses an npm-style tarball in the official checksum-verified Linux
ARM64 Desktop 2.2.6 package under Xvfb. Native macOS/Windows and multiple live
Desktop windows are not claimed as real-host coverage; remote identity, independent
window leases and concurrent shared-store writes are synthetic contracts. The
unminified TUI remains limited to 360,000 bytes; the single-file GUI has its own
600,000-byte budget (about 554 kB at the stage-10 baseline).

Native Settings temporarily has no mounted session and may have no active tab.
Navigator retains only a previously observed public session reference still
confirmed by the public tab list, server and location; Home, closing that tab or
changing its target clears it. Settings/profile operations use that reference's
live client/cache rather than substituting the sidecar.

Private favorites, trust, presets, account bindings and reset attempts remain in
the established filesystem preferences store/lock via typed main IPC. Native GUI
storage holds presentation only. Explicit Reload flushes writes, refreshes private
preferences and selected-server configured defaults, and clears temporary layout
overrides. Project profiles use the selected server RPC with exact file previews
and stale-file checks; workspace-placed filesystems are rejected until the public
server contract provides a verified placement-aware atomic write operation.

GUI permission actions open native Settings. No supported Desktop startup/Home
interception or LSP status contract was found; those terminal capabilities are not
simulated. Revisit the gaps when equivalent public APIs become available. Changelog
browsing is independent of the one-time version claim used by startup notes.

On narrow Desktop windows, Navigator uses **More → Navigator**, the host's
native drawer. The floating view redocks when the viewport becomes narrow.
Desktop 2.2.6 keeps drawer opening in its own mobile navigation; Navigator does
not click or move host elements to force it open. Revisit automatic drawer
opening when the public layout API exposes that operation.

GUI forms use `ctx.ui.Switch`, `TextInput`, `Select`, `Button` and the native
Settings rows rather than importing or bundling `@opencode/ui`. Desktop 2.2.6's
public UI facade has no multiline input, progress bar, disclosure row, or bookmark
icon. Those focused semantic controls remain plugin-owned, using the host theme's
surface, text, focus and elevation tokens. Remove these fallbacks when equivalent
public controls preserve their multiline, expanded/selected and progress semantics.

The Desktop model controls use the verified 2.2.6 commands `model.choose` and
`model.variant.cycle`. These IDs are version-audited mappings, not portable
TUI command names; a rejected dispatch reports that the control is unavailable.

The isolated Desktop 2.2.6 host also has a native dialog-context defect: opening
its command palette after a plugin dialog in a session can fail with
`Command context must be used within a context provider`. The same minimal
fixture reproduces this with Navigator disabled; Home does not reproduce it.
Navigator does not patch host contexts. Interaction smokes keep this native-only
probe separate and exercise subsequent plugin commands through the public
`commands.run` API. Recheck this limitation on the next audited Desktop target.

Sources: [GUI plugins](https://opencode.ai/docs/build/plugins/gui),
[TUI plugins](https://opencode.ai/docs/build/plugins/cli),
[RPC](https://opencode.ai/docs/build/plugins/rpc), and the published
`@opencode/plugin@2.2.6` declaration archive, audited on 2026-11-10.

## Host-Owned Services

### Dependency audit limits

The candidate's frozen install and peer graph pass, but its security audit is
not clean. The supported 1.x plugin pins an older Effect beta and Zod; its Effect
graph also carries TOML denial-of-service advisories. The supported 2.x utility
package pins Glob and Minimatch versions with denial-of-service advisories.
Navigator does not force incompatible transitive-major overrides or suppress the
audit. Removal depends on compatible upstream fixes in the supported host graph;
review these advisories again before publication.

### Selected-server quota services

Desktop Codex reads and reset submissions run behind typed main-process IPC,
only for the host-verified `sameMachine` sidecar. Main rechecks the session
directory, live client, active connection and private account binding; it never
returns credentials or provider headers to the renderer. Remote sessions use
their selected server's quota RPC and never borrow the Desktop's local account.
Public session and quota-event locations expose only a directory, not a workspace
ID. Workspace requests retain explicit location guards, and quota observations
without sufficient workspace identity do not trigger an automatic read.

The ordinary Codex bucket is account-scoped even when `normalModelSlug` is null.
Missing reset-credit details do not erase the provider's available count. Reset
submission requires a separate confirmation and an authoritative persisted
attempt; uncertain retries retain its idempotency key. No credit is spent during
review, refresh or account linking.

| Capability | OpenCode 1.19.5 | OpenCode 2.2.6 |
| --- | --- | --- |
| Todo | Supported host Todo source/events | Public message cache, completed `todowrite` and revert boundary |
| Skills | Host discovery and prompt insertion | Native Skill cache and `experimental.session.skill` with exact ID |
| MCP | Host status and connection API | Native cache, sync/invalidate and `experimental.mcp.connect/disconnect` |
| Subagents | Supported child/status API and events | Native session cache/status, execution start time and typed execution events |
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
| Nested dialog frames | The host has one active dialog, not the preceding frame's query, selection, scroll and unsaved draft. OpenCode 1 prompts and standalone confirmations delegate to native APIs. The 2.x promise prompt replaces its owner and loses Navigator's return callback, reproduced in the real toolbar-text smoke; Navigator-owned nested one-line prompts use a focused Shared editor. | Native nested frames and prompt ownership/dismissal semantics with equivalent restore and stale-target behavior. |
| About service port and manual release history | Navigator-specific metadata/update state must be shared between footer, shortcuts and deferred Settings. The shipped changelog is read separately from the first-launch claim; no second updater or preference mirror is created. Nested update confirmations stay in the existing frame stack. | Public host facilities preserving Navigator release identity, changelog browsing and nested return state. |
| Bug-report transport and external browser launch | Neither supported public TUI contract provides GitHub issue creation or an external browser opener. Direct sending uses the user's authenticated `gh` without reading credential files; a `type: Bug` repository form handles browser reports. Bounded argv-based OS launch has a visible link/clipboard fallback on remote or headless hosts. | Equivalent public host issue/browser APIs preserving authentication ownership, editable draft, real issue type and confirmation semantics. |
| Literal Ctrl+, hook on 2.x | Public plugin bindings are strings; the comma expander splits literal commas into alternatives. The named parser does not normalize `comma` to the actual comma event. Dispatch still uses the native command API. | A documented literal-comma binding passing the real Settings smoke. |
| Subagent child discovery | Published TUI Data caches sessions but has no complete children-sync operation. Initial/manual/reconnect discovery uses the public paginated API and syncs unknown IDs into the host cache. | A complete children-sync/query on the supplied public Data interface. |
| Subagent observation history and retry details | Native status, `SessionInfo.time.busy` and cached retry data are used first. Valid current-execution start times give exact active durations without a pre-observation marker; missing/invalid timing keeps the observed fallback. Recent runs, errors and unloaded-child retry details remain observation history. The prior execution's `idle`/`outcome` never completes a currently running execution. | Equivalent public observed-run/retry history without loading every transcript. |
| Read-only Todo projection | Native completed tool calls and revert are public; the host's `sessionTodos` helper is not exported. No direct CRUD/priority API exists. | A public equivalent projection; editing also requires an explicitly selected interaction and supported API. |
| Native Todo enablement | `config.get` exposes ordered sources, but `experimental.config.update` supports only shell. The setup feature previews and confirms a JSONC leaf edit in an existing discovered source through public server file APIs. File reads are location-confined, so selected-file IO is routed to its server-side parent; the original session/location remains the stale-target guard. Reads immediately before writes reject changed previews, and readback verifies the file and effective flag. The public write API has no CAS, so this is not an atomic transaction against concurrent external writers; uncertain outcomes require Refresh before retry. No model, shell or Todo event is used. | A public Todo config patch API preserving source precedence, unrelated JSONC content and conditional-write semantics. |
| Console/Go request lifecycle and projection | `client.experimental.usage.limits` is public, but the internal usage cache and budget selectors are not in published Plugin Context. Workspace IDs are not provider account IDs. | Equivalent public cache and selector on the plugin interface. |
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
The published 2.2.6 TUI declarations are identical to 2.2.5. OpenTUI 0.8 retains
the drawing-only paint-hook contract; renderer tests,
nested dialogs and frame-level typing probes run against the updated runtime.
Development uses Bun 1.4.4 and OpenTUI 0.8.3, leaving Solid/OpenTUI external so the
host owns its runtime. The 1.x host ships older runtime modules; its actual smoke
must pass rather than injecting the development modules into it.

OpenTUI 0.8 supports Node >=26.4.0 or Bun >=1.3.14. The updater verifies a staged
target with an available compatible runtime before switching a recognized local
wrapper. A lazy root import succeeding under an older Node does not prove full
renderer/FFI support. CI and package verification use Node 26.12.1.

### Deliberate Compatibility Pins

- `web-tree-sitter` stays at **0.25.10**, the exact peer required by OpenTUI
  0.8.3. Upgrade it when the supported host runtime publishes a compatible peer
  contract; the independent 0.27 line is not a compatible substitution.
- `typescript` is **6.0.3**, selected to match the complete published
  `@st1ggy/linter-config` **10.0.0** preset. SonarJS and typescript-eslint JS
  plugins remain enabled without the former TS7 projection or override.
  [Lint coverage](LINT_COVERAGE.md) records the current setup and historical exclusions.
- Oxlint **1.90.0**, Oxfmt **0.75.0** and oxlint-tsgolint **7.0.2005** match the
  preset's exact peer versions. Advance them when the preset supports newer engines.
- OpenTUI's transitive `bun-ffi-structs` **0.3.1** declares the outdated compiler
  peer `typescript: ^5`. A root-only Bun metadata patch expands it to `^5 || ^6`;
  no runtime bytes or declarations change. Strict declaration compilation with
  library checks enabled, packing regressions and the resolved compiler graph
  verify the selected TS6 use. Remove the patch when upstream accepts TS6.
  Bun patches apply only in this repository, not transitively in consumer projects
  or the separately generated snapshot runtime manifest. Those installations may
  still report the upstream peer warning; this is not an upstream fix.
- Bun remains pinned at **1.4.4**, the current stable release. Direct dependencies
  otherwise use their latest compatible stable releases; transitive updates stay
  within upstream ranges. Runtime peers remain host-owned and are not bundled.

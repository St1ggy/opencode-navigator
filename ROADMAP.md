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

- [x] Decompose the session sidebar sections into an atomic pages-first slice with explicit page/shared UI APIs and a compatibility facade.
- [x] Complete session-sidebar ownership of sidebar composition, interaction, and section primitives while retaining re-export-only legacy facades.
- [x] Migrate flat controller and domain-model implementations into isolated entity/shared slices with explicit public APIs and compatibility facades.
- [x] Fully migrate to the current official FSD specification (v2.1 at the latest documentation check), with explicit slice APIs, controlled imports, and maximally atomic UI components.
- [x] Separate stateful logic from rendering; Todo, Subagents, Skills, MCP, preferences, and sidebar interaction live outside the section components.
- [x] Keep plugin composition in `src/app` and `src/tui.tsx` as an export-only compatibility facade, with controllers, components, dialogs, and icons in focused slices.
- [x] Keep Solid and OpenTUI packages external so the plugin shares OpenCode's reactive runtime.
- [x] Share request-state, loading/empty/error/pending presentation, retry, focus, disabled, and activation primitives across asynchronous sections.

### Unified Persistence

- [x] Store layout, behavior, MCP, onboarding, and skill-confirmation state in one validated, atomic, concurrency-safe preferences file.
- [x] Remember desired enabled and disabled MCP state by exact worktree, directory, or global location key.
- [x] Use one preferences document and shared value types for global and exact-worktree layout, behavior, and MCP overrides.
- [x] Provide explicit global/worktree scope selection, inherited precedence, and per-scope layout, behavior, and MCP reset controls.
- [x] Apply Settings visibility edits immediately without stale session or worktree layout snapshots masking the selected scope.
- [x] Keep commit-safe project-local profiles and project persistence scope deferred to the portability phase.
- [x] Merge validated portable defaults from plugin options, user settings, and `.opencode/navigator.json` below saved Global/Worktree preferences.
- [x] Let users reload saved Navigator preferences manually from Settings without restarting OpenCode, including scope-aware layout, behavior, favorites, groups, and presets.

### Request And Error Reliability

- [x] Adapt PR #27 by Simon Klee: draw selection caps in one drawing-only hook, skip non-filling ancestor backgrounds, and cover recording-buffer safety and backdrop geometry.
- [x] Adapt PR #32 by Avissian: preserve quota/action rows across equivalent updates and ignore foreign-directory catalog observations without weakening credential, reconnect or credit guards. Apply the location rule to native Console/Go in-flight reads as well.
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
- [x] Migrate to `@st1ggy/linter-config` 8.0.0 with its shared Solid Oxlint and Oxfmt presets, retain type-aware checks and documented project-specific exceptions, and verify the full `bun run check` pipeline.
- [x] Enforce a 360,000-byte raw bundle budget through `bun run check` and CI.
- [x] Add verified runtime and package compatibility for both OpenCode 1.18.30+ and OpenCode 2.x, with explicit adapters for host API differences and a real local OpenCode 2.0.16 client smoke.
- [x] Verify a user-managed 2.x transition with parallel 1.x `tui.json` and 2.x `cli.json` client configurations.
- [x] Refresh the development SDK/runtime dependencies and compatibility fixtures for OpenCode 1.18.34 and the OpenCode 2.0.21 reference baseline.

### Keyboard Navigation

- [x] Provide a configurable sidebar toggle key and unregister the previous binding when it changes.
- [x] Support keyboard navigation in setup, settings, and filters, including scrolling the selected settings row into view.
- [x] Add a sidebar focus command and configurable keybinding.
- [x] Navigate interactive sections and rows with arrow keys or `j` and `k`, activate with `Enter`, and return focus with `Escape`.
- [x] Add direct section palette commands, visible focus states, focused-row scrolling, and compact keyboard help.
- [x] Turn the configured sidebar shortcut into a temporary, discoverable section/action mode while preserving direct palette toggle commands.
- [x] Add `c` manual update checking and `u` confirmed Navigator updating to shortcut mode, with repeatable bounded checks, user-visible results, synchronized help, and the existing installation/source guards.
- [x] Navigate controls on one visual row with Left/Right and move between rows with Up/Down or `j`/`k`.

### Smoke Coverage

- [x] Cover controllers and durable preference behavior with automated tests.
- [x] Render the built bundle with OpenTUI's test renderer and exercise slot mounting plus representative mouse, filter, settings, wizard, retry, and keybinding flows.
- [x] Add an advisory end-to-end PTY smoke test that loads the packaged plugin in OpenCode 1.18.30.
- [x] Cover keyboard focus/navigation and a shared Nerd Font/text fallback mode across sections, search, Quick Actions, and dialogs.
- [x] Enforce renderer performance budgets for 500-row Todo, Skills, Subagents, and MCP lists.
- [x] Add a reproducible Docker/Ghostty screenshot harness with pinned fonts, virtual display capture, and fully synthetic fixtures for every sidebar section and dialog.
- [x] Keep deterministic layout, MCP, and import previews with Nerd Font icons but rectangular multiline highlights when the additional corner font is disabled.
- [x] Verify the migrated global `cli.json` and Navigator package wrapper in the real OpenCode 2.0.16 TUI while retaining the separate OpenCode 1.x `tui.json` configuration.
- [x] Restore OpenCode 2.x visual parity for Navigator and keep Todo visible with setup guidance when its server Todo API is unavailable.
- [x] Preserve the initial Navigator-owned OpenCode 2 task storage as a read-only archive after moving the primary view to native Todo; the former agent tool and extra context guidance are retired, while OpenCode 1.x host Todo remains unchanged.
- [x] Show quiet OpenCode 2 Todo server setup guidance without a request error or Retry when its RPC is not installed; retain retry for other errors and configure local dual-host OpenCode clients without loading the v2 server plugin in 1.x.
- [x] Add a separate required real-host OpenCode 2.x PTY smoke while retaining the OpenCode 1.x compatibility smoke.
- [x] Establish separate local `oc`/`opencode` and `oc2`/`opencode2` launch routing; verify both interactive zsh wrappers and executable PATH commands with `--version`.
- [x] Replace the local npm-managed OpenCode 1.x and 2.x installs with Homebrew 1.18.34 and 2.0.21 while retaining the same four command names, compatibility with already-open shells, and separate startup configurations.

### Pinned Action And Skill Toolbar

- [x] Add an icon toolbar at the top of sidebar content, below the host title on OpenCode 2.x, with pins separate from existing bookmarks; render no toolbar or reserved spacing when it is empty.
- [x] Add an icon picker to pin configuration, with separately configurable icons for each supported observable function state and reactive state changes.
- [x] Reuse existing action/Skill invocation, confirmations and scope guards; support mouse and keyboard, themes, Text fallback, unavailable items and narrow terminals.
- [x] Offer configurable single-row overflow with a More menu or wrapping toolbar rows.
- [x] Verify private atomic preference persistence, nested picker drafts/cancellation, row navigation, light/narrow rendering, shared deferred host registries, and delayed screenshot command registration. Full check: 431 passing tests, one opt-in skip; 350,726 / 360,000-byte main bundle. Expanded real-host smokes pass on 1.18.30, 1.19.3, 2.0.21, and 2.1.0.
- [x] Register ten fully synthetic toolbar/picker/state/menu/wrapping/Text/narrow/no-corner scenes and update public documentation.
- [x] Generate and verify all 62 PNG captures through Prepare Release run 39803593194; screenshot PR #29 passed the four-host CI matrix and merged. The narrow fixture uses the host's public sidebar toggle, icon-picker captures exclude caret timing, and lazy fixture commands wait for registration.

### Native OpenCode 2 Todo Migration

- [x] Audit the exact OpenCode 2.1.0 native Todo tool, public plugin/client interfaces, and built-in sidebar projection: `experimental.todo` enables a content/status-only `todowrite`; the host reads its latest completed call before the revert boundary.
- [x] Replace Navigator-owned Todo as the primary OpenCode 2 source with public native message snapshots and revert semantics; retain legacy data behind a read-only archive RPC, retire the custom writer/guidance, and remove the server dependency from native viewing.
- [x] Resolve the management interaction: the user selected native viewing only, retaining filters/grouping/progress and normal chat edits through `todowrite`; no agent-application workflow or fabricated CRUD. Direct UI writes and priorities remain dependent on future host capabilities.
- [x] Verify native completed/running/streaming/error calls, clearing, duplicate/large-list fidelity, reactive snapshots, revert, stale refresh failures, lifecycle disposal, filters/progress and mouse Refresh. Full check: 415 passing tests and one opt-in skip; all four real-host smokes pass. Public documents are updated and the synthetic native-view capture is registered for Prepare Release.

### Current Host Compatibility Delivery

- [x] Upgrade the local Homebrew hosts to stable OpenCode 1.19.3 and 2.1.0, verify all four executable names and interactive launch routing, and preserve the pinned Navigator installation and all 14 recorded configuration/preference/launcher paths.
- [x] Establish the pre-migration baseline on OpenCode 1.19.3 and the 2.0.21 regression reference, and reproduce the original 2.1.0 Settings failure after successful plugin setup; the migration and verification below resolve that failure.
- [x] Audit the published 1.19.3 TUI surface and the 2.1.0 SDK/runtime contracts, and record an ordered implementation plan and progress tracker under ignored `vibe/`.
- [x] Complete the explicit OpenCode 2.0.21-to-2.1.0 plugin API inventory and isolate the Settings failure: OpenTUI 0.6.6 paint hooks cannot sample the destination frame. Resolve selection backdrops from presentation ancestors and use scoped framebuffer access in pixel tests.
- [x] Align SDKs with OpenCode 1.19.3/2.1.0 and OpenTUI 0.6.6, retain the separate Effect families, and verify target-runtime snapshot migration, legacy-installer compatibility, cached-target validation, and a real packed installation.
- [x] Verify keymaps, dialogs, slots, model/variant controls, and source-preserving updates on both host lines; reject cross-major host updates and retain the 1.18.30 minimum and 2.0.21 reference.
- [x] Map public execution events to immediate Subagent status, handle external credential references explicitly, and verify native Todo, the read-only legacy archive RPC, independent native quota HTTP hooks, account-switch invalidation, and reset-credit guards with version-faithful fixtures.
- [x] Replace the shortcut toast with an icon-led hint, highlighted keys, navigation/update groups, a separate Escape row, Text/no-corner fallback, and responsive layout; preserve prompt focus and share its action inventory with keyboard help, including keyboard scrolling.
- [x] Pass the required four-host local and GitHub CI matrix, the full check pipeline, and font verification. Prepare Release run 39803593194 generated and byte-verified all 62 scenes, including shortcuts, native Todo, and toolbar states; screenshot PR #29 passed CI and merged before publication.

### Native-API-First Host Update: OpenCode 1.19.5 And 2.2.0

- [x] Identify the new stable targets and inspect their published contracts: 1.19.5 preserves the audited 1.19.4 TUI/SDK declarations; 2.2.0 keeps the published TUI context unchanged, requires OpenTUI 0.7.0, and adds the public Console/Go `client.usage.limits` source.
- [x] Update the SDK/runtime pins and Bun/Node verification environments, retaining a single host-owned Solid/OpenTUI runtime and safe pinned-snapshot failure behavior on unsupported Node versions.
- [x] Prefer public native session/Skill/MCP caches and typed events over duplicate snapshots and polling, preserve exact Skill IDs, and delegate keymap modes/priorities/targets to the host.
- [x] Add a direct public OpenCode Console/Go quota adapter with explicit workspace/model/budget scope; retain external provider sources only outside the host API's coverage and never fall through on authentication or request failures.
- [x] Record remaining fallbacks, missing capabilities and removal conditions in `HOST_API.md`; preserve shared cross-host preferences, nested dialogs, native read-only Todo, provider credit safeguards and existing visuals.
- [x] Support and document only OpenCode 1.19.5 and 2.2.0, with version-faithful fixtures and separate real-host smokes. Full check: 445 passing tests, one opt-in skip, 4,271 assertions; typecheck, lint, formatting, font check, package/installer checks and 354,723 / 360,000-byte main bundle pass.
- [x] Pin the two-target CI matrix and Docker toolchain, retain all 62 existing scenes, and register four tested synthetic native-usage scenes for Console budgets, Go allowance, sign-in guidance and request Retry.
- [x] Generate and byte-verify all 66 PNGs through Prepare Release 40663110695 and merge screenshot PR #31 after its exact-head CI 40666335595 passed. Visual review caught native millisecond reset timestamps being treated as seconds; the regression and corrected Console/Go captures now pass. Stabilize the icon-style test by waiting for cold lazy content rather than asserting an empty Suspense frame.
- [x] Publish v0.23.0 through Publish run 40667256515 after final main CI 40666974094 passed. Verify GitHub tag/release, npm `latest`, registry signatures and provenance, all 37 package files and matching archive integrity, plus a real isolated registry-snapshot installation. Preserve the local installation and private configuration.

## Product Direction

### v0.25.0 Release

- [ ] Publish native Todo enablement and current onboarding after the 96-scene manual Prepare Release run, screenshot PR CI/merge and final release-head checks. Verify npm payload, provenance, GitHub notes and isolated registry installation before completion.

### Native Todo Enablement And TypeScript 7

- [x] Detect native Todo configuration independently of task count and offer mouse/keyboard enablement when disabled. Choose an existing discovered server config, preview and confirm a focused JSONC-preserving edit; retain native viewing, chat-owned edits, retry and stale-target guards. Read selected files through their server-side parent location, and expose the native action in the host palette's global mode.
- [x] Keep the published Solid Oxlint/Oxfmt presets, update compatible libraries including OpenTUI 0.8.1, and use only stable TypeScript 7.0.2 throughout the graph. After explicit user approval, replace supported legacy checks natively and list the unmatched SonarJS checks in LINT_COVERAGE.md; no TS6 compatibility copy remains.
- [x] Refresh all seven wizard slides for Todo setup, account allowances, private multi-icon/text pins, About/changelog/Bug reports and actual host permissions/LSP capabilities. Keep headings/navigation visible and scroll long content and section choices in short terminals. Defer the wizard content without changing its public facade.
- [x] Verify effective-source precedence, comments/BOM/CRLF preservation, stale previews, keyboard/mouse, short terminals and both real hosts. Full check: 520 passing tests, one opt-in skip, 4,923 assertions; main bundle 348,055 / 360,000 bytes. Real 2.x smoke verifies Cancel byte equality and confirmed host config/readback; typing probes retain zero row replacements.
- [ ] Generate the newly registered 96-scene capture set (83 existing PNGs plus 13 Todo/wizard scenes) through the next separately requested Prepare Release workflow.

### v0.24.0 Release

- [x] Publish v0.24.0 with About, toolbar, stability and latest-host changes. Prepare Release 41185659301 byte-verified 83 captures; screenshot PR #33 passed exact-head CI and merged. Release-head CI 41187988295 and Publish 41188102592 succeeded. GitHub notes and shipped changelog were reviewed; npm latest is 0.24.0, all 40 payload files and archive SHA-512 match, registry signatures/provenance are present, and the real isolated registry-snapshot installation passes.

### Latest Hosts And Dependencies

- [x] Update local Homebrew OpenCode to 1.19.5/2.2.5 while preserving all four launcher names, host routing, client configuration and the pinned Navigator snapshot. All 16 configuration/snapshot/launcher fingerprints are unchanged.
- [x] Update SDK/runtime/tooling dependencies to current compatible stable releases and refresh transitive dependencies within upstream ranges. Published 2.2.5 TUI declarations match 2.2.0; OpenTUI 0.8 passes renderer and host checks. Remove the retired Copilot client option; retain documented TypeScript 6 compiler-API and tree-sitter exact-peer pins.
- [x] Verify both latest real hosts and typing stability: 495 tests pass, one opt-in skip, 4,741 assertions; full check, frozen install and both Homebrew-host smokes pass. Typing probes preserve row identity on both hosts. Main bundle stays at 359,769 / 360,000 bytes; CI and current support documentation target 1.19.5/2.2.5.

### Typing Stability And About

- [x] Extend toolbar pins to zero-to-three ordered icons and optional text, including text-only controls. Preserve legacy/state choices and unsaved nested drafts; measure bounded widths for More/wrapping, reserve state widths, and keep rounded clipping and hints stable. Verify persistence, source guards and both real hosts, including text entry and saving.
- [x] Keep toolbar hints in the existing gap without changing layout; verify centered three-cell controls, mouse/focus transitions, wrapping/More, narrow layouts and empty-toolbar collapse in Nerd/Text modes.
- [x] Reproduce Quick Action row replacement during main-prompt typing on both real hosts, then key rows by command ID while retaining live labels/availability. The ten-character probe now observes zero replacements on both hosts; intermediate hover frames and row identity are covered.
- [x] Add Settings About with running versions, shared update status/checking and confirmed installation safeguards, last-check/restart guidance, and a versioned changelog independent of startup-note claims. Restore selection, scroll and draft through nested navigation, including narrow layouts.
- [x] Add editable Bug reports with authenticated `gh` sending and an independent browser issue form using the real Bug type. Cover argv/stdin safety, missing auth/CLI/type support, confirmation, partial/uncertain outcomes, explicit retry review, long-report clipboard fallback, and in-memory drafts without automatic private-context collection.
- [x] Pass full check after PR integration (495 tests, one opt-in skip; 4,741 assertions), font/syntax/privacy checks, and expanded real-host 1.19.5/2.2.0 smokes including About, changelog, safe report preview and multiline editing. Main bundle: 359,769 / 360,000 bytes. Load first-launch release-note content on demand and register 17 synthetic scenes on top of the existing 66.
- [x] Generate and byte-verify the expanded 83-scene gallery through manual Prepare Release run 41185659301. Screenshot PR #33 passed exact-head CI 41187729376 and merged; all 17 new images were visually reviewed. No local PNG capture or real GitHub issue creation was used.

### Presets And Layout

- [x] Start with an empty preset list and allow named layout presets to be saved, applied, updated, renamed, and deleted.
- [x] Preview layout visibility, expansion, and position changes before applying; show changed sections first and preserve the preset menu on Cancel/Escape.
- [x] Configure section ordering, per-section item limits with Show all / Show less, and compact or comfortable row density per scope.
- [x] Save layout defaults globally or for the current worktree using the unified persistence model.
- [x] Named MCP state presets support save, change previews, apply, update, rename, delete, per-server progress, and partial-failure retry.
- [x] Keep previews live, distinguish skipped/unchanged servers, block applying during refresh failures or mutations, and guard against stale scopes and deleted presets.
- [x] Lift preset previews toward the top of the terminal and add icon-led summaries, semantic status labels, and stronger row grouping.
- [x] Add `Connect all` and `Disconnect all` with per-server progress, partial-failure reporting, and failed-only retry.
- [x] Optionally link one layout preset and one MCP preset as a workspace profile with one combined manual preview and Apply action.

### Section Improvements

- [x] Todo: All / Active / Finished filters, status grouping, separate cancelled tasks, and status counts.
- [x] Give the active Todo filter the same persistent rounded highlight, accent color, and bold treatment as an active Settings tab.
- [x] Remove the redundant radio-circle marker from the active Todo filter tab.
- [x] Unify Todo, Subagents, Search Everything, and Settings tab styling through shared atomic tab components without radio markers and with muted non-bold counters.
- [x] Generalize the shared selection menu and guarded confirmation under neutral names and types, keeping old preset names as compatibility aliases.
- [x] Separate adjacent sidebar sections with dividers that are more muted than the title divider instead of section-wide background containers.
- [x] Preserve the effective section order when Settings changes visibility in Global or Current worktree scope.
- [x] Lift the Quick Actions configuration dialog toward the upper part of the terminal.
- [x] Remove the status icon from the sidebar title and show the current session's creation date below it in muted text.
- [x] Subagents: observed runtime with pre-observation clock markers, retry countdown, in-memory recent runs, failure attention, text/status filters, query-aware tabs that hide empty errors and disable empty active/recent views, and parent-session navigation.
- [x] Skills: user-wide favorites, recent items, source details, fuzzy keyboard selection through Search Everything, and trusted-skill confirmation management.
- [x] Group Skills by user-wide private source-location assignments with Favorites, named groups, and Ungrouped in the sidebar; manage groups in Settings and search their names without changing skill activation.
- [x] Assign every discovered local Skill source location to a purpose-based user-wide Navigator group while preserving unrelated private preferences.
- [x] Preserve the user's local Skill-group assignments across sessions, including existing instances saving unrelated preferences.
- [x] Replace Skill star/info row actions with the MCP-style bookmark control and expose the same bookmark in the Skill confirmation dialog.
- [x] Quick Actions: keep scoped ordering and visibility, add user-wide bookmarks with favorites first in configured order, remove usage-based ordering, retain independent hiding for every action, and preserve the explicit argument-free host-command allowlist including the global auto-approve toggle and route-aware disabled reasons.
- [x] Keep full Quick Action names readable in narrow sidebars by moving unavailable reasons below the label and hiding shortcuts that would force the label to truncate.
- [x] Refresh the auto-approve Quick Action label reactively in the sidebar and Search Everything after `permission.mode` changes.
- [x] Make the OpenCode 2.x Permissions Quick Action open the host Settings dialog, where the user changes `prompt`/`autoaccept`; retain OpenCode 1.x's direct auto-approve toggle.
- [x] Remember the OpenCode 1.x auto-approve mode globally for new sessions, keep its Behavior control and host Quick Action in sync, and use the host-owned OpenCode 2.x Session → Permissions default.
- [x] Add `Ctrl+,` as the direct Navigator Settings shortcut and separate bookmarked Quick Actions from the remaining visible actions.
- [~] LSP: icons/text badges, error-first sorting, and in-place server-label toggling exist; diagnostic-specific actions depend on public API support.
- [x] Recheck the OpenCode 1.x and 2.x public LSP surfaces: status is supported, while restart and diagnostic counts remain API-dependent candidates.
- [x] Remove the LSP root/status details modal because the host may report an empty root.
- [x] MCP: filtering, pending rows, dedicated full-error details, individual/bulk connect/disconnect, retry, user-wide favorites, and user-wide custom groups with absent-server retention.
- [x] Toggle all eligible servers in a sidebar MCP group from its heading with keyboard/mouse support, full-bucket semantics under filters/limits, and existing bulk retry feedback.
- [x] Replace MCP group Connect/Disconnect labels with a full-bucket server-style status indicator, including connected, disconnected, failed, and pending states.
- [x] Indent grouped Todo, Subagent, MCP, and Skill rows, reveal unselected favorite bookmarks on hover/focus while keeping favorites visible, and align MCP server indicators with their group headings across row states and narrow sidebars.
- [x] Compose sidebar list rows with a page-level context for shared API, interaction, and grouping rather than drilling these through row props; centralize repeated bookmark behavior without moving domain state into shared UI.
- [x] Consolidate the local installation's private MCP groups and remove retired integrations from active host configuration, shell commands, installed runtimes, and private state while preserving source projects.
- [x] Let MCP group assignment select an existing group or create a new one.
- [x] Add a single-row gap between adjacent MCP groups in the sidebar.
- [x] Add consistent single-row spacing above and below every sidebar section filter.
- [x] Introduce first-run capabilities in six focused slides, then configure visible sections on the seventh and final slide.
- [x] Keep nested icon controls centered in three cells and use a footprint-compatible dotted pending indicator.
- [x] Show OpenCode and Navigator versions in the OpenCode 1.x sidebar footer with independent update indicators while preserving the path and branch line.
- [x] Show OpenCode and Navigator version/update states with the settings control in the OpenCode 2.x footer without replacing host-owned path/title content.
- [x] Make both footer update indicators confirm and perform updates through the current installation method and scope.
- [x] Make each available version's entire label, number, and update icon open its own confirmation dialog.
- [x] Replace the tiny update arrow with a prominent filled-circle Nerd Font indicator and an ASCII fallback.
- [x] Add an optional scoped Behavior setting to open new sessions directly in chat with the sidebar on startup and via New session, preserving Home navigation and onboarding.
- [x] Add independent scoped title and creation-date visibility switches in OpenCode 1.x Settings → Sections, keeping unsupported OpenCode 2.x switches out of the UI.

### Agents And Limits

- [x] Quiet the unfilled Limits scale segment to the sidebar-divider tone while retaining the filled segment, readable details, theme adaptation, and both text/icon modes; full checks and both host smokes pass, and screenshot PR #26 passed CI and merged with all 47 captures reproducible.
- [x] Remove the vertical guide and its gutter from Limits in both icon modes following the updated design choice, while retaining full-width thin scales, reset-left/value-right details, and one blank row between windows; full checks and both reference host smokes pass, and screenshot PR #25 passed CI and merged with all 47 captures reproducible.
- [x] Refresh and verify the hybrid Limits screenshot scenes through Prepare Release before publishing the redesigned layout; screenshot PR #24 passed CI and merged with all 47 captures reproducible, including Nerd Font and Text fallback layouts.
- [x] Add a scoped Limits refresh interval with a five-minute default and one-minute minimum, and verify immediate prompt-model switching on the supported OpenCode 2 API without extra polling from unrelated preferences or provider observations; full checks and both reference host smokes pass.
- [x] Generate and verify a deterministic Limits refresh-settings capture and refresh the gallery through Prepare Release before publishing the interval setting; screenshot PR #23 passed CI and merged with all 47 captures reproducible.
- Use OpenCode's existing agent/model display above the prompt; omit a duplicate sidebar overview.
- [~] Define independent adapters for OpenCode, stable provider quota APIs, and machine-readable external agent CLIs: host-selected model adapters and the documented Codex app-server source are implemented; other providers remain API-dependent.
- [x] Preserve provider-native units and reset windows while showing freshness, unsupported, authentication, stale, and rate-limited states.
- [x] Never read undocumented credential files or store provider credentials in sidebar preferences or logs.
- [x] Display Codex banked reset credits with available count and expiry, and support confirmed manual redemption through the official app-server RPC with account, eligibility, and idempotency guards; keep unsupported providers read-only.
- [x] Show only documented quota buckets for the current host-selected provider/model, updating on model/session changes; use CodexBar for provider discovery without adopting credential-file, browser-cookie, or private-endpoint access.
- [x] Show Limits as its own default-visible, default-expanded first sidebar section immediately below the session title, with Global/Worktree visibility and ordering controls like other sections.
- [x] Require account-bound Codex quota reads and reset actions, close stale confirmations, and preserve one unresolved reset attempt across restarts for same-key reconciliation.
- [x] Reuse public host integration/account metadata for automatic identity matching where supported; otherwise confirm a connection/provider binding once across models and migrate legacy model-specific bindings without crossing account boundaries.
- [x] Add a broad audited provider inventory and documented native quota/balance adapters beyond Codex through the OpenCode 2 server plugin; distinguish subscription windows, observed API rate limits, configured capacities, and balances, and expose explicit capability guidance for unverified or API-dependent sources.
- [x] Fix ordinary Codex account quotas being hidden when `normalModelSlug` is null; distinguish account scope from model-specific buckets and verify the real app-server response against the built artifact plus rendering regressions and both host smokes.
- [x] Distill Limits into a clickable provider/model and dot-separated variant row, remaining-progress/reset-time rows, and header Refresh/Banked Resets controls without a counter or Provider sources action; verify mouse/keyboard interaction, colors, confirmations, the full check pipeline, and OpenCode 1.18.30/2.0.21 smokes.
- [x] Replace block quota meters with adaptive full-width thin lines, remove technical account/window-duration suffixes from reset rows, and verify clipping inside narrow, padded sidebar containers and after resize.
- [x] Regenerate and verify the adaptive thin-line quota captures through Prepare Release; screenshot PR #21 passed CI and merged with all 46 captures reproducible.
- [x] Refresh the compact Limits captures and remove the obsolete Provider sources PNG through Prepare Release; screenshot PR #20 passed CI and merged with all 46 captures reproducible.
- [x] Resolve the previous 2.0.22/2.1.0 Settings-smoke follow-up through the native-paint API migration; Settings, Search, shortcut mode, and New session pass on 1.18.30, 1.19.3, 2.0.21, and 2.1.0. The remaining publication gates are tracked above.
- [x] Refresh the Codex account-quota captures through Prepare Release before publishing the nullable-model-metadata fix; screenshot PR #19 passed CI and merged with all 47 captures reproducible and ordinary account buckets instead of fabricated matching model slugs.
- [x] Generate and verify the new Provider sources screenshot plus updated account-binding captures through Prepare Release; screenshot PR #18 passed CI and merged with all 47 captures reproducible.
- [ ] Extend native-balance and configured-capacity screenshot scenes when the harness supports the OpenCode 2 server path.

### Unified Search

- [x] Search Skills, Subagents, MCP servers, and Quick Actions in a tabbed Search Everything modal with a configurable shortcut and consistent section icons.
- [x] Keep the four built-in providers, fuzzy matching, category tabs, keyboard/mouse activation, and cached-source retries without persistent history or configurable/custom providers.

### Profiles And Portability

- [x] Import and export the selected scope's layout and MCP settings as versioned JSON with validation and unsupported-field previews.
- [x] Add commit-safe project-local profiles after global/worktree persistence is stable.
- [x] Add an explicit CLI preview and save flow for named project layout/MCP profiles in `.opencode/navigator.json`, with workspace/file guards and no private preferences in the project file.
- [x] Document configured-default, global, worktree, and session precedence; project-local profiles remain configured defaults and are applied manually through the existing preset preview.

### Release Polish

- [x] Stabilize full-content measurement in synthetic screenshot fixtures so the host sidebar scrollbar cannot vary between repeated captures; all 46 captures reproduced in the v0.21.4 Prepare Release workflow.
- [x] Maintain current screenshots and a complete public gallery linked from the README.
- [x] Automate deterministic screenshot capture and merge through the manual pre-release GitHub Actions workflow instead of local agent runs.
- [x] Include `CHANGELOG.md` in npm packages and publish generated GitHub Release notes with upgrade guidance from v0.16.1 onward; earlier releases retain their GitHub Release notes.
- [x] Decouple both locally configured OpenCode hosts from the repository build by loading Navigator from a pinned local snapshot with its own dependencies and changelog.
- [x] Ignore project-local OpenCode TUI and CLI config files and stop tracking the old source-plugin override without removing the user's local file.
- [x] Stop tracking local `vibe/` plans and trackers, ignore the directory, and preserve existing local copies.
- [x] Let confirmed Navigator updates advance a recognized local pinned snapshot without changing its installation source or touching the running version.
- [~] Identify the reported Navigator update error if it recurs: the full published-package snapshot update and installed snapshot import checks pass, but the original message is unavailable and a specific cause has not been reproduced.
- [x] Remove release-number assertions across all tests and make optional live-update verification follow the published npm version rather than a fixed release.
- [x] Persist the prior installed Navigator version and show the intervening bundled changelog once after the first launch of an updated plugin.
- [x] Restrict changelog and GitHub Release highlights to user-facing changes and exclude technical screenshot pull requests from generated notes.
- [x] Cover every product capability with deterministic synthetic screenshots and keep `ARTICLE.md` independent of private `yandex-team` resources and data.
- [x] Prepare distinct English-language Habr and DEV Community articles plus the ignored private Atushka variant, completing five human-focused editorial passes for each.
- [x] Prepare eight deterministic Limits/account/reset-credit screenshot scenes, including Text fallback and a Nerd Font capture without the corner font, with a synthetic read-only Codex executable.
- [x] Generate and verify the eight new Limits PNGs and refresh the existing gallery through the manual Prepare Release workflow before the next publication.

## API-Dependent Candidates

Schedule these only after the required capability is available through a supported
public OpenCode TUI or stable authenticated provider API:

- Keep the sidebar session title and creation date fixed above scrolling sections in both hosts; requires a fixed-header slot in OpenCode 1.x and a fixed-title/date slot in OpenCode 2.x.
- Editing Todo status or priority.
- Restarting LSP servers or exposing diagnostic counters.
- Switching agents or models when no public TUI command is available.
- Following OpenCode 1.x prompt-model selection before message submission; the public TUI surface rechecked at 1.19.3 still exposes only the saved session model, so an immediate read requires a new public host accessor or event.
- Showing session or subagent token, context-window, and cost summaries.
- Reading provider quota data without a stable authenticated API.
- Showing recently changed files or workspace diagnostics.
- Preventing MCP servers remembered as disabled from connecting before TUI plugins initialize.

## Suggested Delivery Order

1. Keep the native-API-first OpenCode 1.19.5/2.2.5 support and verification current on both host lines.
2. Complete the remaining section improvements.
3. Add provider and CLI adapters only where stable supported quota APIs are available.
4. Finish performance, accessibility, bundle, and release polish for 1.0.

# Roadmap

## Compact Limits reference follow-up

- [~] Release the verified compact Limits/reset-time delivery as 0.27.6 through source PR, mandatory CI and Prepare Release/screenshot PR gates; verify publication and update only the discovered Navigator GUI/TUI sources under the user's 2026-11-13 authorization.

- [x] Apply the selected paired-scale reference in Desktop and TUI: quota icon/window name and value above adjacent quota/blue-period scales, one reset-time row and period percentage below, then real provider credit balances. Preserve native units, unknown/invalid date guidance, pace thresholds, Banked Resets and existing controls. Complete check passes with 650 primary tests, one existing opt-in skip and 115 GUI tests; both real TUI hosts and normal/quota packaged Desktop modes pass. No local captures or installation updates.
- [x] Remove duplicated reset text and make the single swap-icon reset row toggle relative/absolute time with mouse-up and Enter in TUI and the native Desktop button's click/Enter/Space behavior. Preserve state and row identity through snapshot refreshes, explicit missing/invalid dates, and no extra provider reads. TUI tests and the packaged Desktop quota fixture verify read counts remain unchanged when toggling.

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

## Required pull-request CI

- [x] Implement the selected second README badge variant without an npm-version badge, plus real unit coverage and a linked light/dark Star History chart at the bottom. Verify public SVG sources and compatibility against package metadata. Measure separate primary/GUI LCOV reports and their unique source-line union: 22,652/25,084 loaded source lines (90.30%) locally. Pass complete check and coverage runs (627 primary tests, one opt-in skip, 114 GUI tests), plus parser/summary/workflow regressions. Retain CI artifacts/job summaries and isolate OIDC upload to trusted main pushes, preserving all seven required CI contexts and read-only PR/review jobs. No commit, remote upload, publication or installation update.
- [x] Apply the user's CI-only coverage choice after Codecov rejected the first main upload with Repository not found. Remove the external job/configuration and percentage badge; retain separate LCOV reports, their unique source-line summary and GitHub artifacts without new permissions, comments or required gates. Verified through PR #47 and final main CI 43287212063.
- [x] Isolate the packaged Desktop test process from its live host update feed to prevent downloaded-update chrome from racing deterministic release captures. Preserve the real host UI and exact PNG comparison. Both packaged smokes and Prepare Release 43257713025 passed, and screenshot PR #48 passed all required checks and merged; no local captures.

- [ ] Design and implement Code Mode visibility and activity with configurable MCP-inline/separate-section placement and explicit per-server Code Mode/Direct changes. Include browsable call parameters and results in both placements and TUI/Desktop, distinguishing execute payloads from publicly observed nested tool payloads and marking missing data explicitly. The user selected both placement modes and switching; design discovery confirms the configuration flag and execute lifecycle fields, but nested-call telemetry and effective per-server routing still require a public-contract probe. Keep this design separate from implementation authorization.

- [x] Audit the three public GitHub forks and every exposed branch against upstream 532139f. Compare unique behavior with current source and prior adapted commits: PR #27 and #32 are already covered; PR #36 remains the new token-sharing/native-confirmation candidate. Rerun 37 relevant upstream regressions successfully. Keep comparison evidence and adoption suggestions under ignored vibe/; no fork changes applied.

- [x] Enable native auto-merge for Prepare Release screenshot PRs before waiting for CI, retaining owner approval, exact-head guards and all mandatory checks. Submitted PR reviews run the complete read-only CI suite on the PR merge ref without review-state skips. Verify five workflow regressions and the full check pipeline; observe the live bot-PR approval-to-merge path during the next Prepare Release.

- [x] Activate sole-owner CODEOWNERS and separate review ruleset 27109858 with the user-selected @St1ggy-only PR review bypass; all seven CI checks remain mandatory without bypass. Verify both effective rulesets and error-free CODEOWNERS on main after PR #42 merges. The native exception depends on the merger, not the author; preserve existing review statuses.
- [x] Split the verified UI and governance work into five thematic commits, merge release PR #42 and publish v0.27.4 at e4ad981 after Prepare Release 43206854581, owner-approved screenshot PR #44 and all seven exact-head CI jobs in 43215014303 pass. Publish 43215561633 succeeds; verify npm latest, all 44 payload files, archive hashes, two registry signatures and provenance claims matching the commit/tag/workflow/run. Installed Navigator, OpenCode, themes and private configuration remain unchanged.

- [x] Enable and independently verify active main-branch ruleset 27108667 requiring all seven existing CI contexts from GitHub Actions (app 15368), an up-to-date base and no bypass actors, including the administrator. Confirm the effective main-branch rule through the API. Preserve workflows, permissions and review statuses; no mandatory approvals, commit, push or publication of the pending local UI work.

## Local reset progress, native MCP switches and tabbed Desktop Settings follow-up

- [x] Publish 0.27.5 through six thematic source commits, PR #46, CI-only follow-up #47, Prepare Release 43257713025 and merged screenshot PR #48. Final main CI and Publish 43287761364 passed. Verify registry signatures, provenance and all 46 published files against the release build. Re-detect and advance only the existing local Navigator GUI/TUI/server pins from 0.27.3 to 0.27.5, preserving unrelated bytes and the TUI symlink; verify the host-managed package cache against the published hashes. Preserve OpenCode versions and themes. The user's later clarification permits agent-submitted approval for verified screenshot-bot PRs; ordinary contributor review remains required.

- [x] Simplify Banked Resets into separated icon-led credit cards in Desktop and TUI, with compact expiry and deferred provider details. Verify 604 primary tests (one opt-in skip), 96 GUI tests, typecheck/lint/format/budgets, both real TUI hosts and packaged Desktop normal/quota. Cover narrow keyboard navigation, three icon/corner modes, card geometry/disclosure, independent confirmation and same-key reconciliation. Update only synthetic CI capture fixtures; no local captures, release or installation update.
- [x] Unify About update checks, installation and restart guidance into one stable TUI/Desktop action slot. Fix the reproduced historical server-ID mismatch and exact-pin false-current case; preserve package source/scope, JSONC/options, confirmation, stale-target guards, retries and real progress. Verify 615 primary tests (one opt-in skip), 100 GUI tests, complete check, both real TUI hosts and packaged Desktop normal/quota. Keep the unminified TUI at 359,979/360,000 bytes; document the GUI-only 610,000-byte allowance for its measured 605,578 bytes. Installed clients remain unchanged; no publication or local captures.
- [x] Add distinct native Desktop sidebar section icons beside readable titles, independent of disclosure chevrons. Verify the complete icon map, consistent geometry and expanded/collapsed behavior in the packaged panel and Float; pass the complete check (615 primary tests, one opt-in skip, 101 GUI tests) and Desktop smoke. Preserve TUI icons and its 360,000-byte budget; GUI measures 606,250/610,000 bytes. No installation, publication or local captures.
- [x] Implement the user's two-scale Limits reference in TUI/Desktop: quota remaining and blue period remaining, with normal/yellow/orange/red quota pace at 0/15/30 percentage-point deficits. Use supplied duration/reset timestamps only, a local presentation clock without extra quota polling and explicit unknown/elapsed states. Preserve native credit balances and show a separate Banked Resets count, including count-only summaries. Verify 617 primary tests (one opt-in skip), 114 GUI tests, complete check, both real TUI hosts and packaged Desktop normal/quota, including all four pace colors and guarded credit reconciliation. TUI measures 358,666/360,000 bytes after pruning unused generated external import aliases without renaming/minifying; GUI measures 611,701/620,000 bytes under its separately documented allowance. No installation, publication or local captures.

- [x] Add TUI banked-reset expiry progress using the shared lifetime model, with remaining time, explicit missing/invalid-date states and unchanged guarded credit actions. Verify both icon modes and non-consuming inspection with rendering tests and both supported TUI host smokes.
- [x] Replace GUI MCP connection toggles with native Switch controls in sidebar groups/rows and Search Everything. Verify individual/mixed-group state, pending disablement, full hidden buckets, separate error information and keyboard bookmarks in the isolated Desktop presentation fixture.
- [x] Organize Desktop Settings into Layout, Behavior, Quick Actions, Skills, MCP, Presets and About categories using public native Buttons; the host's internal pill Tabs is not exported to plugins. Preserve scope, lazy-mounted drafts and search targets. Verify all category widths, focused-button arrow navigation, presets/import/back/cancel/apply, groups, trust and resets in the packaged Desktop host.
- [x] Before release authorization, verify the local tree with bun run check (589 primary tests, one opt-in skip, 87 GUI tests), both supported TUI host smokes and packaged Desktop normal/quota smokes. Native Settings and MCP assertions, reset cancellation and same-key reconciliation pass. Keep synthetic capture fixtures ready for manual CI without local screenshots; that local-only phase did not commit, push, publish or update installed plugins/hosts.
- [x] Review GitHub PR #36 read-only at head abb824b after implementation; report findings, risks and possible fixes in chat only. Keep the PR, comments and every review status unchanged; store isolated reproduction evidence under ignored vibe/.
- [x] Repeat the read-only review of PR #36 at 22ef3e7 after its external-confirmation fix. Inspect the full base-to-head diff and rerun 49 confirmation/account/provider render regressions successfully. The previous external-dialog replacement case now passes; no new actionable findings. Real-host reproduction was not rerun; no PR comments or review statuses changed.

## Desktop layout, drag ordering and inline update progress follow-up

- [x] Keep the Desktop session title readable on a separate full-width row in panel and Float. Replace familiar actions with native icon buttons and tooltips while retaining accessible names, private pins and descriptive labels for ambiguous operations. Verify long-title geometry and native controls/tooltips in both real Desktop placements, alongside drag/resize/theme behavior.
- [x] Refresh the header/action and compact Limits screenshots through Prepare Release 43101163452. All 31 Desktop scenes and the terminal gallery passed byte-reproducibility checks; screenshot PR #41 passed CI and merged as c357fbd. Review generated panel/Float title and compact quota captures without local captures; perform the separately authorized local update only after package verification.
- [x] Publish v0.27.3 after Prepare Release 43101163452, merged screenshot PR #41 and exact-head CI 43112878617. Publish 43167715019 succeeded for adc4927; npm latest, all 44 payload files, registry signatures and matching provenance were verified. Update the discovered global TUI/GUI npm pins to 0.27.3 only after verification. Native plugin inventory reports 0.27.3 and all 44 cached package files match the registry; preserve the existing TUI configuration symlink, all unrelated configuration bytes, themes, host versions and the unused older snapshot.

- [x] Remove explanatory account/model quota-scope prose from successful Desktop Limits; retain only the updated-at timestamp, quiet TUI data and all actionable status guidance. Verify unit regressions, the real Desktop quota fixture and both TUI hosts without changing account scope, refresh or credit safeguards.

- [ ] API-blocked: integrate Todo search and filter tabs into the native Todo popover when the host exposes a supported extension point. Desktop 2.2.6 exports composer pills beside native Todo, not an extension inside its popover; retain Navigator filtering meanwhile.

- [x] Align Desktop Todo status icons, colors and spacing with audited native Todo source; strike through and mute completed/cancelled content while retaining read-only status semantics. Cover all four presentation states with unit assertions.
- [x] Audit Desktop presentation against public host UI-kit equivalents. Use native actions, form controls, dialogs, icons and loading indicators where supported; document the narrow multiline, disclosure, selection, bookmark, sortable and progress API gaps without losing accessibility.
- [x] Remove duplicate Desktop sidebar model/effort selectors while preserving reactive quota targeting and TUI controls. Verify the absence in the packaged quota fixture and stable native disclosure geometry in both states.
- [x] Reproduce Settings overflow and squeezed labels, then verify bounded controls and readable labels at 1280/1040/800px with long synthetic content. Preserve native controls and compact group creation with explicit Save/Cancel.
- [x] Replace visible GUI reorder buttons with shared accessible drag ordering for sections, Quick Actions, toolbar pins and draft icons. Verify pointer/keyboard pickup/drop, Escape, stale scopes and stable identity; packaged Desktop section and toolbar interactions pass.
- [x] Add truthful inline TUI/Desktop update progress with finite real-byte percentage validation, native main IPC state and opt-in snapshot stages. Synthetic installer/error tests preserve safeguards; no actual local update is performed.
- [x] Verify unit/render regressions, both real TUI hosts and packaged Desktop normal/quota smokes sequentially without local captures, installation changes or publication. Extend long-content and interaction fixtures for the manual CI harness.
- [x] Add production Todo-row and update-stage synthetic capture scenes. Prepare Release 43069114630 generated and byte-verified the terminal gallery and 31 Desktop scenes; screenshot PR #40 passed CI and merged as 42b20f6. Review the generated task/progress, toolbar and quota captures without local screenshot generation.
- [x] Publish v0.27.2 after exact-head CI 43076680474 and Publish 43077121631 succeeded. GitHub release/tag targets bf8c96f and npm latest is 0.27.2. Verify all 44 payload files, archive SHA-512 and CI SHA-1, two registry signatures with an unexpired key, and provenance matching the repository, commit, tag and workflow. Local Navigator/OpenCode installations, configuration and themes remain unchanged.

## Desktop native controls, credit expiry and Float follow-up

- [x] Replace remaining GUI form checkbox/select controls with public host Switch/Select, retain native buttons/inputs and remove duplicate Settings-row switch labels. Document focused multiline/disclosure/bookmark/progress API gaps and use host theme tokens for fallbacks; real-host assertions verify native form controls.
- [x] Add banked-reset expiry progress and remaining time using real provider timestamps, including missing and expired date states without assuming that absent expiry means a credit never expires. Verify lifetime fractions, minute/day boundaries, invalid dates, disabled expired review and the original confirmed/idempotent consumption flow.
- [x] Reproduce and fix Float pointer dragging and host-theme inheritance in the isolated packaged Desktop host. Verify real Move/title pointer drags, light/dark theme transitions and existing keyboard/modal/Home/viewport behavior; preserve shared runtime state.
- [x] Pass the full check pipeline (572 primary tests and 80 GUI tests, typecheck, lint, formatting and bundle budgets) and packaged Desktop normal/quota smokes. Extend manual-CI fixtures with dark Float and detailed-credit expiry scenes without local captures.
- [x] Publish v0.27.1 after Prepare Release 43016467039 byte-verified TUI and 29 GUI scenes, screenshot PR #39 passed CI and merged, and exact-head CI 43023080076 passed. GitHub release/tag targets 5915747; Publish 43023509835 succeeded and npm latest is 0.27.1. Verify all 44 payload files, archive SHA-512/CI SHA-1, an unexpired-key registry signature and provenance matching the archive, repository, commit, tag and workflow. Local plugin configuration and OpenCode hosts remain unchanged.

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

### Shared Models And Desktop GUI

- [x] Publish v0.27.0 after thematic source commits, Prepare Release 42982104267, merged screenshot PR #38 and exact-head CI 42988323563. Publish 42988780608 succeeded; GitHub release/tag targets c685c78. Verify all 44 registry payload files, SHA-512/CI SHA-1, two registry signatures and provenance for that commit. Re-detect the actual npm-based local installation, update only Navigator references to 0.27.0 in server/TUI configurations and verify the installed cache against the registry archive. Preserve host versions, themes, options and unrelated configuration byte-for-byte; live client rendering still requires reopening the clients.
- [x] Verify the approved GUI/TUI contracts, baseline checks and capability matrix; preserve the staged v0.26.0 publication record and private local configuration. Published plugin 2.2.6 changes GUI declarations only. Baseline: 540 passing tests, one opt-in skip, 5,046 assertions, both real-host smokes and font check passing; main bundle 349,521 / 360,000 bytes. Dependency security advisories remain separately recorded.
- [x] Update compatible dependencies to OpenCode 2.2.6, OpenTUI 0.8.3 and Copilot SDK 1.0.30 while retaining the complete TS6 lint stack and exact runtime peer contracts. Full check: 540 passing tests, one opt-in skip, 5,046 assertions, 349,521-byte main bundle; real TUI 1.19.5 and isolated 2.2.6 smokes, font, frozen install and peer graph pass. Refresh transitive dependencies within upstream ranges. Copilot now uses patched Zod; upstream-constrained advisories elsewhere remain explicit.
- [x] Introduce narrow headless source/storage/command/lifecycle contracts, normalized server-aware identities and negative transitive-dependency/FSD checks. Native source contract regressions and normalized Todo/Subagent projections pass; full check reaches 550 passing tests, one opt-in skip and 5,119 assertions, with both supported real-host smokes passing. Existing controllers still migrate in the next stage; headless public entries do not imply the GUI is implemented.
- [x] Migrate Skill/MCP/Todo/Subagent/preferences controllers and Search, bug-report and reset-credit use cases to headless public entries with TUI adapters and compatibility facades. Extract the unchanged preferences reducer from filesystem storage and separate preset actions/defaults without duplicating state. Verify 557 passing tests, one opt-in skip, 5,286 assertions and both supported real TUI hosts; main bundle is 351,911 bytes of 360,000. Concurrent monitoring consumers retain their requests until the final lease closes. Desktop presentation is not implemented by this stage.
- [x] Add the official single-file GUI build, experimental package export and independent GUI JSX/test pipelines. Eight GUI contract/build tests and the full TUI check pass; a packed npm-style candidate loads both main and renderer in the checksum-verified official Desktop 2.2.6 Linux ARM64 package under Xvfb. The version command executes in the real host. No local windows, screenshots or user-installation changes are involved; full GUI content remains in subsequent stages.
- [x] Add server/session/location/visit-aware GUI access and native Skill/MCP/Todo/Subagent sources that re-read the selected server's live client/cache, preserve offline cache reads and reject stale reconnect results. Share native catalog/pagination/projection adapters with TUI rather than constructing a legacy API. Add namespaced schema-validated Desktop preferences IPC over the existing document/lock, bounded requests and explicit flush/load, with no mirrored native preferences store. Verify 557 TUI and 26 GUI tests, both real TUI hosts and packaged Desktop main/renderer/IPC; TUI bundle is 352,876 bytes. Feature-specific project-file, provider and reporting transports remain in their planned delivery stages.
- [x] Deliver Limits, native read-only Todo/archive and Subagent monitoring in a native panel and opt-in in-app floating mini-window over one leased runtime. Preserve shared filters and DOM scroll through placement changes; support keyboard move/resize/reset/redock, viewport clamping, native-modal yielding, narrow-screen native drawer access and Home hiding. Selected-server quota RPC and reactive pre-send model controls are connected; full account/credit/scheduling work remains in its provider stage. Verify 562 TUI and 32 browser-conditioned GUI tests, both real TUI hosts and a packaged Desktop interaction smoke including confirmed Todo enablement and preview cancellation; TUI bundle remains 352,876 bytes. No local screenshots or installation changes.
- [x] Deliver shared Search, exact-source Skill confirmation/trust, MCP groups/bulk/preset previews, capability-aware Quick Actions and private toolbar flows with native GUI presentation. Verify nested drafts/cancellation, text-only and multi-icon pins, measured More overflow, reorder/remove, empty collapse and stable hint geometry in the packaged Desktop. The final gate passes 566 TUI and 40 GUI tests, both real TUI hosts and Desktop interaction checks; TUI is 354,451 / 360,000 bytes. A native-only fixture reproduces Desktop 2.2.6's session-dialog/command-palette context failure without Navigator; document it in HOST_API and keep the probe separate from plugin-command checks through the public Commands API.
- [x] Reuse quota normalization, account linking, refresh scheduling and reset-attempt workflows behind typed Desktop-main transports. Reject local bindings for remote targets, revalidate session/connection identity, persist confirmed bindings before exposing them, and coalesce matching in-flight redemptions. Verify synthetic Desktop account-link cancellation/save, nullable account quotas, reset cancellation, uncertain results and same-key reconciliation with one synthetic redemption. Full checks pass 571 TUI and 52 GUI tests, both real TUI hosts and packaged Desktop; TUI remains 355,112 / 360,000 bytes. No real provider credentials or credits are used in tests.
- [x] Deliver native GUI Settings, scope-aware layout/behavior/catalog controls, guarded preset management, combined workspace previews, portable/project profiles, About/changelog, one-time startup notes, seven-slide onboarding and confirmed Bug reports without copying terminal-only controls. Verify 571 TUI and 71 GUI tests, both supported TUI hosts separately and packaged Desktop normal/quota flows; TUI is 355,948 / 360,000 bytes. Intermittent combined-run TUI toolbar readiness failures remain recorded rather than claimed fixed; GUI old-version startup selection is unit-tested, while real Desktop verifies fresh startup and persisted version tracking.
- [x] Complete headless/TUI/Desktop CI, packaged-install checks, accessibility and synthetic GUI screenshot workflow coverage; document verified capabilities and remaining gaps before release. Source CI 42982102826 passed all seven jobs.
  - [x] Implement CI headless and packaged Desktop normal/quota jobs, GUI-only accessibility rules, separate 600,000-byte GUI budget and public installation/capability documentation. Local verification passes 572 TUI and 73 GUI tests, both real TUI hosts in one run, packaged Desktop normal/quota, frozen install, peer graph, font and 45-file npm inventory checks. Bundles measure 355,948 TUI and 553,993 GUI bytes; upstream security advisories remain documented.
  - [x] Run and review the manual CI-only GUI capture/reproducibility workflow against the delivered sources. Prepare Release 42982104267 passed strict PNG reproducibility for TUI and all 27 GUI scenes; screenshot PR #38 passed CI and merged. Representative Desktop images were visually reviewed without local captures.
- [x] After the main delivery, refresh README with representative Search, mini-window and layout-preview screenshots from virtual-display CI captures; extend the gallery and article variants with Desktop examples. No local capture window was opened.
- [ ] After the main delivery, separately reproduce why Todo and Subagents are not displayed for the user; verify enablement, server/session/location, source loading and visibility before claiming a fix.
  - Read-only local checks after the 0.27.0 installation confirm `experimental.todo=true`, both saved section visibility flags enabled and no current-worktree layout override. Subagents is saved collapsed. The active client route/session and live rendering have not been reproduced; do not claim the release fixes the reported symptom.

### v0.26.0 Release

- [x] Publish v0.26.0 after thematic commits, Prepare Release 42204446365, reproducible screenshots, screenshot PR #37 with exact-head CI 42209026241, and release-head CI 42210429820. GitHub tag/release points to f59a62ac1563fff0eaeb68557087330c8988e0ae; Publish 42210763189 succeeded and npm latest is 0.26.0. Verify all 43 payload files, archive integrity, two registry signatures, provenance and an isolated registry-snapshot install/import. npm removes the repository-only FFI patch and patchedDependencies from the published package; consumer metadata remains upstream-owned. All 16 local installation/configuration/launcher fingerprints are preserved.

### Release Contract Audit: November 2026

- [x] Complete the risk-based project-wide follow-up audit, verify retry-listener cleanup and bounded preferences-lock recovery including foreign-owner preservation, and document architectural debt, dependency advisories and packaging limitations under ignored `vibe/`. Final check: 539 passing tests, one opt-in skip, 5,043 assertions; both supported hosts and packed runtime pass; main bundle 349,521 / 360,000 bytes. This is not an exhaustive line-by-line security audit.
- [x] Verify a metadata-only FFI compiler-peer patch with strict declarations, six unchanged upstream dist files, a clean frozen install and both supported hosts. The root npm compiler graph now passes; consumer/root-only limitations remain explicit. Remove the patch after an upstream fix.
- [ ] Address upstream-constrained security advisories in glob, minimatch, toml and zod when compatible parent releases are available; do not force incompatible transitive majors or misclassify the optional Copilot runtime as development-only.
- [ ] Bound update/install subprocess time and output with installation-appropriate cancellation, staged cleanup and fake-executable regressions. The audit identified this from source inspection; no production hang was reproduced.
- [ ] Split cohesive preferences/MCP/controller responsibilities behind existing public APIs and investigate the intermittent toolbar unavailable-pin toast assertion without weakening it.

- [x] Audit published stable releases and package contracts: OpenCode remains 1.19.5/2.2.5; OpenTUI 0.8.2 and linter-config 10.0.0 are available. Record the ordered implementation plan and evidence under ignored `vibe/` without changing installed hosts or runtime dependencies.
- [x] Replace deprecated OpenCode 2 client aliases for Skill invocation, MCP connection mutations and native usage with their published `client.experimental` equivalents; preserve exact source identity, location/account scope, cancellation and failure semantics.
- [x] Upgrade to linter-config 10.0.0 with its exact compatible Oxlint/Oxfmt engine versions. The user selected TypeScript 6 instead of extending the TS7-related coverage exclusions; restore the complete published preset, remove the compiler-compatibility projection, and adopt import sorting. Document the legacy TypeScript 5 peer declared by transitive bun-ffi-structs without hiding npm's diagnostic.
- [x] Update the aligned OpenTUI development packages to 0.8.2 and verify wrapped-text measurement, resize, short dialogs and fixed navigation without bundling or replacing the host runtime.
- [x] Use public OpenCode 2 execution start timestamps for exact active Subagent durations, retaining observed-history behavior and the 1.x fallback. Do not mistake the previous execution's idle timestamp/outcome for the active execution's result; preserve cancellation in recent history.
- [x] Complete local regressions, both supported real-host smokes and isolated packed-runtime verification. Full check: 535 passing tests, one opt-in skip, 5,032 assertions; main bundle 349,163 / 360,000 bytes. Font, formatting and public-content audits pass. Hosts and the installed Navigator snapshot are not updated by this work.
- [x] Run the manual screenshot reproducibility/visual-review and release CI gates after the explicit release request; publication is recorded under v0.26.0 above. Session panels, schedules and artifacts remain separate opt-in product proposals, not implicit compatibility work.

### v0.25.0 Release

- [x] Publish v0.25.0 with confirmed native Todo enablement and current onboarding. Prepare Release 41238652533 byte-verified 96 captures; screenshot PR #35 passed exact-head CI and merged, including the visually approved short-terminal fix. Release-head CI 41241621701 and Publish 41241771948 succeeded. GitHub notes include the previous-tag comparison and font upgrade guidance; npm latest is 0.25.0, all 43 payload files and archive SHA-512 match, registry signatures/provenance are present, and isolated registry installation passes.

### Native Todo Enablement And TypeScript 7

- [x] Detect native Todo configuration independently of task count and offer mouse/keyboard enablement when disabled. Choose an existing discovered server config, preview and confirm a focused JSONC-preserving edit; retain native viewing, chat-owned edits, retry and stale-target guards. Read selected files through their server-side parent location, and expose the native action in the host palette's global mode.
- [x] Keep the published Solid Oxlint/Oxfmt presets, update compatible libraries including OpenTUI 0.8.1, and use only stable TypeScript 7.0.2 throughout the graph. After explicit user approval, replace supported legacy checks natively and list the unmatched SonarJS checks in LINT_COVERAGE.md; no TS6 compatibility copy remains.
- [x] Refresh all seven wizard slides for Todo setup, account allowances, private multi-icon/text pins, About/changelog/Bug reports and actual host permissions/LSP capabilities. Keep headings/navigation visible and scroll long content and section choices in short terminals. Defer the wizard content without changing its public facade.
- [x] Verify effective-source precedence, comments/BOM/CRLF preservation, stale previews, keyboard/mouse, short terminals and both real hosts. Full check: 520 passing tests, one opt-in skip, 4,923 assertions; main bundle 348,055 / 360,000 bytes. Real 2.x smoke verifies Cancel byte equality and confirmed host config/readback; typing probes retain zero row replacements.
- [x] Generate and byte-verify all 96 captures through Prepare Release 41238652533; screenshot PR #35 passed exact-head CI 41241403870 and merged. Visual review approved the ten updated wizard views, including visible navigation in the 900-by-400 short-terminal capture. A live-renderer resize regression and capture-time viewport guards protect the corrected geometry. Full check: 522 passing tests, one opt-in skip, 4,934 assertions; both supported real-host smokes pass.

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

- [x] Recognize ChatGPT token-sharing OAuth connections for the existing Codex account-linking flow without treating client IDs as account identity. Verify explicit confirmation, cross-model reuse, secret-free metadata handling and connection-switch invalidation; full check passes with 525 tests and one opt-in skip, and both supported real-host smokes pass.
- [x] Reproduce and fix OpenCode 2 native confirmation handoff discarding Codex link confirmation after its wrapper unmounts; preserve nested navigation and reject superseded or disposed results. Verify actual wrapper replacement, confirmation/cancellation, connection-bound linking through the native bridge, 531 passing tests and both supported real-host smokes.
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

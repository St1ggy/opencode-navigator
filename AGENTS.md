# Project requirements

## Keep requirements persistent

- Record new user requirements and clarifications in this file during the task, not only in chat or a temporary todo list.
- Update an existing requirement when the user changes it; do not retain contradictory versions.
- Track feature work, deferred tasks, and completion in `ROADMAP.md`. Mark work complete only after implementation and verification.
- Preserve the current user changes and staged work. Commit, push, and release only when requested.

## Architecture: Feature-Sliced Design

- A full migration to the latest official FSD specification is required. Verify the current specification before planning the migration; the documentation checked on 2026-09-20 describes FSD v2.1 and its pages-first approach.
- Use layers, domain slices, purpose-based segments, and explicit public APIs. Respect the direction of dependencies between layers and the isolation of slices.
- Components must be as atomic as practical: one focused responsibility per component, with independently meaningful controls, rows, lists, and dialogs in separate modules.
- Keep new and refactored UI modules below roughly 120-150 lines whenever practical; split smaller focused rows, controls, lists, and dialog sections instead of growing multi-component files.
- Compose larger interfaces from small components. Keep business logic, persistence, requests, and SDK adaptation out of presentation components.
- Existing large modules, especially `src/components/sections.tsx` and multi-component dialog modules, are migration targets. Apply the atomic-component requirement to new code now.
- Extract reusable UI primitives and domain logic deliberately; do not turn Shared into a collection of unrelated application code.
- Generalize tabs and list rows through domain-agnostic presentation props such as leading icon, clickability, metadata, details, and trailing controls; keep Todo, Subagent, Skill, LSP, and MCP rules in their owning page/entity modules.
- Keep the session sidebar sections in the pages-first `src/pages/session-sidebar` slice with an explicit public API. Preserve `src/components/sections.tsx` as a compatibility re-export while existing bundles, tests, and external consumers depend on it.
- Keep sidebar composition, section shells/filters/tabs/visibility/boundaries, and sidebar interaction implementation inside `src/pages/session-sidebar`; the corresponding legacy component and root modules must remain re-export-only compatibility facades.
- Keep generic `Tab` and `SelectionBox` primitives in the `src/shared/ui` public API, and import shared primitives through that API from pages, dialogs, and features.
- Keep shared list-row and icon-control primitives domain-agnostic. They may accept presentation slots and event props but must not import sidebar interaction, controllers, preferences, SDK domain types, or business logic.
- Keep flat controller/model paths as re-export-only compatibility facades. Production pages and features must consume entity/shared public APIs, and entity slices must not import or deep-import other entity slices.
- Keep generic icons and dialog infrastructure in `src/shared/ui`, with legacy `src/icons`, `src/dialogs/context.tsx`, and generic `src/components` paths as re-export-only compatibility facades.
- Keep Search Everything, keyboard help, and the cohesive sidebar settings/onboarding/presets/Quick Actions flows in isolated feature slices with explicit public APIs. Keep Skill dialog presentation in the Skill entity.
- Keep plugin composition in `src/app` and preserve `src/tui.tsx` as an export-only compatibility entrypoint with the established default and named exports.

## Interaction and presentation

- Treat the currently selected theme values in `cli.json` and `tui.json` as user-confirmed. Do not normalize or change either theme unless explicitly requested.
- Keep mouse and keyboard behavior equivalent. Opening a dialog by mouse must use mouse-up and stop propagation so releasing the button cannot dismiss the newly opened dialog.
- Escape and Cancel in a nested dialog return to the previous screen with its state restored. Escape at the root closes the dialog.
- Use shared icon and dialog contexts. Keep preferences, request lifecycle, and interaction controllers consistent across views.
- Use Nerd Font icons with a readable text/ASCII fallback throughout the interface, including keyboard hints.
- Single-line highlighted elements use rounded ends. Multiline highlighted elements must also be rounded: use the Navigator corner font and inverse corner masks over a continuous background. Do not replace them with triangles, hollow frame corners, or rectangular highlights in Nerd Font mode.
- Allow users without the Navigator corner font to disable only multiline corner masks explicitly: keep Nerd Font icons and single-line rounded controls, but render multiline highlights as clean rectangles without missing-glyph placeholders.
- Clip long content to its content area so it cannot overwrite rounded corner cells.
- Standalone and nested icon controls use a centered three-cell shape with one cell for each rounded end and no additional inner padding.
- Nested controls (bookmarks, presets, settings) inherit the row background when idle and have their own contrasting hover/focus background and readable foreground.
- Focused filter fields must use a consistent contrasting palette for their icon, placeholder, entered text, clear control, and cursor. Synchronize their appearance with actual input focus and blur.
- Give every sidebar section filter a consistent single-row gap above and below the field.
- Keep the active Todo filter visually persistent like the active Settings tab: use a rounded highlighted background, accent foreground, and bold label independently of transient keyboard focus.
- Align high, medium, and low Todo priority indicators in the same fixed right-aligned cell slot.
- Do not prefix the active Todo filter tab with a radio-circle marker; the persistent tab highlight is the selected-state indicator.
- Use one shared visual treatment for every tab-like selector, including Todo, Subagents, Search Everything, and Settings: rounded selected background, accent foreground, bold label, and no radio-circle marker.
- Keep counters inside tabs visually muted and non-bold, including when the tab label is selected.
- When MCP states match a saved preset, show only the preset name in the section header; keep `Preset` only as the unmatched-state action label. Truncate long matched names at the end and preserve both rounded ends of the highlighted control.
- Align the sidebar settings control to the title's right edge and keep its gear centered in the shared three-cell icon-control shape without an extra outer gutter.
- Do not prefix the sidebar title with a status icon. Show the current session's creation date below the title in muted text.
- Keep the session title and creation date together above the sidebar's scrolling sections when the host exposes a supported fixed-header slot. OpenCode 1.x currently mounts `sidebar_title` inside the host scrollbox; OpenCode 2.x owns a fixed title but does not expose a slot beside it for the date. Do not move host renderables through unsupported internals to simulate a sticky header.
- Separate adjacent sidebar sections with a muted version of the subtle horizontal divider used below the sidebar title. Section dividers must be less prominent than the title divider. Do not place entire sections or their content on a contrasting background container.
- Divide the Skill details dialog into clearly labeled description, source, and confirmation blocks with visible separation between content and actions.
- Position the Quick Actions configuration dialog consistently toward the upper part of the terminal instead of vertically centering its tall action list.
- Make first-run onboarding a seven-slide, capability-first wizard: introduction, monitoring, Search and Skills, Quick Actions and LSP, MCP, customization, then section configuration on the final slide.
- Use a dotted circular Nerd Font glyph for pending/loading indicators so MCP pending state has the same footprint as its connected and disconnected radio indicators.
- Settings section toggles must update the effective sidebar layout immediately without changing section order or allowing stale worktree/session snapshots to mask the selected scope.
- Subagent tabs show muted non-bold counts using the same query-aware counting behavior as Todo tabs.
- Hide the Subagent Errors tab when its query-aware count is zero. Keep empty Active and Recent tabs visible but disabled for both mouse and keyboard navigation.
- Mark subagent durations that began before observation with the Nerd Font clock icon and a readable text-mode fallback instead of the greater-than-or-equal sign.
- Keep the Todo section visible under OpenCode 2.x. When the host exposes no supported Todo API, show that limitation explicitly instead of hiding the section or reconstructing tasks from unsupported internals.
- Preserve Navigator's established colors and compact spacing across OpenCode 1.x and 2.x adapters as closely as the public host slots and semantic theme tokens allow.
- In OpenCode 1.x, keep the path and branch footer line and render `OpenCode <version> | Navigator <version>` below it. Show a separate, visually prominent filled-circle update icon immediately after the OpenCode version when the host reports an OpenCode update and immediately after the Navigator version when npm reports a newer Navigator release; retain a readable ASCII fallback. Keep update checks quiet on failure. In OpenCode 2.x, preserve the host-owned path/title footer content and render both OpenCode and Navigator version/update states beside the settings control. When an update is available, clicking anywhere on that version's label, number, or update icon must request confirmation; the separator and the other version must not trigger it. Preserve the current installation method and scope, report completion or failure, and tell the user to restart OpenCode; local source installations must not be replaced with package installations.
- The configured sidebar shortcut (default `Ctrl+Shift+B`) opens a temporary shortcut mode instead of toggling immediately: `h` toggles sidebar visibility, while `t`, `a`, `s`, `q`, `l`, and `m` focus Todo, Subagents, Skills, Quick Actions, LSP, and MCP through the existing commands.
- Keep `Ctrl+,` as the direct Navigator Settings shortcut and show it in keyboard help.
- In sidebar keyboard navigation, Left/Right move among interactive controls on one visual row, while Up/Down and `j`/`k` move between visual rows. Tabs and nested row controls must use horizontal navigation.

## Search Everything and sections

- Search Everything has Skills, Subagents, MCP, and Actions tabs with a shared query and per-tab selection/scroll preservation.
- Keep Search Everything limited to its current four built-in providers. Do not add persistent search history or configurable/custom result providers.
- Keep Quick Actions on an explicit allowlist of argument-free host commands, including the global `permission.mode` auto-approve toggle. Quick Action bookmarks are user-wide and use the same compact filled/outlined control as Skills and MCP; bookmarked actions lead in configured order in the sidebar and Search Everything. Never reorder actions by usage. Keep per-action visibility independent so any action, including a bookmarked one, can be hidden from the sidebar; unavailable actions remain visible with route-aware reasons.
- Refresh the `permission.mode` Quick Action label reactively in both the sidebar and Search Everything when auto-approve changes, without requiring a dialog reopen or another preference update.
- Separate bookmarked Quick Actions from the remaining visible actions with the same single-row gap used by Skills and MCP favorites.
- Search full source lists independently of sidebar visibility and item limits. Background updates must preserve row identity, selection, scroll, and cached results.
- Enabling or disabling MCP from Search Everything must not close the dialog, including on failure. Keep the query and current view in place.
- Guard session/workspace-specific operations against stale targets.
- MCP on/off indicators look like radio buttons. MCP favorites use the compact filled/outlined bookmark pair that fits a terminal cell.
- Failed MCP rows expose a dedicated information control instead of rendering the error inline; it opens a scrollable dialog with the server, status, and full error text.
- MCP custom groups are user-wide, assign at most one group per exact server name, keep favorites in a leading bucket, sort named groups and their servers alphabetically, and retain assignments for servers absent from the current workspace.
- MCP group assignment must offer existing groups as selectable options while retaining an input for creating a new group.
- Separate adjacent MCP groups in the sidebar with a single-row gap, without adding space before the first group or between servers in one group.
- Skill favorites use the same compact filled/outlined bookmark control as MCP favorites in both sidebar rows and the Skill confirmation dialog.
- Skill rows do not expose a separate information control; description and source remain available in the Skill confirmation dialog.
- Keep MCP headings, counts, and bulk-action controls on single lines. Truncate long preset names rather than wrapping the heading or hiding the server count.
- Keep background refresh visually quiet, including for empty sections. Subagent events update immediately; snapshot polling currently uses a five-second interval.
- Maximize usable sidebar space without redundant padding. Use supported host APIs; do not pretend a configurable outer width exists when OpenCode fixes it internally.
- Do not duplicate the agent/model overview already displayed above OpenCode's prompt.
- Keep LSP badges compact. Activating a badge toggles its server label in place and must not open a details dialog; the host may report an empty LSP root, so do not expose a root/status modal from the badge.

## Preset previews

- A workspace profile is a user-wide optional link from one layout preset to one MCP preset. Apply it manually through one combined preview; do not auto-apply it on workspace entry or implicitly save the layout as the default.
- Manual application from a layout or MCP preset menu opens a change preview with a separate Apply action. Opening or cancelling a preview must not apply the preset.
- Layout previews show visibility, expansion, and destination positions. MCP previews distinguish connections, disconnections, unchanged servers, and skipped servers; show changes first.
- Use the same change calculation for preview and application. Keep the preview current, disable Apply for removed presets or failed/in-flight MCP refreshes and mutations, and reject stale scope/workspace targets.
- Cancel and Escape return to the preceding preset menu. Previewing or applying a layout does not implicitly save it as the default.
- Position preset previews toward the upper part of the terminal rather than low in the viewport. Use icon-led summaries, explicit semantic row states, and stronger visual grouping so changes, skipped items, and unchanged items are easy to scan.
- Export the selected scope's effective layout and desired MCP states as deterministic versioned JSON through the terminal clipboard. Import pasted JSON only after validation and a preview that lists unsupported fields as skipped; apply supported layout and MCP blocks atomically to the still-selected scope without importing paths or unrelated private preferences.

## Configuration sources

- Support simultaneous validated Navigator configuration from the plugin `options` dictionary in `opencode.json`, `~/.config/.opencode-navigator/settings.json`, and the commit-safe `.opencode/navigator.json` project file. Merge every portable setting across sources; `.opencode/navigator.json` has the highest priority and the `opencode.json` dictionary has the lowest priority. Treat the merged result as configured defaults below saved Global/Worktree preferences. Portable settings include behavior, layout, desired MCP states, layout/MCP presets, workspace-profile links, and MCP groups, but exclude history, favorites, trusted-skill state, onboarding state, paths, and other private mutable data.

## Corner font and installation

- The additional OpenCode Navigator Corners font is an explicit installation requirement for rounded multiline selections in Nerd Font mode. Keep this fact prominent in the README and installation steps.
- Ship the font, its installer, and licensing information in the npm package. Keep font generation reproducible and checked in CI.
- Install the font on the machine displaying the terminal, including when OpenCode runs remotely. Keep the user's primary Nerd Font selected and explain the full terminal restart needed after installation or an update.
- Document removal and the Text fallback mode for users without the additional font.
- Preserve the established font code points when adding a new font revision.

## Screenshots and public content

- Keep a reproducible Docker-based Ghostty screenshot harness. It may use a virtual X11/Wayland display, but must render through Ghostty with the bundled corner font and a pinned primary Nerd Font.
- Also maintain several deterministic screenshots rendered with the pinned primary Nerd Font but without installing the additional Navigator corner font, so the no-corner-font experience remains visible alongside the required-font captures.
- Screenshot fixtures must be fully synthetic and deterministic, including Todo, Subagents, Skills, Quick Actions, LSP, MCP, sessions, workspaces, paths, errors, and preset names. Never capture local user or company data.
- Maintain screenshots that demonstrate all application capabilities and update the README and article when the interface changes materially.
- Delegate screenshot capture and reproducibility checks to the manual pre-release GitHub Actions workflow. Agents must not run `bun run screenshots`, `bun run screenshots:verify`, or ad hoc local captures; update the harness and fixtures when needed, then let the release workflow generate, commit, and merge the PNG files.
- Keep the public screenshot set substantially larger than ten images so each major tab, menu, preview, filter, and interaction state is legible instead of combining unrelated capabilities into a few crowded captures.
- Keep every dialog's title, context, controls, and scrollable content inside its visible modal surface, and position dialogs consistently toward the upper part of the terminal.
- Public documentation and screenshots must not depend on private Yandex resources, `yandex-team` URLs, names, paths, or data.
- Maintain three publication-specific article variants: English-language `ARTICLE.md` for Habr without Yandex work-context references, ignored `ARTICLE-ATUSHKA.md` with relevant internal article references, and `ARTICLE-DEVTO.md` in English for DEV Community.
- Keep `ARTICLE-ATUSHKA.md` ignored and out of the public repository and npm package because it intentionally contains internal context and links.
- After drafting each article variant, complete five explicit editorial passes focused on natural voice, varied rhythm, concrete first-person detail, platform-native tone, and a final read for repetition or artificial phrasing.
- Every tracked repository file must be English-only and contain no Cyrillic text. The ignored local/internal `ARTICLE-ATUSHKA.md` is exempt and may remain in Russian.

## Toolchain and verification

- Keep `packageManager` pinned to the latest available stable Bun release when updating the local Bun toolchain.
- Use `@st1ggy/linter-config/eslint-solid` and its shared Prettier preset. Explain project-specific exceptions in `eslint.config.js`.
- Do not configure Stylelint while this project has no CSS/SCSS.
- Keep Solid and OpenTUI external and leave the TUI bundle unminified so it shares the host runtime.
- Use `bun run check` for tests, type checking, ESLint, bundle budget, and formatting. Render tests require `--preload @opentui/solid/preload`.
- Keep version-display assertions in tests as semantic-version regexes so routine version bumps do not require test edits. Explicit version literals are appropriate only as simulated input for version comparison and update-target cases; derive target assertions from that input rather than repeating its numbers.
- Run relevant interaction/rendering regressions and `bun run test:e2e` for TUI integration changes. Check font changes with `bun run font:check` and inspect actual glyph geometry and font metrics where relevant.
- Keep the bundle-size check active with the current 360,000-byte raw limit; account for measured growth when introducing features.

## Package identity and releases

- Publish as `opencode-navigator`. The legacy `opencode-pretty-sidebar` package is deprecated with migration guidance; retain existing published versions.
- Support both the established OpenCode 1.x host beginning at 1.18.30 and OpenCode 2.x. Keep host-version differences behind explicit adapters or capability checks so adding 2.x support does not break the existing 1.x integration.
- Keep OpenCode 1.x (currently 1.18.32) as the default local executable for `oc` and `opencode`, and route `oc2` and `opencode2` to the separately installed latest stable 2.x (currently 2.0.16). Preserve the shared 1.x-compatible server configuration and separate `tui.json` and `cli.json` client configurations.
- Continuously verify the minimum supported OpenCode 1.x host and the latest stable OpenCode 2.x host with separate real-host smoke tests; keep 2.x host/runtime dependencies current without dropping the 1.x adapter.
- Retain compatibility with the established preferences directory/lock and legacy command aliases.
- Include font installation and migration instructions in releases when relevant. Verify the npm version, GitHub release, and CI outcomes before reporting publication as complete.
- Maintain `CHANGELOG.md` for every release and include it in the npm package. Generate GitHub Release notes from the previous tag, supplement them with concise upgrade notes, and verify both the release notes and changelog before publication.
- Before publishing a GitHub Release, run the manual `Prepare Release` workflow and verify that its screenshot pull request passes CI and is merged.
- Execute the remaining roadmap work in its documented delivery order, completing and verifying each item before starting the next one; Search Everything history and configurable providers are explicitly excluded.

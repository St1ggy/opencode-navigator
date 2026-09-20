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
- Compose larger interfaces from small components. Keep business logic, persistence, requests, and SDK adaptation out of presentation components.
- Existing large modules, especially `src/components/sections.tsx` and multi-component dialog modules, are migration targets. Apply the atomic-component requirement to new code now.
- Extract reusable UI primitives and domain logic deliberately; do not turn Shared into a collection of unrelated application code.

## Interaction and presentation

- Keep mouse and keyboard behavior equivalent. Opening a dialog by mouse must use mouse-up and stop propagation so releasing the button cannot dismiss the newly opened dialog.
- Escape and Cancel in a nested dialog return to the previous screen with its state restored. Escape at the root closes the dialog.
- Use shared icon and dialog contexts. Keep preferences, request lifecycle, and interaction controllers consistent across views.
- Use Nerd Font icons with a readable text/ASCII fallback throughout the interface, including keyboard hints.
- Single-line highlighted elements use rounded ends. Multiline highlighted elements must also be rounded: use the Navigator corner font and inverse corner masks over a continuous background. Do not replace them with triangles, hollow frame corners, or rectangular highlights in Nerd Font mode.
- Clip long content to its content area so it cannot overwrite rounded corner cells.
- Standalone icon controls have inner padding of zero cells on the left and one on the right, in addition to cells reserved for the rounded ends.
- Nested controls (information, favorites, presets, settings) inherit the row background when idle and have their own contrasting hover/focus background and readable foreground.
- Focused filter fields must use a consistent contrasting palette for their icon, placeholder, entered text, clear control, and cursor. Synchronize their appearance with actual input focus and blur.
- Keep the active Todo filter visually persistent like the active Settings tab: use a rounded highlighted background, accent foreground, and bold label independently of transient keyboard focus.

## Search Everything and sections

- Search Everything has Skills, Subagents, MCP, and Actions tabs with a shared query and per-tab selection/scroll preservation.
- Search full source lists independently of sidebar visibility and item limits. Background updates must preserve row identity, selection, scroll, and cached results.
- Enabling or disabling MCP from Search Everything must not close the dialog, including on failure. Keep the query and current view in place.
- Guard session/workspace-specific operations against stale targets.
- MCP on/off indicators look like radio buttons. MCP favorites use the compact filled/outlined bookmark pair that fits a terminal cell.
- Keep MCP headings, counts, and bulk-action controls on single lines. Truncate long preset names rather than wrapping the heading or hiding the server count.
- Keep background refresh visually quiet, including for empty sections. Subagent events update immediately; snapshot polling currently uses a five-second interval.
- Maximize usable sidebar space without redundant padding. Use supported host APIs; do not pretend a configurable outer width exists when OpenCode fixes it internally.
- Do not duplicate the agent/model overview already displayed above OpenCode's prompt.

## Preset previews

- Manual application from a layout or MCP preset menu opens a change preview with a separate Apply action. Opening or cancelling a preview must not apply the preset.
- Layout previews show visibility, expansion, and destination positions. MCP previews distinguish connections, disconnections, unchanged servers, and skipped servers; show changes first.
- Use the same change calculation for preview and application. Keep the preview current, disable Apply for removed presets or failed/in-flight MCP refreshes and mutations, and reject stale scope/workspace targets.
- Cancel and Escape return to the preceding preset menu. Previewing or applying a layout does not implicitly save it as the default.
- Position preset previews toward the upper part of the terminal rather than low in the viewport. Use icon-led summaries, explicit semantic row states, and stronger visual grouping so changes, skipped items, and unchanged items are easy to scan.

## Corner font and installation

- The additional OpenCode Navigator Corners font is an explicit installation requirement for rounded multiline selections in Nerd Font mode. Keep this fact prominent in the README and installation steps.
- Ship the font, its installer, and licensing information in the npm package. Keep font generation reproducible and checked in CI.
- Install the font on the machine displaying the terminal, including when OpenCode runs remotely. Keep the user's primary Nerd Font selected and explain the full terminal restart needed after installation or an update.
- Document removal and the Text fallback mode for users without the additional font.
- Preserve the established font code points when adding a new font revision.

## Toolchain and verification

- Use `@st1ggy/linter-config/eslint-solid` and its shared Prettier preset. Explain project-specific exceptions in `eslint.config.js`.
- Do not configure Stylelint while this project has no CSS/SCSS.
- Keep Solid and OpenTUI external and leave the TUI bundle unminified so it shares the host runtime.
- Use `bun run check` for tests, type checking, ESLint, bundle budget, and formatting. Render tests require `--preload @opentui/solid/preload`.
- Run relevant interaction/rendering regressions and `bun run test:e2e` for TUI integration changes. Check font changes with `bun run font:check` and inspect actual glyph geometry and font metrics where relevant.
- Keep the bundle-size check active; account for measured growth when introducing features.

## Package identity and releases

- Publish as `opencode-navigator`. The legacy `opencode-pretty-sidebar` package is deprecated with migration guidance; retain existing published versions.
- Retain compatibility with the established preferences directory/lock and legacy command aliases.
- Include font installation and migration instructions in releases when relevant. Verify the npm version, GitHub release, and CI outcomes before reporting publication as complete.

# Screenshot Gallery

These 83 deterministic captures render the real OpenCode TUI through Ghostty.
Every task, session, workspace, path, skill, server, error, and preset is synthetic.

The updated harness registers **96 scenes**. The 13 additional scenes cover
disabled/enabled-empty native Todo, config selection/preview/error, all intermediate
wizard slides, a short terminal, and native 2.x Todo/LSP/permissions guidance.
Those new captures and the refreshed wizard images await a separately requested
manual Prepare Release run; the 83 PNGs below remain the verified v0.24.0 gallery.

The v0.24.0 manual **Prepare Release** workflow generated the gallery, verified every PNG
against a second capture, and merged the update after CI passed. The final run was
[41185659301](https://github.com/St1ggy/opencode-navigator/actions/runs/41185659301),
with [screenshot PR #33](https://github.com/St1ggy/opencode-navigator/pull/33).

The gallery includes About current,
available/checking/failed update states; version list and release details; editable
Bug reports, confirmation, browser-only and failure states; About Text and
no-corner-font confirmation; and stable toolbar hints in menu/wrapping layouts.
Three toolbar-content scenes cover multiple icons, text-only labels,
variable-width wrapping and the appearance editor. The
About/report fixtures use synthetic services and never invoke authenticated
processes, open a real browser, install an update or create GitHub issues.

The current harness targets OpenCode 1.19.5 with Bun 1.4.4 and Node 26.12.1.
Four native-usage scenes exercise Console shared/per-model budgets, Go allowance,
sign-in guidance, and request failure with Retry. They use the real public 2.2 usage
adapter and Limits components with synthetic client DTOs in the Ghostty harness;
separate real-host smokes verify the 2.2 adapter. Native millisecond reset times
are converted to the existing display contract before rendering.

## About, Release History And Bug Reports

![About with running versions and update status](67-settings-about.png)

![An available Navigator update](68-about-update.png)

![Update check failure](69-about-update-error.png)

![An update check in progress](70-about-checking.png)

![Release history by version](71-changelog-versions.png)

![Scrollable notes for one release](72-changelog-version.png)

![Editable synthetic Bug report](73-bug-report-editor.png)

![Separate Bug report send confirmation](74-bug-report-confirmation.png)

![Browser reporting without GitHub CLI](75-bug-report-browser.png)

![Recoverable report failure with the draft retained](76-bug-report-error.png)

![About in Text fallback](77-about-text.png)

![Report confirmation without the additional corner font](78-no-corner-bug-report.png)

## Toolbar Content And Stable Hints

![Toolbar hint in the existing gap](79-toolbar-hint.png)

![Hint below wrapping toolbar rows](80-toolbar-hint-wrap.png)

![Multiple icons and text-only buttons](81-toolbar-icons-and-text.png)

![Variable-width buttons in wrapping rows](82-toolbar-content-wrap.png)

![Unsaved toolbar appearance configuration](83-toolbar-appearance.png)

## Native Console And Go Usage

![Console workspace and per-model budgets](63-native-workspace-budgets.png)

![Go rolling, weekly and monthly allowance](64-native-go-allowance.png)

![Native usage sign-in guidance](65-native-usage-auth.png)

![Native request failure with Retry](66-native-usage-retry.png)

## Navigator Shortcut Hint

Four shortcut-hint scenes cover grouped actions and highlighted keys with
Nerd Font icons, Text fallback, a narrow Ghostty window, and Nerd Font icons
without the additional corner font. The files are
`48-sidebar-shortcuts.png`, `49-sidebar-shortcuts-text.png`,
`50-sidebar-shortcuts-narrow.png`, and `51-no-corner-font-sidebar-shortcuts.png`.

![Grouped Navigator shortcuts](48-sidebar-shortcuts.png)

![Shortcut hint in Text fallback](49-sidebar-shortcuts-text.png)

![Shortcut hint in a narrow terminal](50-sidebar-shortcuts-narrow.png)

![Shortcut hint without the corner font](51-no-corner-font-sidebar-shortcuts.png)

The `todo-native` scene additionally renders the real native-history projection
and Todo component from fully synthetic OpenCode 2 message snapshots. Its
`52-native-todo.png` capture covers native statuses, read-only chat guidance,
filters/progress, and Refresh without creating host tool events or invoking a
model. It uses the pinned Ghostty harness host for deterministic presentation;
real OpenCode 2 compatibility is checked separately by the PTY matrix.

![Native Todo with filters and Refresh](52-native-todo.png)

## Pinned Toolbar

The toolbar scenes keep pins independent of bookmarks and exercise the actual
manager, state-icon configuration, searchable picker, and overflow menu. The
narrow-terminal fixture uses the host's public sidebar toggle to keep the panel
visible below its automatic visibility threshold.

| File | Interaction |
| --- | --- |
| `53-toolbar-permissions-off.png` | Pinned actions and Skill, permissions Off icon |
| `54-toolbar-permissions-on.png` | Same pin with the observed On icon |
| `55-toolbar-manager.png` | Private ordered pin inventory |
| `56-toolbar-pin-icons.png` | Base and supported state-icon configuration |
| `57-toolbar-icon-picker.png` | Searchable icon catalogue and selected preview |
| `58-toolbar-overflow.png` | More menu with remaining buttons |
| `59-toolbar-wrapping.png` | Multiple compact button rows |
| `60-toolbar-text.png` | Single-cell Text fallbacks |
| `61-toolbar-narrow.png` | Narrow-terminal toolbar |
| `62-no-corner-font-icon-picker.png` | Nerd Font picker without Navigator corner masks |

![Pinned toolbar with permissions off](53-toolbar-permissions-off.png)

![Pinned toolbar with permissions on](54-toolbar-permissions-on.png)

![Toolbar manager](55-toolbar-manager.png)

![Per-state icon configuration](56-toolbar-pin-icons.png)

![Searchable icon picker](57-toolbar-icon-picker.png)

![Toolbar More menu](58-toolbar-overflow.png)

![Wrapping toolbar rows](59-toolbar-wrapping.png)

![Toolbar Text fallback](60-toolbar-text.png)

![Toolbar in a narrow terminal](61-toolbar-narrow.png)

![Icon picker without the corner font](62-no-corner-font-icon-picker.png)

## Provider Limits

| File | Synthetic interaction |
| --- | --- |
| `39-provider-limits.png` | Ordinary Codex account windows with nullable model metadata, native units, reset times, freshness |
| `40-reset-credits.png` | Available count, individual credit, expiry, and provider-selected next credit |
| `41-reset-confirmation.png` | Separate account/model-bound manual confirmation |
| `42-reset-count-only.png` | Nonzero count without a credit detail list |
| `43-limits-unavailable.png` | Calm guidance for an unsupported provider |
| `44-limits-text.png` | Readable Text fallback |
| `45-no-corner-font-reset-credits.png` | Nerd Font credit menu without the extra corner font |
| `46-limits-account-link.png` | Explicit Codex CLI account binding guidance |

The container uses a synthetic `codex` JSON-RPC executable. It accepts quota reads
and rejects every consume request; no provider account, credentials, or live reset
is involved in a screenshot scene.

### Codex Account Quota Windows

Full-width quota scales have reset time on the left below each scale, with the
remaining value reserved and aligned on the right.
Filled segments use muted text; unfilled segments recede into the same subtle
theme-derived tone as the section dividers.

![Account-bound provider quota windows](39-provider-limits.png)

### Reset Credit Review

![Available reset credits with provider details and expiry](40-reset-credits.png)

### Manual Reset Confirmation

![Separate account-bound reset confirmation](41-reset-confirmation.png)

### Count-Only Credits

![Available credits without individual details](42-reset-count-only.png)

### Unsupported Provider

![Calm unavailable guidance for an unsupported provider](43-limits-unavailable.png)

### Limits In Text Fallback

![Limits with readable Text fallback controls](44-limits-text.png)

### Explicit Account Link

![Guidance before linking a Codex CLI account](46-limits-account-link.png)

## Sidebar

### Overview

![Navigator overview](01-hero-sidebar.png)

### Active Todo Filter

![Active Todo filter](02-todo-active.png)

### Finished Todo Filter

![Finished Todo filter](03-todo-finished.png)

### All Subagents

![All Subagents filter](04-subagents-all.png)

### Subagent Errors

![Subagent Errors filter](05-subagents-errors.png)

### Skills

![Skills sidebar section](06-skills-sidebar.png)

### Quick Actions And LSP

Bookmarked host actions lead in configured order; unavailable actions stay visible
with an explicit reason.

![Quick Actions and LSP sidebar sections](07-quick-actions-lsp.png)

### MCP

![MCP sidebar section](08-mcp-sidebar.png)

### MCP Error Details

Failed rows keep their full synthetic error behind a dedicated information control.

![MCP error details](32-mcp-error.png)

## Search Everything

### Skills

![Search Everything Skills tab](09-search-skills.png)

### Subagents

![Search Everything Subagents tab](10-search-subagents.png)

### MCP

![Search Everything MCP tab](11-search-mcp.png)

### Actions

The Actions tab uses the same user-wide bookmarks and availability state as the sidebar.

![Search Everything Actions tab](12-search-actions.png)

## Settings

### Sections

![Settings Sections tab](13-settings-sections.png)

### Scope

![Settings Scope tab](14-settings-scope.png)

### Presets

![Settings Presets tab](15-settings-presets.png)

### Behavior

![Settings Behavior tab](16-settings-behavior.png)

### Limits Refresh Interval

The selected scope's automatic Limits refresh defaults to five minutes and accepts
whole-minute intervals of at least one minute. Manual Refresh stays immediate.

![Scoped Limits refresh interval prompt](47-limits-refresh-settings.png)

### Defaults And Help

![Settings Defaults and Help tab](17-settings-defaults.png)

### Portable Settings

The selected scope's effective layout and desired MCP states can be copied as
versioned JSON and imported only after a validation preview.

![Portable settings actions](33-portable-settings.png)

### Settings Import Preview

Supported changes remain separate from future fields that will be skipped.

![Settings import preview](34-settings-import-preview.png)

### Quick Actions

![Quick Actions settings](18-quick-actions-settings.png)

### MCP Groups

User-wide assignments include servers that are not present in the current workspace.

![MCP group manager](31-mcp-groups.png)

### Skill Groups

User-wide assignments keep favorite skills in front and retain absent source locations.

![Skill group manager](38-skill-groups.png)

## Presets

### Layout Preset Menu

![Layout preset menu](19-layout-preset-menu.png)

### Workspace Profile Preview

The linked layout and MCP presets share one explicit preview and Apply action.

![Workspace profile preview](20-layout-preset-preview.png)

### MCP Presets

![MCP preset list](21-mcp-presets.png)

### MCP Preset Menu

![MCP preset menu](22-mcp-preset-actions.png)

### MCP Preset Preview

![MCP preset preview](23-mcp-preset-preview.png)

## Guidance And Fallbacks

### Skill Confirmation

![Skill confirmation](24-skill-confirmation.png)

### Keyboard Help

![Navigator keyboard help](25-keyboard-help.png)

### First-Run Capability Tour

![First-run capability tour](26-setup-tour.png)

### First-Run Section Setup

![First-run section setup](27-setup-sections.png)

### Text Fallback

![Text fallback mode](28-text-fallback.png)

### Trusted Skills

![Trusted Skills settings](29-trusted-skills.png)

### Settings Control Hover

![Centered settings control](30-settings-control-hover.png)

### Nerd Font Without Navigator Corner Font

These captures retain the pinned JetBrainsMono Nerd Font, deliberately remove the
additional Navigator corner font, and disable only multiline masks. Nerd icons and
single-line rounded controls remain, while multiline highlights become rectangles.

![Layout preview without Navigator corner font](35-no-corner-font-layout-preview.png)

![MCP preview without Navigator corner font](36-no-corner-font-mcp-preview.png)

![Import preview without Navigator corner font](37-no-corner-font-import-preview.png)

![Reset credit review without Navigator corner font](45-no-corner-font-reset-credits.png)

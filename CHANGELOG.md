# Changelog

## [0.24.0] - 2026-10-31

- Support the latest stable OpenCode 1.19.5 and 2.2.5 releases, preserving both host adapters and existing sidebar behavior.
- Preserve Limits scales and reset-credit controls across equivalent quota snapshots and unrelated workspace events, while retaining current-account and credential-change guards.
- Keep rounded selection backgrounds consistent in nested dialogs and highlighted rows.
- Configure each toolbar button with zero to three icons and optional custom text, including text-only buttons. Keep legacy/state choices, unsaved drafts, rounded clipping, and width-aware More/wrapping.
- Keep Quick Action rows and their hover/focus state stable while typing in the main prompt on both supported OpenCode hosts.
- Show toolbar hover/focus hints without moving Limits or other sections, preserving centered, uniformly sized icon controls and empty-toolbar collapse.
- Add Settings → About with the running versions, explicit update status/checking, confirmed updates, and a versioned changelog that can be reopened independently of first-launch upgrade notes.
- Prepare editable Bug reports with confirmed sending through authenticated GitHub CLI and an independent Open in browser action. Retain drafts through errors and cancellation, and require manual review before retrying an uncertain submission.

## [0.23.0] - 2026-10-28

- Support only the latest stable OpenCode 1.x and 2.x releases, currently 1.19.5 and 2.2.0, including the newer terminal renderer.
- Keep Skills, MCP servers, and Subagents current as OpenCode 2 updates, and launch the intended Skill when multiple sources have the same name.
- Show OpenCode Console workspace budgets and Go allowance through the public host usage API without a Navigator server plugin. Preserve workspace scope, native units, reset times, and explicit failure/retry states.
- Preserve Navigator shortcuts and nested-dialog navigation with OpenCode 2.2's keyboard handling.
- Verify a supported runtime before changing a pinned Navigator snapshot, preserving the installed version when no compatible verifier is available.

## [0.22.0] - 2026-10-23

- Pin Quick Actions and Skills to a compact sidebar toolbar independently of bookmarks. Choose icons in a searchable picker, customize supported state icons, reorder buttons, and select a More menu or wrapping rows. Preserve Skill confirmations, unavailable reasons, keyboard navigation, and Text fallback; hide the toolbar entirely when empty.
- Use OpenCode 2's built-in Todo history for the sidebar, with native completed-write and revert semantics, existing filters/progress, and manual Refresh. Keep edits in ordinary chat, preserve previous Navigator tasks as a read-only archive, and retain the independent provider-quota server integration.
- Support OpenCode 2.1's plugin and rendering APIs while retaining the OpenCode 1.x adapter; restore custom dialogs and rounded selections on the newer native renderer.
- Replace the shortcut toast with an icon-led hint featuring highlighted keys, navigation/update groups, a distinct Escape action, and responsive Text/no-corner-font layouts. Keep prompt focus and share its action list with scrollable keyboard help.
- Update Subagent status immediately from OpenCode 2's execution lifecycle and keep unresolved external credentials separate from verified provider accounts.
- Keep OpenCode updates on the current major line and preserve pinned-source Navigator updates when a target release needs newer runtime dependencies.

## [0.21.8] - 2026-10-09

- Make the unfilled part of Limits scales substantially quieter, matching the theme-derived sidebar-divider tone. Keep the filled segment, reset text, and remaining values readable in both icon modes and after theme changes.

## [0.21.7] - 2026-10-09

- Remove the vertical guide and its reserved gutter from Limits in both icon modes. Keep full-width quota scales, reset-left/remaining-right details, and one blank row between quota windows.

## [0.21.6] - 2026-10-09

- Refine Limits with a continuous muted guide, full-width thin-line quota scales, and reset-left/remaining-right details. Keep long reset text from overlapping the remaining value and preserve Text fallback, resize clipping, and existing controls.

## [0.21.5] - 2026-10-07

- Make automatic Limits refresh configurable in scoped Behavior settings and portable configuration, with a five-minute default and one-minute minimum. Keep manual Refresh and supported model/account switches immediate.
- Avoid extra quota polling from unrelated preference changes and unchanged provider-account metadata observations.

## [0.21.4] - 2026-10-07

- Add `c` to Navigator shortcuts for a manual update check and `u` to check then confirm a Navigator update. Report available, current, or unavailable results, preserve the installation method and scope, and require a restart after updating.
- Ignore cancelled, outdated, and repeated update confirmations, and recover from stalled update checks without blocking later checks.

## [0.21.3] - 2026-10-06

- Replace block quota meters with full-width adaptive thin-line scales and keep quota rows inside the sidebar's padding after resize. Show only reset time below each meter, removing technical account and window-duration suffixes.

## [0.21.2] - 2026-10-06

- Make Limits compact with clickable provider/model and variant controls, remaining-headroom progress rows, and muted reset times. Move Refresh and Banked Resets into the section header, remove the section counter and Provider sources action, and keep reset consumption behind a separate confirmation.

## [0.21.1] - 2026-10-06

- Fix Codex account quota windows being hidden when the provider omits model metadata. Show ordinary usage as shared account quota, retain banked-reset counts, and keep separate model buckets explicitly associated.

## [0.21.0] - 2026-10-06

- Automatically verify Codex account identity from OpenCode 2's ChatGPT connection. When host identity is unavailable, confirm a private binding once per connection or provider and reuse it across models, projects, and sessions; preserve compatible older confirmations and isolate conflicting ones until relinked.
- Expand OpenCode 2 Limits with documented native subscription allowances, API rate-limit observations, configured capacities, account balances, and key budgets. Keep provider-native units, currencies, model associations, and active-account boundaries explicit.
- Add Provider sources to explain each provider's supported measurements, required permissions, and unavailable APIs without guessing remaining quota.
- Keep available account balances visible when a separate subscription read fails, and show exhausted NanoGPT subscription windows instead of hiding them.
- Keep stale quota guidance visible after failed refreshes, reject late results after credential changes, and recover from stalled provider reads without blocking model response streams.

## [0.20.0] - 2026-10-05

- Add a default-visible Limits section for the selected model's provider-native quota windows, reset times, account identity, and freshness. Codex CLI support requires an explicit private account binding; unsupported providers show calm guidance.
- Review Codex banked reset credits and use them only after a separate confirmation and fresh eligibility checks. Preserve the same attempt key when reconciling an uncertain result, including after a restart.
- Save named, commit-safe project layout and MCP profiles to `.opencode/navigator.json` with the `opencode-navigator-profile` command, an explicit preview, and `--apply`; profile application remains manual.

## [0.19.3] - 2026-10-03

- Indent grouped Todo, Subagent, Skill, and MCP rows and align MCP server status indicators with their group headings.
- Place Skill, MCP, and Quick Action bookmarks before item names. Reveal unselected bookmarks on hover or keyboard focus, keep favorites visible, and keep labels steady.

## [0.19.2] - 2026-10-02

- Show MCP group connection states with the same radio-style indicators as individual servers, without Connect/Disconnect labels on group headings.

## [0.19.1] - 2026-10-02

- Remember the OpenCode 1.x auto-approve mode as a user-wide default for new sessions, including changes made through the host's permission toggle.

## [0.19.0] - 2026-10-02

- Connect or disconnect all eligible MCP servers in a group from its heading, including filtered-out items, with keyboard access and failed-only retry.
- Organize Skills into user-wide groups by source location, with Favorites first and group names searchable across the full catalog.
- Reload saved Navigator settings from disk in another running OpenCode session without restarting it.

## [0.18.2] - 2026-10-02

- Open the host Settings dialog from the OpenCode 2.x Permissions Quick Action, where the user can change between `prompt` and `auto accept`; keep the direct auto-approve toggle on OpenCode 1.x.

## [0.18.1] - 2026-10-01

- Show calm Todo setup guidance in OpenCode 2.x when Navigator's server plugin is absent, without a request error or Retry control. Actual server failures still offer Retry.
- Keep Quick Action names readable in narrow sidebars by placing unavailable reasons below them and showing shortcuts only when they fit.

## [0.18.0] - 2026-10-01

- Add durable per-session Todo lists to OpenCode 2.x through a separately configured Navigator server plugin and an agent Todo tool.
- Update Todo in the sidebar as tasks change, and offer an off-by-default per-session switch for model-context Todo instructions.
- Keep Todo visible with setup guidance when the OpenCode 2.x server plugin is missing.

## [0.17.3] - 2026-09-30

## [0.17.2] - 2026-09-30

- Update a pinned local Navigator installation from its version label while keeping its file or directory source unchanged.
- Hide the session title and creation date independently with Global/Worktree settings in OpenCode 1.x.

## [0.17.1] - 2026-09-29

- Fix the local Navigator installation changing unexpectedly when rebuilding the repository; it now stays on its pinned version.

## [0.17.0] - 2026-09-29

- Add an opt-in Behavior setting to start a new session directly in chat with the sidebar from Home or New session.
- Remember the previously installed Navigator version and show the intervening release notes once after an update.

## [0.16.1] - 2026-09-25

- Make the entire OpenCode or Navigator version label open its own update confirmation when an update is available. The separator and the other version remain inactive.
- Replace the small update arrow with a more prominent filled-circle Nerd Font indicator, retaining an ASCII fallback.

## [0.16.0] - 2026-09-25

- Show both OpenCode and Navigator versions in the OpenCode 2.x footer.
- Confirm updates from the footer or command palette, preserve the original installation method and scope, and report the outcome with a restart reminder.

Earlier release notes are available on [GitHub Releases](https://github.com/St1ggy/opencode-navigator/releases).

[0.22.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.8...v0.22.0
[0.21.8]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.7...v0.21.8
[0.21.7]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.6...v0.21.7
[0.21.6]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.5...v0.21.6
[0.21.5]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.4...v0.21.5
[0.21.4]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.3...v0.21.4
[0.21.3]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.2...v0.21.3
[0.21.2]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.1...v0.21.2
[0.21.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.21.0...v0.21.1
[0.21.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.19.3...v0.20.0
[0.19.3]: https://github.com/St1ggy/opencode-navigator/compare/v0.19.2...v0.19.3
[0.19.2]: https://github.com/St1ggy/opencode-navigator/compare/v0.19.1...v0.19.2
[0.19.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.19.0...v0.19.1
[0.19.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.18.2...v0.19.0
[0.18.2]: https://github.com/St1ggy/opencode-navigator/compare/v0.18.1...v0.18.2
[0.18.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.18.0...v0.18.1
[0.18.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.3...v0.18.0
[0.17.3]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.2...v0.17.3
[0.17.2]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.16.1...v0.17.0
[0.16.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.15.0...v0.16.0

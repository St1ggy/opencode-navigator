# Changelog

## Unreleased

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

# Changelog

## Unreleased

## [0.17.2] - 2026-09-30

- Allow a confirmed Navigator update to advance a recognized local pinned snapshot without replacing its file or directory source.
- Add separate Global/Worktree visibility switches for the session title and creation date in OpenCode 1.x Settings → Sections.
- Make test version expectations independent of the current Navigator and OpenCode releases.

## [0.17.1] - 2026-09-29

- Keep the locally configured Navigator client pinned to a versioned snapshot outside the development checkout, so rebuilding the repository cannot silently change the installed plugin.
- Stop tracking project-local OpenCode TUI configuration; ignore both TUI and CLI config files without removing existing local settings.
- Let real-host smoke tests verify pinned plugin installations with isolated configurations.

## [0.17.0] - 2026-09-29

- Add an opt-in Behavior setting to start a new session directly in chat with the sidebar from Home or New session.
- Remember the previously installed Navigator version and show the intervening release notes once after an update.

## [0.16.1] - 2026-09-25

- Make the entire OpenCode or Navigator version label open its own update confirmation when an update is available. The separator and the other version remain inactive.
- Replace the small update arrow with a more prominent filled-circle Nerd Font indicator, retaining an ASCII fallback.
- Keep version-display assertions independent of release numbers.

## [0.16.0] - 2026-09-25

- Show both OpenCode and Navigator versions in the OpenCode 2.x footer.
- Confirm updates from the footer or command palette, preserve the original installation method and scope, and report the outcome with a restart reminder.
- Refresh the deterministic screenshot gallery and keep the unminified bundle within its size limit.

Earlier release notes are available on [GitHub Releases](https://github.com/St1ggy/opencode-navigator/releases).

[0.17.2]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.1...v0.17.2
[0.17.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.17.0...v0.17.1
[0.17.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.16.1...v0.17.0
[0.16.1]: https://github.com/St1ggy/opencode-navigator/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/St1ggy/opencode-navigator/compare/v0.15.0...v0.16.0

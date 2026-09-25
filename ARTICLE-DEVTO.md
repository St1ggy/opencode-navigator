---
title: I Got Tired of Scanning OpenCode's Sidebar, So I Rebuilt It
published: false
description: Building a searchable, keyboard-first OpenCode sidebar and testing the bundled plugin inside a terminal.
tags: opencode, typescript, tui, opensource
cover_image: https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/01-hero-sidebar.png
---

I kept losing the useful lines in my OpenCode sidebar.

[OpenCode](https://opencode.ai/) is a terminal-based coding agent. You work with it in a TUI, or terminal user interface, where it can maintain a task list, launch child agents, call tools, and connect to external services through Model Context Protocol (MCP) servers. Its sidebar is where much of that context lives.

Mine had stopped feeling like context. It had become a directory.

As I added MCP servers, the panel filled with services that were configured but usually disconnected. LSP status and Todo appeared farther down. To answer a simple question such as "What is still running?" I had to scan past information that rarely changed. The panel still worked; it just made the common path unnecessarily noisy.

I wanted the opposite: a compact view of what matters now, with every configured tool one search away. So I built [OpenCode Navigator](https://github.com/St1ggy/opencode-navigator), a TUI plugin that replaces the overlapping built-in sidebar sections instead of adding another dashboard.

In OpenCode 1.x, the footer keeps the project path and branch, then shows the OpenCode and Navigator versions with a separate update marker beside whichever one has a newer release.

![OpenCode Navigator with Todo, Subagents, Skills, Quick Actions, LSP, and MCP sections](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/01-hero-sidebar.png)

The visible part was straightforward. The state-management bugs and the work needed to test the plugin inside a real terminal were not.

## Start with activity, not inventory

The first question I ask while an agent is working is not "What integrations are installed?" It is "What is happening?"

That put Todo at the top. It starts expanded and shows progress across the complete task list. `All`, `Active`, and `Finished` views separate current work from completed and cancelled items. Running tasks sort before pending ones, and the header still reports completed tasks against the full count.

![Active Todo tasks in the Navigator sidebar](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/02-todo-active.png)

Subagents sit close by. OpenCode can launch child sessions, so I wanted to see active workers, retries, observed durations, recent runs, and execution errors without leaving the parent session.

Selecting a row opens that child session. `All`, `Active`, `Recent`, and `Errors` tabs keep the list useful when several workers have run.

I also had to resist making uncertain data look precise. If Navigator discovers a child that was already running, it marks the duration with a clock icon (`~` in Text fallback) because the exact start time is unknown. An idle transition is labelled `Finished`; I do not present it as proof that the task succeeded. Local events update immediately, while snapshot and worker-status polling runs every five seconds and stays visually quiet.

![Subagent errors and observed run details](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/05-subagents-errors.png)

## Skills need a safety step

OpenCode Skills are reusable instructions exposed as slash commands. A long alphabetical list was no better than my long MCP list, so the Skills section is searchable and can be limited to a few rows.

I added two ways to keep useful skills near the top. Bookmarked favorites are user-wide, and the last ten successfully inserted skills are remembered by source location as recent items. Favorites come first, recent skills follow, and everything else remains alphabetical.

Selecting a skill does not immediately insert an unfamiliar command. Navigator first opens its description and source path.

From there I can accept, cancel, or choose "Don't show again for this skill." The same compact bookmark control appears in both the sidebar row and the confirmation dialog. Skipped confirmations can be restored from settings.

![Skill description, source, bookmark, and confirmation controls](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/24-skill-confirmation.png)

## MCP controls belong beside MCP state

MCP was the original source of the clutter, but hiding it completely would have made the sidebar less useful. I made each row actionable instead.

Clicking an MCP server connects or disconnects it. Radio-style indicators show state, and busy servers cannot be triggered again. `Connect all` and `Disconnect all` run eligible changes in parallel. If one server fails, completed changes remain in place and Navigator offers a retry for only the failures.

A failed row keeps its full error behind a dedicated information control instead of expanding the sidebar. The resulting scrollable dialog shows the server, status, and complete error text.

Bookmarks are separate from connection state. A favorite is saved user-wide by server name and only moves that server to the top, alphabetically within the favorite group; it never connects or disconnects it. That distinction matters when a misplaced click could start a service.

![MCP connection controls and favorite bookmarks](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/08-mcp-sidebar.png)

For larger catalogs, I added user-wide custom groups. Favorites stay in a leading bucket, named groups and their servers sort alphabetically, and assignments survive when a server is absent from the current workspace. Group names are searchable in both the sidebar and Search Everything.

![MCP custom group manager](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/31-mcp-groups.png)

For repeatable setups, I added named MCP presets that record the desired enabled and disabled states. I can also link a layout preset to one MCP preset as a workspace profile.

Applying either kind of preset starts with a preview. MCP previews separate connections, disconnections, unchanged servers, and unavailable or missing servers that will be skipped. A workspace-profile preview shows both the layout and MCP changes. Nothing changes until I select `Apply`, and that action is disabled whenever the preview may be stale. Entering a workspace never applies its profile automatically, and applying one does not save the layout as the default.

![MCP preset preview with connection changes and skipped servers](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/23-mcp-preset-preview.png)

Navigator can also remember MCP state globally or per worktree, meaning the current project checkout. This has one unavoidable timing limitation: OpenCode initializes enabled MCP servers before TUI plugins. A server remembered as disabled can therefore connect briefly during startup before Navigator disconnects it.

## Search should ignore the sidebar's size

Once I made the sidebar compact, I had another problem: where should everything else go?

`Ctrl+Shift+K` opens Search Everything. It searches the full Skills, Subagents, MCP, and Actions lists, regardless of whether a section is hidden or limited to five rows. One query carries across all four tabs. Each tab remembers its own selection and scroll position until the query changes.

![Search Everything showing Skills results](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/09-search-skills.png)

The result action depends on the tab: insert a skill, open a child session, toggle an MCP server, or run a built-in OpenCode action.

MCP changes happen in place. The dialog remains open even after a failure and preserves the query and list position. Background refreshes keep cached results and do not flash a loading indicator over a list I am already reading.

I close Search Everything when the active session or workspace changes. Keeping a dialog open is not worth the risk of running an action against a stale target.

## Keyboard-first, but not keyboard-only

I do use a mouse sometimes, so every important control supports both input paths. But I designed the keyboard path first.

`Ctrl+Shift+F` moves focus into the sidebar. `Up`/`Down` or `k`/`j` move between visual rows, `Left`/`Right` move among controls on the same row, `Enter` activates, `Escape` returns focus, and `?` opens help. The command palette also contains direct focus commands for Todo, Subagents, Skills, Quick Actions, LSP, and MCP.

Quick Actions call an explicit allowlist of OpenCode's argument-free commands rather than reimplementing them. Alongside Rename, Timeline, Copy transcript, Export, and Compact, the list covers session switching and creation, forking, copying the last response, message navigation, and the system auto-approve permissions toggle. User-wide bookmarks put selected actions first, in their configured order, in both the sidebar and Search Everything. Usage never reshuffles the list, and any action can be hidden from the sidebar independently of its bookmark. Commands unavailable on the current route or host version remain visible with a reason.

The focus, search, and sidebar shortcuts can all be changed at runtime. By default, `Ctrl+Shift+B` opens a temporary shortcut mode: `h` toggles the panel, while `t`, `a`, `s`, `q`, `l`, and `m` focus Todo, Subagents, Skills, Quick Actions, LSP, and MCP. Some terminals do not distinguish `Ctrl+Shift+B` from `Ctrl+B`, so the mode may need a terminal-friendly binding such as `Alt+S`.

Settings cover section visibility, order, item limits, global or current-worktree scope, named layout presets, MCP persistence, icon style, and Quick Action ordering. Behavior changes apply immediately. A seven-step first-run guide introduces the same controls, then lets me choose the visible sections on its final screen.

I can also export the selected scope's effective layout and desired MCP states as deterministic, versioned JSON through the terminal clipboard. On import, Navigator validates the pasted JSON and previews unsupported fields as skipped. Nothing changes until I select `Apply`; then it updates the supported layout and MCP blocks atomically. Worktree paths, shortcuts, favorites, history, and trust choices stay out of the export.

![Section visibility, ordering, and item limits](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/13-settings-sections.png)

![Settings import preview](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/34-settings-import-preview.png)

## The bug was a second copy of Solid

Navigator is written in TypeScript and TSX with Solid and OpenTUI. An early build looked correct, accepted clicks, and wrote the new setting to disk. It simply did not update the screen.

After restarting OpenCode, the changed section appeared in its new state. That narrowed the problem to reactivity rather than persistence.

The bundle contained another copy of Solid. Navigator's components were creating reactive state in a different runtime from the one mounting them inside OpenCode. The event fired and the state changed, but the host did not observe the update.

I could not fix that with another signal or a forced redraw. I had to keep `solid-js` and the OpenTUI packages external when building `dist/tui.js`, so the plugin shares the host's reactive runtime. A source-level component test can miss this bug because the test and component may accidentally use the same duplicate runtime.

## Preferences have to survive two OpenCode windows

Settings introduced a quieter data problem. I often have more than one OpenCode process open. If both read the same preferences, change different values, and write them back, a plain `writeFile` makes the last process win and can leave a partially written file after interruption.

Navigator stores validated, unversioned preferences under OpenCode's state directory. Writes go to a temporary file and then use `rename`, so readers see either the old complete file or the new complete file.

A lock file records the owner's PID to serialize writers. If that process has died, a later process recognizes and removes the stale lock.

That one file holds layout and behavior overrides, remembered MCP states, onboarding state, Skill confirmation choices, favorites, recent skills, and presets. Configured defaults can come from the plugin options, `~/.config/.opencode-navigator/settings.json`, and a commit-safe `.opencode/navigator.json`; those sources deep-merge in that order. Saved global preferences, worktree overrides, and temporary session state remain above them. Personal history, favorites, trust decisions, and paths are deliberately excluded from the declarative files.

## Test the bundle users actually load

The duplicate-runtime bug changed what I considered a meaningful test.

The test suite now builds the unminified `dist/tui.js` that users load. Rendering tests open that output through OpenTUI's test renderer, click controls, type into filters, and assert the resulting character frame. Other tests exercise keyboard navigation and lists containing 500 rows. An end-to-end smoke test starts the built plugin in OpenCode through a pseudo-terminal (PTY).

This takes longer than testing source modules alone, but it covers the boundary where my most confusing bug actually lived: bundling and host integration.

Screenshots go through an equally concrete path. A pinned Linux ARM64 Docker image starts the TUI in Ghostty on a virtual X11 display and renders 37 scenes with a pinned JetBrains Mono Nerd Font. The bundled corner font is present in 34 scenes and deliberately absent from three, preserving the real pre-installation experience. Running the harness requires Docker with Linux ARM64 support.

Every displayed task, session, workspace, path, skill, server, error, and preset is synthetic and deterministic. Verification renders the scenes again to a temporary directory and fails if any PNG differs.

![Text fallback mode rendered by the screenshot harness](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/28-text-fallback.png)

Screenshots are documentation, but in this project they are also rendering regression tests.

## Installation

OpenCode Navigator 0.15.0 supports OpenCode 1.18.30 and newer, including OpenCode 2.x.

### OpenCode 1.x

Install Navigator for the current project:

```sh
opencode plugin opencode-navigator
```

Add `--global` to install it for every project:

```sh
opencode plugin --global opencode-navigator
```

The command adds the package to the `plugin` array in `tui.json`. Disable the overlapping built-in sidebar sections in the same file to avoid duplicates:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-navigator"],
  "plugin_enabled": {
    "internal:sidebar-context": false,
    "internal:sidebar-mcp": false,
    "internal:sidebar-lsp": false,
    "internal:sidebar-todo": false
  }
}
```

Use `.opencode/tui.json` for one project or `~/.config/opencode/tui.json` globally, then restart OpenCode.

### OpenCode 2.x

Install Navigator through the OpenCode 2 plugin manager:

```sh
opencode plugin add opencode-navigator
```

The command updates the `plugins` array in the global `~/.config/opencode/cli.json`. The equivalent configuration is:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-navigator"]
}
```

OpenCode 2.x has no project-local `cli.json`. Navigator replaces the `sidebar.content` slot, so the built-in sidebar overrides required for OpenCode 1.x are not needed.

OpenCode 2.0.16 does not expose Todo or LSP state to TUI plugins. Navigator keeps
Todo visible with an explicit unsupported-host message and hides LSP while retaining
Subagents, Skills, Quick Actions, MCP, Search, settings, and presets.

### Rounded selections and the corner font

Nerd Fonts, which add icon glyphs to programming fonts, provide Navigator's normal icons. They do not contain the four mask glyphs used to round multiline selection corners. For those, install the small OpenCode Navigator Corners fallback font on the computer that displays the terminal:

```sh
npx --yes --package=opencode-navigator opencode-navigator-font
```

The installer requires Node.js 20+ and npm. Run it on the local computer even when OpenCode runs over SSH. Keep your primary Nerd Font selected, fully quit and reopen the terminal application, and then restart OpenCode. Restarting only OpenCode may leave the terminal's previous font cache active.

If you do not want an additional font, turn off **Settings -> Behavior -> Multiline corner font**. Navigator keeps Nerd Font icons and rounded single-line controls, but renders multiline highlights as clean rectangles instead of missing glyphs. Full Text fallback remains available when Nerd Font icons are unavailable too.

## What the plugin cannot fix

Navigator uses the full sidebar slot OpenCode provides, but OpenCode currently fixes the outer panel at 42 columns. There is no honest plugin setting for making it wider.

Todo priority is read-only because TUI plugins do not receive a Todo mutation API. Language Server Protocol (LSP) badges can reveal the full server ID in place, but Navigator does not show a root/status dialog because the host may report an empty root and does not expose the underlying diagnostic error text. MCP startup ordering has the brief-connect limitation described earlier.

I would rather state those boundaries plainly than add controls that pretend the plugin has authority it does not.

## What I still want to learn

Navigator now covers the sidebar workflow I wanted: monitor current work, find hidden or limited items quickly, and keep configuration close to the controls it affects. That workflow is personal, though. Some people never touch a mouse. Some have two MCP servers; others have fifty. Some do not use Todo at all.

The source and documentation are on [GitHub](https://github.com/St1ggy/opencode-navigator), and version 0.15.0 is on [npm](https://www.npmjs.com/package/opencode-navigator). The repository also contains the [37-state screenshot gallery](https://github.com/St1ggy/opencode-navigator/tree/main/screenshots).

If you try it, I'd like to know what still feels hard to reach, which section you'd remove, and what breaks with your terminal, theme, or configuration. Bugs and feature requests are welcome in [GitHub Issues](https://github.com/St1ggy/opencode-navigator/issues), or tell me in the comments how you use OpenCode's sidebar.

# How I Rebuilt OpenCode's Sidebar and Ended Up Making a TUI Plugin

At some point, OpenCode's right sidebar stopped helping me navigate a session. It reliably showed context, LSP, MCP, and Todo information, but as my configuration grew, useful lines became lost among things I rarely looked at. MCP made the problem especially obvious: I had many servers, needed one or two for the current task, yet all of them occupied space.

The problem was not critical. Nothing crashed, and I could keep working. I simply found myself scanning for the active task, the server I needed, or a child agent several times per session, stumbling over the same interface each time. This kind of friction is easy to get used to, but it still consumes attention.

I decided to see whether I could build a sidebar that answered not "what is connected to OpenCode in general?" but a more practical question: "what is happening right now, and where should I go next?"

That experiment became OpenCode Navigator, a TUI plugin for search, navigation, and session management. As it turned out, the two main technical problems had little to do with arranging rows: one was hidden in the Solid build, and the other in preference writes.

![OpenCode Navigator in an active session](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/01-hero-sidebar.png)

## Remove First, Then Add

I built the first prototype around a simple constraint: the sidebar must not become yet another information dashboard. Its width is fixed, the main conversation sits beside it, and competing with that conversation for attention makes no sense.

So Todo starts expanded, while Subagents, Skills, Quick Actions, LSP, and MCP are collapsible. Any section can also be hidden entirely. The familiar project path and branch remain at the bottom. In OpenCode 1.x, they are followed by OpenCode and Navigator versions, each with its own update indicator when an update is available. The plugin does not launch a separate client: it integrates into OpenCode's standard TUI, receives its theme and state from the host, and uses the host's commands and dialogs.

The rest of the project grew from that constraint. Every section should either reveal something important at a glance or lead quickly to an action. Everything else can be collapsed.

## Todo and Subagents: What Is Happening to the Task

During a long request, I usually watch two things: which plan items are already complete, and whether any child agent has become stuck. That is why Todo and Subagents occupy the top of the sidebar.

Todo has `All`, `Active`, and `Finished` views. Active tasks are separated from completed and cancelled ones, while the heading always shows overall progress.

Priorities are visible but cannot be changed from the plugin because OpenCode does not expose an API for TUI plugins to make that change. The state is therefore read-only rather than paired with a control that cannot work.

Subagents collects active child sessions, recent completions, retries, and errors. Selecting a row opens the corresponding session.

For a running agent, I show the time since Navigator began observing it. If the agent was already running when discovered, a clock icon appears beside it (`~` in text mode): the exact start time is unknown, and I chose not to invent one. Likewise, `Finished` means only that Navigator observed a transition to idle, not that the task definitely succeeded; errors and cancellations are marked separately. The last ten observed runs live only in memory and disappear when OpenCode exits.

![Todo filtered to active tasks](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/02-todo-active.png)

![Subagent errors](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/05-subagents-errors.png)

Local events update the list immediately, while state snapshots and individual process statuses are polled every five seconds. I worked to keep background refreshes from making an empty section flicker or resetting the selected row. Otherwise, a panel designed for peripheral monitoring would demand attention of its own.

## Skills: A Short List Instead of a Catalog

Skills posed the opposite problem. They are useful to have close at hand, but printing the entire catalog in a narrow column is pointless. I kept a filter, a row limit, and an explicit sort order.

Favorite Skills come first in every workspace. They are followed by up to ten recently inserted commands, then everything else alphabetically. Both favorites and history are tied to the Skill source, not only its short name. The bookmark control appears both in the sidebar row and in the confirmation dialog, so changing favorites does not require switching context.

Selecting a Skill does not run it silently. A dialog first shows its description and full source path; after confirmation, the `/<name>` command is inserted into the input. For a familiar Skill, that check can be disabled with a checkbox and restored later in settings. I wanted a fast path for trusted commands without turning an unfamiliar Skill into an unexplained button.

![Skills in the sidebar](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/06-skills-sidebar.png)

The row limit is applied after filtering and sorting. Favorites and recent Skills therefore stay in the short list instead of merely receiving an icon somewhere in a full catalog.

## MCP: The Reason This Started

Originally, I planned to change only the MCP section. I wanted to filter servers by name, keep favorites at the top, and toggle connections directly from each row. That small interface change ended up requiring state persistence, bulk operations, and saved presets.

Each MCP server has a circular status indicator resembling a radio button. Selecting a row connects or disconnects the server without another menu. `Connect all` and `Disconnect all` run the applicable changes in parallel. If some operations fail, successful changes remain in place and only failed ones need to be retried.

I do not leave long error text inside a row. A failed server gets a dedicated information button that opens a scrollable dialog with the server name, status, and full error, keeping every list row the same height.

![Managing MCP servers in the sidebar](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/08-mcp-sidebar.png)

Desired states can be saved globally or for the current worktree. I cannot change startup order, however: OpenCode initializes enabled MCP servers before TUI plugins. A server saved as disabled may connect briefly at startup before Navigator can disconnect it. I documented that limitation explicitly so the setting does not promise more than it can deliver.

Once I had several combinations, named MCP presets followed. Applying one manually begins with a preview that separates future connections, disconnections, unchanged servers, and unavailable servers, with real changes listed first. Merely opening the preview does nothing; the user must select `Apply`. If Navigator cannot obtain a fresh server list or another operation is already running, that action is disabled.

A layout preset can be linked to one MCP preset. This workspace profile is still applied manually: one preview shows changes from both presets, and entering the project never switches anything automatically. Applying it also does not turn the selected layout into the new default.

![MCP preset preview](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/23-mcp-preset-preview.png)

A saved preset performs only the necessary toggles. Servers absent from the current scope are marked as skipped rather than successfully changed. This matters when the same settings are used across different worktrees. MCP favorites are stored separately by server name and only move a row upward; bookmarking a server never connects it.

For a long list, bookmarks alone were not enough. I added custom MCP groups in settings: favorites stay first, followed by groups and their servers in alphabetical order. Assignments are shared by all workspaces and remain stored when a server is temporarily absent from the current project.

![Custom MCP groups](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/31-mcp-groups.png)

## Search Everything: One Entry Point for Four Lists

As soon as sections gained row limits and could be hidden, I needed a way to search their complete source lists. That became Search Everything. It opens with `Ctrl+Shift+K` and combines four tabs: Skills, Subagents, MCP, and Actions.

The query is shared across tabs, but each tab preserves its own selected row and scroll position. You can begin with a Skill name, switch to MCP, and return without losing your place. Search is independent of whether the corresponding sidebar section is visible or how many rows it may show. Even hidden Quick Actions remain available.

![Searching Skills](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/09-search-skills.png)

![Toggling MCP from Search Everything](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/11-search-mcp.png)

This behavior was critical for MCP. A connection changes directly in the results, the dialog stays open after both success and failure, and the query, selection, and scroll position remain intact. Background updates do not send the user back to the first row either.

Search does close when the session or workspace changes. Preserving the window in that case would be a mistake: continuing an operation against a stale target is more dangerous than reopening search.

## Settings Without Editing JSON

There is no universal sidebar. One session revolves around subagents, another around MCP, and sometimes Todo is enough. I therefore made visibility, order, expansion, and row count configurable for every section. Quick Actions can also be hidden and reordered.

Navigator works with an explicit allowlist of argument-free OpenCode commands. It includes `Rename`, `Timeline`, `Copy transcript`, `Export`, `Compact`, session navigation, creating and forking sessions, copying the last response, message navigation, and the global automatic permission approval toggle. Actions can be bookmarked to place them first, in configured order, both in the sidebar and in search. Usage frequency never changes that order, and even a bookmarked action can be hidden. If a command is unavailable on the current screen or in the installed OpenCode version, its row remains visible and explains why.

![Section settings](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/13-settings-sections.png)

Settings can be changed globally or only for the current worktree. Declarative values come from three places at once: the plugin's `options` dictionary, the user-level `~/.config/.opencode-navigator/settings.json`, and the project-level `.opencode/navigator.json`, which is convenient to keep in version control. These files merge field by field to establish defaults, with saved global preferences, worktree preferences, and temporary process state layered above them. Reset removes only the selected layer instead of copying a parent value into it. Favorites, history, trusted Skills, and other private data never enter declarative files.

Layouts can be saved as named presets. They contain section visibility, expansion, and order. As with MCP, manual application starts with a preview showing destination positions and state changes. Opening the preview does not alter the layout; `Cancel` and `Escape` return to the menu, while `Apply` confirms the changes. Even then, the preset does not become the default: that requires the separate `Save current layout as default` command.

![Layout preset preview](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/20-layout-preset-preview.png)

The layout and desired MCP states for the selected scope can be copied as versioned JSON. Import does not write immediately: Navigator first validates the pasted text and previews both the changes and any fields from a future version that will be skipped. Worktree paths, keyboard shortcuts, favorites, and history are excluded from the portable file. Application uses one atomic write and is cancelled if the user changes scope during the preview or another process modifies preferences first.

![Settings import preview](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/34-settings-import-preview.png)

A mouse is optional. `Ctrl+Shift+F` moves focus into the sidebar. `Up`/`Down` and `j`/`k` move between visual rows, `Left`/`Right` move among controls on one row, `Enter` activates the selection, and `Escape` returns focus.

Pressing `?` opens keyboard help. `Ctrl+Shift+B` starts a temporary shortcut mode: `h` toggles sidebar visibility, while `t`, `a`, `s`, `q`, `l`, and `m` focus Todo, Subagents, Skills, Quick Actions, LSP, and MCP. The shortcuts for this mode, direct focus, and search can be changed in settings when the terminal intercepts the defaults.

![Keyboard navigation help](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/25-keyboard-help.png)

On first launch, a seven-step wizard introduces monitoring, search, Skills, Quick Actions, LSP, MCP, and customization before asking which sections should be visible. I deliberately moved layout selection to the final screen: by then, the user knows what each option enables and why it might matter.

For LSP, I intentionally stopped at compact status indicators. Selecting one reveals the server name in place, but there is no separate dialog for the root directory or diagnostics: OpenCode may return an empty path and does not expose internal error text to the plugin. I chose not to fabricate details the API does not provide.

## Why Rounded Corners Required a Separate Font

A terminal interface quickly reminds you that its pixels are cells. A single-line button can use existing Nerd Font glyphs for rounded ends. Multiline selection is different: it needs a continuous background with corners that cut quarter circles from it. Nerd Fonts do not contain suitable glyphs.

I did not want to modify an existing Nerd Font for four symbols. The package therefore ships a small fallback font, OpenCode Navigator Corners, containing four corner masks, while the terminal keeps its primary Nerd Font selected. The additional font is needed only for rounded multiline highlights and must be installed on the machine displaying the terminal, even when OpenCode itself runs remotely.

If the additional font is not installed or the terminal handles fallback fonts poorly, `Multiline corner font` can be disabled independently under `Behavior`. Nerd Font icons and rounded single-line controls remain, while multiline highlights become clean rectangles without missing-glyph placeholders. Full `Text fallback` is still available for terminals without a Nerd Font.

![The interface in Text fallback mode](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/28-text-fallback.png)

I also keep screenshots rendered with a Nerd Font but without the corner font installed and with multiline masks disabled. This lets the documentation show the supported rectangular mode rather than a screen full of replacement glyphs.

![Nerd Font without the additional corner font](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/35-no-corner-font-layout-preview.png)

## A Bug at the Boundary Between Two Solid Instances

OpenCode Navigator is written in TypeScript/TSX with Solid and OpenTUI. The first serious problems appeared not in sorting or key handling, but at the boundary between the plugin and OpenCode.

One early build looked almost correct. I selected a row, the handler ran, and the new value was saved, but the interface did not update.

After a restart, the section would suddenly be expanded. The event had fired. The data was correct. The screen still showed stale state.

The cause was a second copy of Solid inside the bundle. Plugin components created reactivity in a different runtime instance from the one OpenCode used to render them. One Solid instance saw the signal change; the other saw nothing.

The fix was short, though finding it took much longer. `solid-js`, `@opentui/solid`, and the other OpenTUI packages must remain external and share a single runtime instance with OpenCode. They are declared as `peerDependencies` in `package.json`, and the resulting TUI bundle remains unminified without embedding them. From that point on, testing source components alone was clearly insufficient because the bug existed only in the built artifact.

## Preferences in Two OpenCode Windows

The second problem looked less interesting but risked data loss. Favorites, saved presets, Skill usage history, and other settings live in one JSON file inside OpenCode's state directory. A normal write is enough while one process runs; two open windows can overwrite each other's changes.

To stop two processes from writing preferences simultaneously, I added a lock file containing the owner's PID. After acquiring the lock, the process writes the complete JSON to a temporary file and replaces the main file with `rename`, so readers never see a partially written document. After a crash, the next process checks the PID and removes a stale lock.

This is not a distributed database or a universal conflict-resolution system. I needed it to handle a few local processes and avoid leaving a corrupted preferences file after an interrupted write. It solves that problem, and I do not claim more for it.

## Tests That Click the Mouse and Photograph the Terminal

After the two-Solid-instance bug, I stopped treating unit tests as sufficient protection. Some tests now build the final `dist/tui.js` first and then load it into an OpenTUI test renderer.

The tests click with the mouse, type into filters, navigate dialogs with the keyboard, and compare the resulting character frame. Separate checks cover 500-row lists and loading the built plugin into a real OpenCode process through a PTY.

Screenshots also became reproducible test artifacts instead of a manual photo session before release. A Docker image runs the real Ghostty terminal through a virtual X11 display and uses a pinned Nerd Font. Most scenes install the corner font; three intentionally omit it. Every task, session, path, Skill, server, error, and saved preset is synthetic. `bun run screenshots:verify` renders all 37 scenes again in a temporary directory and compares the PNG files byte for byte with their references.

That setup is not free. It requires Docker with Linux ARM64 support, and pixel-level comparison is sensitive to the environment, so Ghostty and font versions must be pinned. In return, the README screenshots and the tested interface are now produced by exactly the same process.

## Installation

The current OpenCode Navigator version at the time of writing is `0.15.0`. It supports OpenCode `1.18.30` and later, including OpenCode 2.x.

To install it for all projects:

```sh
opencode plugin --global opencode-navigator
```

For the current project:

```sh
opencode plugin opencode-navigator
```

In OpenCode 1.x, the command adds the package to the `plugin` array in `tui.json`. To prevent the built-in sections from duplicating Navigator, disable them in the same file:

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

OpenCode 1.x uses `.opencode/tui.json` for a project installation and `~/.config/opencode/tui.json` for a global one. In OpenCode 2.x, install Navigator through the built-in plugin manager: `opencode plugin add opencode-navigator`. The command updates the global `~/.config/opencode/cli.json`; the equivalent configuration is:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-navigator"]
}
```

OpenCode 2.0.16 does not yet expose Todo or LSP data to TUI plugins. Navigator therefore keeps Todo visible with an explicit host-limitation message, hides LSP, and preserves Subagents, Skills, Quick Actions, MCP, search, and settings. Restart OpenCode after changing the configuration.

For rounded multiline highlights in Nerd Font mode, install the additional font on the machine running the terminal:

```sh
npx --yes --package=opencode-navigator opencode-navigator-font
```

The installer requires Node.js 20+ and npm. After installation, fully quit and reopen the terminal application, not only OpenCode. You do not need to change your primary Nerd Font. If you prefer not to install the fallback font, disable `Settings → Behavior → Multiline corner font`; Nerd Font icons remain enabled.

The source and documentation are on [GitHub](https://github.com/St1ggy/opencode-navigator), and the package is published on [npm](https://www.npmjs.com/package/opencode-navigator). The repository also contains a [gallery of all 37 states](https://github.com/St1ggy/opencode-navigator/tree/main/screenshots): Todo and Subagent filters, all four search tabs, settings, saved presets, Skill confirmation, first-run onboarding, and text mode.

## What Comes Next

Navigator grew from a very personal irritation, so I am curious how closely my choices match other people's workflows. Some people work entirely from the keyboard; some have two MCP servers, while others have dozens. Some constantly need Todo, while others hide it immediately.

If you try the plugin, share in the comments what the sidebar makes easier and what you still have to hunt for. Examples involving themes, terminals, keyboard shortcuts, and fallback fonts are especially useful. Bugs and suggestions are also welcome in [GitHub Issues](https://github.com/St1ggy/opencode-navigator/issues).

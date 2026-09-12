# opencode-pretty-sidebar

A focused sidebar for the OpenCode TUI. It keeps the session title at the top,
puts tasks first, removes token and cost counters, and makes every MCP server
clickable directly in the sidebar.

## Features

- Theme-aware session title and activity indicator
- Collapsible Todo section with progress and priority indicators
- Active subagent list with live statuses and click-to-open navigation
- Collapsible MCP section with live radio-style connection controls
- Click any MCP row to connect or disconnect it
- Persist disabled MCP servers per worktree
- Toggle the sidebar with `Ctrl+Shift+B`
- Keep OpenCode's compact project path and branch footer

Requires OpenCode 1.18.30 or newer.

## Installation

Install the plugin for the current project:

```sh
opencode plugin opencode-pretty-sidebar
```

Use `--global` to install it for every project:

```sh
opencode plugin --global opencode-pretty-sidebar
```

`opencode plug` is an alias for `opencode plugin`.

The installer adds the package to the `plugin` array in `tui.json`. To avoid
duplicating sidebar sections, also disable the overlapping built-in plugins:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-pretty-sidebar"],
  "plugin_enabled": {
    "internal:sidebar-context": false,
    "internal:sidebar-mcp": false,
    "internal:sidebar-lsp": false,
    "internal:sidebar-todo": false,
    "internal:sidebar-files": false
  }
}
```

Use `.opencode/tui.json` for a project installation or
`~/.config/opencode/tui.json` for a global installation. Restart OpenCode after
changing the configuration.

## Develop locally

This repository already contains `.opencode/tui.json`, so starting OpenCode in
the repository loads `src/tui.tsx` and disables the overlapping built-in
sidebar blocks.

```sh
bun install
opencode
```

OpenCode reads TUI configuration at startup. Restart it after changing the
plugin or `tui.json`.

## Options

Pass options with a tuple entry:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-pretty-sidebar",
      {
        "persist_mcp": true,
        "toggle_key": "ctrl+shift+b"
      }
    ]
  ]
}
```

- `persist_mcp`: remembers disabled MCP servers per worktree. Defaults to
  `true`.
- `toggle_key`: sidebar shortcut. Defaults to `ctrl+shift+b`. Try `alt+s` if
  your terminal does not distinguish `Ctrl+Shift+B` from `Ctrl+B`.

OpenCode initializes enabled MCP servers before TUI plugins. A remembered
server can therefore connect briefly during startup before this plugin
disconnects it.

Todo priorities are read-only because OpenCode does not expose a Todo mutation
API to TUI plugins.

## Scripts

```sh
bun test
bun run typecheck
bun run build
bun run check
```

## Publishing

Publishing is handled by `.github/workflows/publish.yml` when a GitHub Release
is published. The release tag must match the package version, for example
`v1.2.3` for version `1.2.3`.

The workflow uses npm Trusted Publishing with provenance. Configure
`St1ggy/opencode-pretty-sidebar` and `publish.yml` as the trusted GitHub Actions
publisher in the package settings on npmjs.com before publishing a release.

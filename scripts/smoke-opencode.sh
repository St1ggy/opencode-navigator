#!/usr/bin/env bash

set -euo pipefail

for command in expect opencode; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$command" >&2
    exit 1
  fi
done

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin="$root/dist/tui.js"
if [[ ! -f "$plugin" ]]; then
  printf 'Missing built plugin: %s\n' "$plugin" >&2
  exit 1
fi

temporary="$(mktemp -d)"
cleanup() {
  if [[ "${OPENCODE_SMOKE_KEEP_ARTIFACTS:-0}" == "1" ]]; then
    printf 'OpenCode smoke artifacts: %s\n' "$temporary"
  else
    rm -rf "$temporary"
  fi
}
trap cleanup EXIT
mkdir -p "$temporary/cache" "$temporary/config" "$temporary/data" "$temporary/home" "$temporary/state" "$temporary/workspace"

plugin_url="file://$plugin"
config="$temporary/tui.json"
transcript="$temporary/transcript.log"
plain_transcript="$temporary/transcript.txt"
marker="$temporary/state/opencode/opencode-pretty-sidebar/preferences.json"
session_file="$temporary/session-id"

cat >"$config" <<JSON
{
  "\$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "$plugin_url",
      {
        "persist_mcp": false,
        "focus_key": "ctrl+shift+f",
        "search_key": "alt+y",
        "toggle_key": "ctrl+shift+b"
      }
    ]
  ],
  "plugin_enabled": {
    "internal:sidebar-context": false,
    "internal:sidebar-mcp": false,
    "internal:sidebar-lsp": false,
    "internal:sidebar-todo": false
  }
}
JSON

export HOME="$temporary/home"
export XDG_CACHE_HOME="$temporary/cache"
export XDG_CONFIG_HOME="$temporary/config"
export XDG_DATA_HOME="$temporary/data"
export XDG_STATE_HOME="$temporary/state"
export OPENCODE_CONFIG_DIR="$temporary/config"
export OPENCODE_TUI_CONFIG="$config"
export OPENCODE_DISABLE_AUTOUPDATE=true
export OPENCODE_DISABLE_LSP_DOWNLOAD=true
export OPENCODE_DISABLE_MODELS_FETCH=true
export OPENCODE_DISABLE_TERMINAL_TITLE=true
export OPENCODE_SMOKE_TRANSCRIPT="$transcript"
export OPENCODE_SMOKE_WORKSPACE="$temporary/workspace"
export OPENCODE_SMOKE_MARKER="$marker"
export OPENCODE_SMOKE_SESSION_FILE="$session_file"
export TERM=xterm-256color
export COLORTERM=truecolor

bun --eval '
  import { createOpencode } from "@opencode-ai/sdk/v2"
  const { client, server } = await createOpencode({ port: 0, timeout: 15_000 })
  try {
    const result = await client.session.create({
      directory: process.env.OPENCODE_SMOKE_WORKSPACE,
      title: "OpenCode Navigator PTY smoke",
    })
    if (!result.data?.id) throw new Error("OpenCode did not create a smoke session")
    await Bun.write(process.env.OPENCODE_SMOKE_SESSION_FILE, result.data.id)
  } finally {
    server.close()
  }
'
export OPENCODE_SMOKE_SESSION_ID="$(<"$session_file")"

expect <<'EXPECT'
  log_user 0
  log_file -a -noappend $env(OPENCODE_SMOKE_TRANSCRIPT)
  set timeout 20
  spawn -noecho opencode $env(OPENCODE_SMOKE_WORKSPACE) --session $env(OPENCODE_SMOKE_SESSION_ID) --print-logs --log-level DEBUG
  stty rows 40 columns 120
  after 100
  send -- "\033]10;rgb:ffff/ffff/ffff\007"
  send -- "\033]11;rgb:0000/0000/0000\007"
  send -- "\033P>|xterm(370)\033\\"
  send -- "\033P1+r4d73=31\033\\"
  send -- "\033\[?1016;2\044y\033\[?2027;2\044y\033\[?2031;2\044y"
  send -- "\033\[?1004;2\044y\033\[?2004;2\044y\033\[?2026;2\044y"
  send -- "\033\[?0u\033\[?1;2c\033\[4;800;1200t\033\[1;3R\033\[1;3R"
  send -- "\033]99;i=opentui-notifications:p=0;\007"
  send -- "\033]1337;Capabilities=\007"
  set deadline [expr {[clock seconds] + 20}]
  while {![file exists $env(OPENCODE_SMOKE_MARKER)]} {
    if {[clock seconds] >= $deadline} {
      send -- "\003"
      after 1000
      close
      wait
      puts stderr "Timed out waiting for the sidebar plugin"
      exit 124
    }
    set timeout 1
    expect {
      -re {.+} {}
      eof {
        puts stderr "OpenCode exited before rendering the sidebar plugin"
        exit 1
      }
      timeout {}
    }
  }
  after 500
  send -- "\033"
  after 200
  send -- "\033y"
  set timeout 10
  expect {
    -re {Search Everything} {}
    timeout { puts stderr "Search Everything did not open via its shortcut"; exit 1 }
    eof { puts stderr "OpenCode exited while opening Search Everything"; exit 1 }
  }
  expect {
    -re {Search skills, subagents, MCP, actions} {}
    timeout { puts stderr "Search input did not finish rendering"; exit 1 }
    eof { puts stderr "OpenCode exited while rendering search input"; exit 1 }
  }
  after 150
  send -- "\t\t\t"
  expect {
    -re {Rename} {}
    timeout { puts stderr "Search Everything did not switch to the Actions tab"; exit 1 }
    eof { puts stderr "OpenCode exited while switching search tabs"; exit 1 }
  }
  send -- "zzzznomatch"
  expect {
    -re {zzzznomatch} {}
    timeout { puts stderr "Search Everything did not accept the search query"; exit 1 }
    eof { puts stderr "OpenCode exited while entering a search query"; exit 1 }
  }
  expect {
    -re {No matching results} {}
    timeout { puts stderr "Search Everything did not filter its results"; exit 1 }
    eof { puts stderr "OpenCode exited while searching"; exit 1 }
  }
  send -- "\033"
  after 200
  send -- "\003"
  after 200
  send -- "\003"
  set timeout 5
  expect {
    eof {
      wait
    }
    timeout {
      close
      wait
    }
  }
EXPECT

perl -pe 's/\e\[[0-?]*[ -\/]*[@-~]//g; s/\e\][^\a]*(?:\a|\e\\)//g' "$transcript" >"$plain_transcript"

if ! grep -Eq '"onboardingCompleted"[[:space:]]*:[[:space:]]*true' "$marker"; then
  printf 'OpenCode started, but the sidebar plugin did not finish bootstrap.\n' >&2
  printf 'Preferences: %s\n' "$marker" >&2
  exit 1
fi

if grep -Eqi 'failed to load.*opencode-navigator|error.*dist/tui\.js' "$plain_transcript"; then
  printf 'OpenCode reported a sidebar plugin load error.\n' >&2
  printf 'Transcript: %s\n' "$plain_transcript" >&2
  exit 1
fi

printf 'OpenCode PTY smoke test passed.\n'

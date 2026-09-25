#!/usr/bin/env bash

set -euo pipefail

for command in expect; do
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
    printf 'OpenCode 2 smoke artifacts: %s\n' "$temporary"
  else
    rm -rf "$temporary"
  fi
}
trap cleanup EXIT
mkdir -p "$temporary/bin" "$temporary/cache" "$temporary/config/opencode" "$temporary/data" \
  "$temporary/home" "$temporary/state" "$temporary/workspace/.opencode"

opencode_bin="${OPENCODE_V2_SMOKE_BIN:-$(command -v opencode2 || command -v opencode || true)}"
opencode_version="$($opencode_bin --version 2>/dev/null || true)"
if [[ "$opencode_version" != *2.* ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    printf 'OpenCode 2.x is required. Set OPENCODE_V2_SMOKE_BIN explicitly.\n' >&2
    exit 1
  fi

  npm install --prefix "$temporary/opencode-v2" --no-package-lock --no-save --silent @opencode/cli@2.0.16
  opencode_bin="$temporary/opencode-v2/node_modules/.bin/opencode2"
fi

if [[ "$($opencode_bin --version 2>/dev/null || true)" != *2.* ]]; then
  printf 'OpenCode 2.x compatibility smoke could not resolve a 2.x executable.\n' >&2
  exit 1
fi

cli_config="$temporary/config/opencode/cli.json"
cat >"$cli_config" <<JSON
{
  "\$schema": "https://opencode.ai/v2/cli.json",
  "animations": false,
  "plugins": [
    {
      "package": "$root/dist",
      "options": {
        "persist_mcp": false,
        "focus_key": "ctrl+shift+f",
        "search_key": "alt+y",
        "toggle_key": "ctrl+shift+b"
      }
    }
  ],
  "session": {
    "permissions": "autoaccept",
    "sidebar": "auto"
  }
}
JSON

cat >"$temporary/workspace/.opencode/navigator.json" <<JSON
{
  "behavior": {
    "persistMcp": false,
    "focusKey": "ctrl+shift+f",
    "searchKey": "alt+y",
    "toggleKey": "ctrl+shift+b"
  }
}
JSON

export HOME="$temporary/home"
export XDG_CACHE_HOME="$temporary/cache"
export XDG_CONFIG_HOME="$temporary/config"
export XDG_DATA_HOME="$temporary/data"
export XDG_STATE_HOME="$temporary/state"
export OPENCODE_CONFIG_DIR="$temporary/config/opencode"
export OPENCODE_CLI_CONFIG_CONTENT="$(<"$cli_config")"
export OPENCODE_DISABLE_AUTOUPDATE=true
export OPENCODE_DISABLE_LSP_DOWNLOAD=true
export OPENCODE_DISABLE_MODELS_FETCH=true
export OPENCODE_DISABLE_TERMINAL_TITLE=true
export OPENCODE_V2_SMOKE_BIN="$opencode_bin"
export OPENCODE_V2_SMOKE_TRANSCRIPT="$temporary/transcript.log"
export OPENCODE_V2_SMOKE_WORKSPACE="$temporary/workspace"
export OPENCODE_V2_SMOKE_MARKER="$temporary/state/opencode/opencode-pretty-sidebar/preferences.json"
export TERM=xterm-256color
export COLORTERM=truecolor

session_json="$($opencode_bin api --standalone session.create --data "{\"title\":\"OpenCode Navigator 2.x smoke\",\"location\":{\"directory\":\"$temporary/workspace\"}}")"
session_id="$(SESSION_JSON="$session_json" bun --eval '
  const value = JSON.parse(process.env.SESSION_JSON)
  const id = value.id ?? value.data?.id
  if (!id) throw new Error("OpenCode 2 did not create a smoke session")
  process.stdout.write(id)
')"
export OPENCODE_V2_SMOKE_SESSION_ID="$session_id"

expect <<'EXPECT'
  log_user 0
  log_file -a -noappend $env(OPENCODE_V2_SMOKE_TRANSCRIPT)
  set timeout 30
  spawn -noecho $env(OPENCODE_V2_SMOKE_BIN) $env(OPENCODE_V2_SMOKE_WORKSPACE) --standalone --session $env(OPENCODE_V2_SMOKE_SESSION_ID) --print-logs --log-level debug
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
  set deadline [expr {[clock seconds] + 30}]
  while {![file exists $env(OPENCODE_V2_SMOKE_MARKER)]} {
    if {[clock seconds] >= $deadline} {
      send -- "\003"
      after 1000
      close
      wait
      puts stderr "Timed out waiting for Navigator in OpenCode 2"
      exit 124
    }
    set timeout 1
    expect {
      -re {.+} {}
      eof {
        puts stderr "OpenCode 2 exited before rendering Navigator"
        exit 1
      }
      timeout {}
    }
  }
  after 1000
  send -- "\033"
  after 200
  send -- "\033\[44;5u"
  set timeout 10
  expect {
    -re {Navigator settings} {}
    timeout { puts stderr "Navigator Settings did not open in OpenCode 2"; exit 1 }
    eof { puts stderr "OpenCode 2 exited while opening Navigator Settings"; exit 1 }
  }
  send -- "\033"
  # OpenCode 2 tears down dialog keymap layers asynchronously.
  after 1000
  send -- "\033y"
  expect {
    -re {Search Everything} {}
    timeout { puts stderr "Search Everything did not open in OpenCode 2"; exit 1 }
    eof { puts stderr "OpenCode 2 exited while opening Search Everything"; exit 1 }
  }
  send -- "\033"
  after 200
  send -- "\003"
  after 200
  send -- "\003"
  set timeout 5
  expect {
    eof { wait }
    timeout {
      close
      wait
    }
  }
EXPECT

plain_transcript="$temporary/transcript.txt"
perl -pe 's/\e\[[0-?]*[ -\/]*[@-~]//g; s/\e\][^\a]*(?:\a|\e\\)//g' "$OPENCODE_V2_SMOKE_TRANSCRIPT" >"$plain_transcript"

if ! grep -Eq '"onboardingCompleted"[[:space:]]*:[[:space:]]*true' "$OPENCODE_V2_SMOKE_MARKER"; then
  printf 'OpenCode 2 started, but Navigator did not finish bootstrap.\n' >&2
  exit 1
fi

if grep -Eqi 'failed to load.*opencode-navigator|error.*dist/tui\.js' "$plain_transcript"; then
  printf 'OpenCode 2 reported a Navigator load error.\n' >&2
  printf 'Transcript: %s\n' "$plain_transcript" >&2
  exit 1
fi

printf 'OpenCode 2 PTY smoke test passed.\n'

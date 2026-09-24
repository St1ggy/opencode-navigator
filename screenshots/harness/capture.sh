#!/usr/bin/env bash

set -Eeuo pipefail

scene="${SCREENSHOT_SCENE:-hero}"
output="${SCREENSHOT_OUTPUT:-$scene.png}"

export DISPLAY=:99
export GDK_BACKEND=x11
export GDK_SCALE=1
export GDK_DPI_SCALE=1
export LIBGL_ALWAYS_SOFTWARE=true
export GALLIUM_DRIVER=llvmpipe
export MESA_SHADER_CACHE_DISABLE=true
export XDG_RUNTIME_DIR=/tmp/runtime-harness

if [[ "${SCREENSHOT_NO_CORNER_FONT:-false}" == "true" ]]; then
  rm -f /usr/local/share/fonts/OpenCodeNavigatorCorners.ttf
  rm -rf /var/cache/fontconfig/* "$XDG_CACHE_HOME/fontconfig"
  fc-cache -r >/tmp/font-cache.log
  if [[ -n "$(fc-list ':family=OpenCode Navigator Corners')" ]]; then
    printf 'Navigator corner font is still available.\n' >&2
    exit 1
  fi
fi

mkdir -p "$XDG_RUNTIME_DIR" /out
chmod 0700 "$XDG_RUNTIME_DIR"
rm -f /tmp/navigator-fixture.ready
node /harness/setup.mjs
(
  cd /workspace/atlas-console
  opencode import /tmp/navigator-session.json >/tmp/import.log 2>&1
)

Xvfb "$DISPLAY" -screen 0 1600x1000x24 -dpi 96 -nolisten tcp -noreset +extension GLX +render >/tmp/xvfb.log 2>&1 &
xvfb_pid=$!
ghostty_pid=

cleanup() {
  status=$?
  trap - EXIT INT TERM
  if [[ -n "$ghostty_pid" ]]; then kill "$ghostty_pid" 2>/dev/null || true; fi
  kill "$xvfb_pid" 2>/dev/null || true
  if (( status != 0 )); then
    for log in ghostty import opencode openbox picom xvfb; do
      if [[ -f "/tmp/$log.log" ]]; then cp "/tmp/$log.log" "/out/$scene-$log.log"; fi
    done
  fi
  exit "$status"
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 100); do
  if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then break; fi
  sleep 0.05
done
xdpyinfo -display "$DISPLAY" >/dev/null
xrandr --display "$DISPLAY" --dpi 96
openbox --sm-disable >/tmp/openbox.log 2>&1 &
xsetroot -solid '#111318'
picom --backend xrender --no-vsync --no-fading-openclose >/tmp/picom.log 2>&1 &

ghostty --config-default-files=false --config-file=/harness/ghostty.conf -e /harness/run-opencode.sh >/tmp/ghostty.log 2>&1 &
ghostty_pid=$!

window_id=$(timeout 30s xdotool search --sync --onlyvisible --limit 1 --class org.opencode.navigator.screenshot)
xdotool windowsize "$window_id" 1440 900
xdotool windowmove "$window_id" 0 0
if ! timeout 80s bash -c 'until [[ -e /tmp/navigator-fixture.ready ]]; do sleep 0.05; done'; then
  import -display "$DISPLAY" -window root -crop 1440x900+0+0 /tmp/timeout.png
  convert /tmp/timeout.png +repage -alpha off -strip PNG24:/out/"$scene-timeout.png"
  printf 'Timed out waiting for the Navigator fixture plugin.\n' >&2
  exit 124
fi
sleep 1

case "$scene" in
  search-skills | search-subagents | search-mcp | search-actions) sleep 1 ;;
  hero | todo-active | todo-finished | subagents-all | subagents-errors | sidebar-skills | sidebar-actions-lsp | sidebar-mcp | search-skills | search-subagents | search-mcp | search-actions | settings-sections | settings-scope | settings-presets | settings-behavior | settings-defaults | settings-portability | settings-trusted-skills | settings-mcp-groups | settings-control-hover | quick-actions-settings | layout-preset-menu | layout-preset-preview | mcp-presets | mcp-preset-actions | mcp-preset-preview | mcp-error | skill-confirmation | keyboard-help | text-fallback) ;;
  settings-import-preview)
    sleep 1
    xdotool type --clearmodifiers --delay 5 '{"format":"opencode-navigator/settings","version":1,"layout":{"sections":{"todo":false,"skills":true},"expanded":{"mcp":true},"order":["mcp","todo","future"]},"mcp":{"docs":"disabled","metrics":"enabled"},"futureCategory":true}'
    xdotool key Return
    sleep 1
    ;;
  setup-tour | setup-sections) sleep 1 ;;
  *)
    printf 'Unknown screenshot scene: %s\n' "$scene" >&2
    exit 2
    ;;
esac

if [[ "$scene" == "settings-control-hover" ]]; then
  xdotool mousemove 1385 32
else
  xdotool mousemove 1599 999
fi
sleep 0.25
import -display "$DISPLAY" -window root -crop 1440x900+0+0 /tmp/capture.png
convert /tmp/capture.png +repage -alpha off -strip PNG24:/out/"$output"
identify /out/"$output"

#!/usr/bin/env bash

set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="opencode-navigator-screenshots:local"
mode="${1:-generate}"
scenes=(hero todo-active todo-finished subagents-all subagents-errors sidebar-skills sidebar-actions-lsp sidebar-mcp search-skills search-subagents search-mcp search-actions settings-sections settings-scope settings-presets settings-behavior settings-defaults quick-actions-settings layout-preset-menu layout-preset-preview mcp-presets mcp-preset-actions mcp-preset-preview skill-confirmation keyboard-help setup-tour setup-sections text-fallback settings-trusted-skills settings-control-hover settings-mcp-groups mcp-error settings-portability settings-import-preview no-corner-layout-preview no-corner-mcp-preview no-corner-import-preview)

file_for_scene() {
  case "$1" in
    hero) printf '%s\n' 01-hero-sidebar.png ;;
    todo-active) printf '%s\n' 02-todo-active.png ;;
    todo-finished) printf '%s\n' 03-todo-finished.png ;;
    subagents-all) printf '%s\n' 04-subagents-all.png ;;
    subagents-errors) printf '%s\n' 05-subagents-errors.png ;;
    sidebar-skills) printf '%s\n' 06-skills-sidebar.png ;;
    sidebar-actions-lsp) printf '%s\n' 07-quick-actions-lsp.png ;;
    sidebar-mcp) printf '%s\n' 08-mcp-sidebar.png ;;
    search-skills) printf '%s\n' 09-search-skills.png ;;
    search-subagents) printf '%s\n' 10-search-subagents.png ;;
    search-mcp) printf '%s\n' 11-search-mcp.png ;;
    search-actions) printf '%s\n' 12-search-actions.png ;;
    settings-sections) printf '%s\n' 13-settings-sections.png ;;
    settings-scope) printf '%s\n' 14-settings-scope.png ;;
    settings-presets) printf '%s\n' 15-settings-presets.png ;;
    settings-behavior) printf '%s\n' 16-settings-behavior.png ;;
    settings-defaults) printf '%s\n' 17-settings-defaults.png ;;
    quick-actions-settings) printf '%s\n' 18-quick-actions-settings.png ;;
    layout-preset-menu) printf '%s\n' 19-layout-preset-menu.png ;;
    layout-preset-preview) printf '%s\n' 20-layout-preset-preview.png ;;
    mcp-presets) printf '%s\n' 21-mcp-presets.png ;;
    mcp-preset-actions) printf '%s\n' 22-mcp-preset-actions.png ;;
    mcp-preset-preview) printf '%s\n' 23-mcp-preset-preview.png ;;
    skill-confirmation) printf '%s\n' 24-skill-confirmation.png ;;
    keyboard-help) printf '%s\n' 25-keyboard-help.png ;;
    setup-tour) printf '%s\n' 26-setup-tour.png ;;
    setup-sections) printf '%s\n' 27-setup-sections.png ;;
    text-fallback) printf '%s\n' 28-text-fallback.png ;;
    settings-trusted-skills) printf '%s\n' 29-trusted-skills.png ;;
    settings-control-hover) printf '%s\n' 30-settings-control-hover.png ;;
    settings-mcp-groups) printf '%s\n' 31-mcp-groups.png ;;
    mcp-error) printf '%s\n' 32-mcp-error.png ;;
    settings-portability) printf '%s\n' 33-portable-settings.png ;;
    settings-import-preview) printf '%s\n' 34-settings-import-preview.png ;;
    no-corner-layout-preview) printf '%s\n' 35-no-corner-font-layout-preview.png ;;
    no-corner-mcp-preview) printf '%s\n' 36-no-corner-font-mcp-preview.png ;;
    no-corner-import-preview) printf '%s\n' 37-no-corner-font-import-preview.png ;;
    *) return 1 ;;
  esac
}

if [[ "$mode" != "generate" && "$mode" != "--verify" ]]; then
  printf 'Usage: %s [--verify]\n' "$0" >&2
  exit 2
fi

temporary=
output="$root/screenshots"
if [[ "$mode" == "--verify" ]]; then
  temporary="$(mktemp -d)"
  output="$temporary"
  trap 'rm -rf "$temporary"' EXIT
else
  rm -f "$output"/*.png
fi

bun run build
docker build --platform linux/arm64 -f "$root/screenshots/harness/Dockerfile" -t "$image" "$root"

for scene in "${scenes[@]}"; do
  file="$(file_for_scene "$scene")"
  fixture_scene="$scene"
  no_corner_font=false
  case "$scene" in
    no-corner-layout-preview) fixture_scene=layout-preset-preview; no_corner_font=true ;;
    no-corner-mcp-preview) fixture_scene=mcp-preset-preview; no_corner_font=true ;;
    no-corner-import-preview) fixture_scene=settings-import-preview; no_corner_font=true ;;
  esac
  docker run --rm --platform linux/arm64 \
    -e "SCREENSHOT_SCENE=$fixture_scene" \
    -e "SCREENSHOT_NO_CORNER_FONT=$no_corner_font" \
    -e "SCREENSHOT_OUTPUT=$file" \
    -v "$output:/out" \
    "$image"
done

if [[ "$mode" == "--verify" ]]; then
  for scene in "${scenes[@]}"; do
    file="$(file_for_scene "$scene")"
    if ! cmp -s "$root/screenshots/$file" "$output/$file"; then
      printf 'Screenshot is not reproducible: screenshots/%s\n' "$file" >&2
      exit 1
    fi
  done
  printf 'All screenshots match the committed deterministic captures.\n'
fi

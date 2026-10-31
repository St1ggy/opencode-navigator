#!/usr/bin/env bash

set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="opencode-navigator-screenshots:local"
mode="${1:-generate}"
scenes=(hero todo-active todo-finished subagents-all subagents-errors sidebar-skills sidebar-actions-lsp sidebar-mcp search-skills search-subagents search-mcp search-actions settings-sections settings-scope settings-presets settings-behavior settings-defaults quick-actions-settings layout-preset-menu layout-preset-preview mcp-presets mcp-preset-actions mcp-preset-preview skill-confirmation keyboard-help setup-tour setup-sections text-fallback settings-trusted-skills settings-control-hover settings-mcp-groups mcp-error settings-portability settings-import-preview no-corner-layout-preview no-corner-mcp-preview no-corner-import-preview settings-skill-groups limits-ready limits-credits limits-confirmation limits-count-only limits-unavailable limits-text no-corner-limits-credits limits-link settings-limits-refresh sidebar-shortcuts sidebar-shortcuts-text sidebar-shortcuts-narrow no-corner-sidebar-shortcuts todo-native toolbar-off toolbar-on toolbar-manager toolbar-pin toolbar-picker toolbar-overflow toolbar-wrap toolbar-text toolbar-narrow no-corner-toolbar-picker host-usage-budgets host-usage-go host-usage-auth host-usage-failure)

scenes+=(settings-about settings-about-update settings-about-error settings-about-checking changelog-versions changelog-version bug-report-editor bug-report-confirmation bug-report-browser bug-report-error settings-about-text no-corner-bug-report-confirmation toolbar-hint toolbar-hint-wrap)

scenes+=(toolbar-content toolbar-content-wrap toolbar-appearance)
scenes+=(native-todo-disabled native-todo-file-picker native-todo-enable-preview native-todo-config-error native-todo-enabled-empty setup-monitoring setup-search-skills setup-actions-lsp setup-mcp setup-customization setup-short setup-v2-monitoring setup-v2-actions)

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
    settings-skill-groups) printf '%s\n' 38-skill-groups.png ;;
    limits-ready) printf '%s\n' 39-provider-limits.png ;;
    limits-credits) printf '%s\n' 40-reset-credits.png ;;
    limits-confirmation) printf '%s\n' 41-reset-confirmation.png ;;
    limits-count-only) printf '%s\n' 42-reset-count-only.png ;;
    limits-unavailable) printf '%s\n' 43-limits-unavailable.png ;;
    limits-text) printf '%s\n' 44-limits-text.png ;;
    no-corner-limits-credits) printf '%s\n' 45-no-corner-font-reset-credits.png ;;
    limits-link) printf '%s\n' 46-limits-account-link.png ;;
    settings-limits-refresh) printf '%s\n' 47-limits-refresh-settings.png ;;
    sidebar-shortcuts) printf '%s\n' 48-sidebar-shortcuts.png ;;
    sidebar-shortcuts-text) printf '%s\n' 49-sidebar-shortcuts-text.png ;;
    sidebar-shortcuts-narrow) printf '%s\n' 50-sidebar-shortcuts-narrow.png ;;
    no-corner-sidebar-shortcuts) printf '%s\n' 51-no-corner-font-sidebar-shortcuts.png ;;
    todo-native) printf '%s\n' 52-native-todo.png ;;
    toolbar-off) printf '%s\n' 53-toolbar-permissions-off.png ;;
    toolbar-on) printf '%s\n' 54-toolbar-permissions-on.png ;;
    toolbar-manager) printf '%s\n' 55-toolbar-manager.png ;;
    toolbar-pin) printf '%s\n' 56-toolbar-pin-icons.png ;;
    toolbar-picker) printf '%s\n' 57-toolbar-icon-picker.png ;;
    toolbar-overflow) printf '%s\n' 58-toolbar-overflow.png ;;
    toolbar-wrap) printf '%s\n' 59-toolbar-wrapping.png ;;
    toolbar-text) printf '%s\n' 60-toolbar-text.png ;;
    toolbar-narrow) printf '%s\n' 61-toolbar-narrow.png ;;
    no-corner-toolbar-picker) printf '%s\n' 62-no-corner-font-icon-picker.png ;;
    host-usage-budgets) printf '%s\n' 63-native-workspace-budgets.png ;;
    host-usage-go) printf '%s\n' 64-native-go-allowance.png ;;
    host-usage-auth) printf '%s\n' 65-native-usage-auth.png ;;
    host-usage-failure) printf '%s\n' 66-native-usage-retry.png ;;
    settings-about) printf '%s\n' 67-settings-about.png ;;
    settings-about-update) printf '%s\n' 68-about-update.png ;;
    settings-about-error) printf '%s\n' 69-about-update-error.png ;;
    settings-about-checking) printf '%s\n' 70-about-checking.png ;;
    changelog-versions) printf '%s\n' 71-changelog-versions.png ;;
    changelog-version) printf '%s\n' 72-changelog-version.png ;;
    bug-report-editor) printf '%s\n' 73-bug-report-editor.png ;;
    bug-report-confirmation) printf '%s\n' 74-bug-report-confirmation.png ;;
    bug-report-browser) printf '%s\n' 75-bug-report-browser.png ;;
    bug-report-error) printf '%s\n' 76-bug-report-error.png ;;
    settings-about-text) printf '%s\n' 77-about-text.png ;;
    no-corner-bug-report-confirmation) printf '%s\n' 78-no-corner-bug-report.png ;;
    toolbar-hint) printf '%s\n' 79-toolbar-hint.png ;;
    toolbar-hint-wrap) printf '%s\n' 80-toolbar-hint-wrap.png ;;
    toolbar-content) printf '%s\n' 81-toolbar-icons-and-text.png ;;
    toolbar-content-wrap) printf '%s\n' 82-toolbar-content-wrap.png ;;
    toolbar-appearance) printf '%s\n' 83-toolbar-appearance.png ;;
    native-todo-disabled) printf '%s\n' 84-native-todo-disabled.png ;;
    native-todo-file-picker) printf '%s\n' 85-native-todo-config-picker.png ;;
    native-todo-enable-preview) printf '%s\n' 86-native-todo-enable-preview.png ;;
    native-todo-config-error) printf '%s\n' 87-native-todo-config-error.png ;;
    native-todo-enabled-empty) printf '%s\n' 88-native-todo-enabled-empty.png ;;
    setup-monitoring) printf '%s\n' 89-setup-monitoring.png ;;
    setup-search-skills) printf '%s\n' 90-setup-search-skills.png ;;
    setup-actions-lsp) printf '%s\n' 91-setup-actions-lsp.png ;;
    setup-mcp) printf '%s\n' 92-setup-mcp.png ;;
    setup-customization) printf '%s\n' 93-setup-customization.png ;;
    setup-short) printf '%s\n' 94-setup-short.png ;;
    setup-v2-monitoring) printf '%s\n' 95-setup-v2-monitoring.png ;;
    setup-v2-actions) printf '%s\n' 96-setup-v2-actions.png ;;
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

priority_scenes=()
remaining_scenes=()
for scene in "${scenes[@]}"; do
  if [[ "$scene" == native-todo-* ]]; then
    priority_scenes+=("$scene")
  else
    remaining_scenes+=("$scene")
  fi
done

# Exercise newly added config dialogs first, before the longer established gallery.
for scene in "${priority_scenes[@]}" "${remaining_scenes[@]}"; do
  file="$(file_for_scene "$scene")"
  fixture_scene="$scene"
  no_corner_font=false
  case "$scene" in
    no-corner-layout-preview) fixture_scene=layout-preset-preview; no_corner_font=true ;;
    no-corner-mcp-preview) fixture_scene=mcp-preset-preview; no_corner_font=true ;;
    no-corner-import-preview) fixture_scene=settings-import-preview; no_corner_font=true ;;
    no-corner-limits-credits) fixture_scene=limits-credits; no_corner_font=true ;;
    no-corner-sidebar-shortcuts) fixture_scene=sidebar-shortcuts; no_corner_font=true ;;
    no-corner-toolbar-picker) fixture_scene=toolbar-picker; no_corner_font=true ;;
    no-corner-bug-report-confirmation) fixture_scene=bug-report-confirmation; no_corner_font=true ;;
  esac
  docker run --rm --platform linux/arm64 \
    -e "SCREENSHOT_SCENE=$fixture_scene" \
    -e "SCREENSHOT_NO_CORNER_FONT=$no_corner_font" \
    -e "SCREENSHOT_OUTPUT=$file" \
    -v "$output:/out" \
    "$image"
done

if [[ "$mode" == "--verify" ]]; then
  different=false
  for scene in "${scenes[@]}"; do
    file="$(file_for_scene "$scene")"
    if ! cmp -s "$root/screenshots/$file" "$output/$file"; then
      printf 'Screenshot is not reproducible: screenshots/%s\n' "$file" >&2
      diagnostics="$root/screenshots/verification-failure"
      mkdir -p "$diagnostics"
      cp "$root/screenshots/$file" "$diagnostics/expected-$file"
      cp "$output/$file" "$diagnostics/actual-$file"
      different=true
    fi
  done
  if [[ "$different" == "true" ]]; then exit 1; fi
  printf 'All screenshots match the committed deterministic captures.\n'
fi

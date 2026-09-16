# Progress tracker: sidebar-v0.9.0-plan.md

Status: [ ] — pending; [X] — verified.

## Execution stages

[X] Stage 1: List-limit preferences — typecheck, lint passed.
[X] Stage 2: Preference tests — 50 focused tests and typecheck passed.
[X] Stage 3: List visibility and navigation order — typecheck, lint passed.
[X] Stage 4: Visibility and navigation tests — 25 focused tests and typecheck passed.
[X] Stage 5: Limits in all sections — typecheck, lint, build passed.
[X] Stage 6: Section-limit tests — 24 renderer/performance/keyboard/smoke tests and typecheck passed.
[X] Stage 7: Todo filters and groups — typecheck, lint, build passed.
[X] Stage 8: Todo tests — 25 focused tests and typecheck passed.
[X] Stage 9: Subagent run history — typecheck, lint passed.
[X] Stage 10: Subagent lifecycle tests — 12 focused tests and typecheck passed.
[X] Stage 11: Subagent duration, errors, recent UI — typecheck, lint, build passed.
[X] Stage 12: Subagent UI and performance tests — 31 tests and typecheck passed; real keyboard focus and row identity survive clock ticks and active-to-recent moves.
[X] Stage 13: Documentation and final verification — check, PTY smoke, diff check, package dry run passed.

## Notes

- Preserve the existing README wording change about dev-team workers in separate local processes.
- Follow-up verified: item limits merged into Sections (Items control and L shortcut), separate Lists tab removed. Confirm/cancel restores the same section; clicking Items does not toggle visibility.
- Baseline: v0.8.0; Git repository, no Arcadia preparation commands apply.
- Final verification: 124 tests, 593 assertions; TypeScript, Oxlint, Prettier and PTY smoke passed after the settings merge.
- Bundle: 239,226 / 240,000 bytes; Solid/OpenTUI remain external, minification disabled.
- Narrow renderer coverage: Todo at 34 columns, Subagents at 36 columns; keyboard activation, target changes, limits, error/recent rows and focus retention verified. OpenCode PTY smoke passed separately.
- Package dry run contains LICENSE, README.md, package.json and dist/tui.js. Release requested: preparing v0.9.0.

# Navigator corner font

`OpenCodeNavigatorCorners.ttf` is an original, MIT-licensed fallback font containing
rounded corner masks. It supplements the terminal's existing font.

| Code point | Corner |
| --- | --- |
| U+10F004 | Top-left cutout |
| U+10F005 | Top-right cutout |
| U+10F006 | Bottom-left cutout |
| U+10F007 | Bottom-right cutout |

The cell background fills the selection; glyphs paint only the outside corner in
the surrounding background color. This keeps multiline selections continuous even
when the terminal adds line spacing or rounds glyph bounds to fractional pixels.
The corner radius is one cell wide and no more than half a cell high.

Font version 1.001 adds these cutouts and retains U+10F000–U+10F003 as the original
filled corners for older plugin versions. Reinstall the font and fully restart the
terminal when upgrading from 1.000.

Generate the font with:

```sh
uv run scripts/generate-corner-font.py
uv run scripts/generate-corner-font.py --check
```

The generator pins FontTools and uses fixed timestamps for reproducible output.
Default metrics match IoskeleyMono Nerd Font Propo: 1000 units/em, 600-unit cell
width, ascender 965, descender -285. To match another terminal font's metrics:

```sh
uv run scripts/generate-corner-font.py --reference-font /path/to/terminal-font.ttf --output /tmp/OpenCodeNavigatorCorners.ttf
bun run font:install --source /tmp/OpenCodeNavigatorCorners.ttf
```

All corner outlines are generated from geometry; no outlines from the reference
font are copied. See the root `LICENSE` for the MIT license.

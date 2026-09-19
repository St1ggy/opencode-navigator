# /// script
# requires-python = ">=3.10"
# dependencies = ["fonttools==4.65.0"]
# ///
"""Build Navigator corner masks without modifying the main font."""

import argparse
from io import BytesIO
from math import pi, sqrt, tan
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont


def build_font(reference=None):
    units, advance, ascent, descent = 1000, 600, 965, -285
    if reference:
        with TTFont(reference) as font:
            units = font["head"].unitsPerEm
            advance = font["hmtx"][font.getBestCmap()[0x20]][0]
            ascent = font["hhea"].ascent
            descent = font["hhea"].descent

    radius = min(advance, (ascent - descent) / 2)
    midpoint = radius * (1 - sqrt(0.5))
    control = radius * (1 - tan(pi / 8))
    corners = ["topLeft", "topRight", "bottomLeft", "bottomRight"]
    # Keep the original code points for plugin versions already using filled glyphs.
    names = corners + [f"{name}Cutout" for name in corners]
    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    for index, name in enumerate(names):
        flip_x = index % 4 in (1, 3)
        flip_y = index % 4 in (2, 3)
        cutout = index >= 4
        target = TTGlyphPen(None)
        pen = TransformPen(
            target,
            (
                -1 if flip_x else 1,
                0,
                0,
                -1 if flip_y else 1,
                advance if flip_x else 0,
                ascent + descent if flip_y else 0,
            ),
        )
        if cutout:
            pen.moveTo((0, ascent))
            pen.lineTo((radius, ascent))
        else:
            pen.moveTo((radius, ascent))
        pen.qCurveTo((control, ascent), (midpoint, ascent - midpoint))
        pen.qCurveTo((0, ascent - control), (0, ascent - radius))
        if not cutout:
            pen.lineTo((0, descent))
            pen.lineTo((advance, descent))
            pen.lineTo((advance, ascent))
        pen.closePath()
        glyphs[name] = target.glyph()

    builder = FontBuilder(units, isTTF=True)
    builder.setupGlyphOrder([".notdef", *names])
    builder.setupCharacterMap(
        {0x10F000 + index: name for index, name in enumerate(names)}
    )
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics({name: (advance, 0) for name in glyphs})
    builder.setupHorizontalHeader(ascent=ascent, descent=descent, lineGap=0)
    builder.setupNameTable(
        {
            "familyName": "OpenCode Navigator Corners",
            "styleName": "Regular",
            "uniqueFontIdentifier": "OpenCodeNavigatorCorners-Regular-1.001",
            "fullName": "OpenCode Navigator Corners Regular",
            "psName": "OpenCodeNavigatorCorners-Regular",
            "version": "Version 1.001",
            "copyright": "Copyright (c) 2026 St1ggy",
            "licenseDescription": "MIT License; see the OpenCode Navigator LICENSE file.",
            "licenseInfoURL": "https://github.com/St1ggy/opencode-navigator/blob/main/LICENSE",
        }
    )
    builder.setupOS2(
        version=4,
        sTypoAscender=ascent,
        sTypoDescender=descent,
        sTypoLineGap=0,
        usWinAscent=max(0, ascent),
        usWinDescent=max(0, -descent),
        fsType=0,
        fsSelection=0xC0,
    )
    builder.setupPost(isFixedPitch=1)
    builder.font["head"].fontRevision = 1.001
    builder.font["head"].created = builder.font["head"].modified = 3862080000
    builder.font.recalcTimestamp = False
    result = BytesIO()
    builder.save(result)
    return result.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference-font", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1]
        / "assets"
        / "OpenCodeNavigatorCorners.ttf",
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    data = build_font(args.reference_font)
    if args.check:
        if not args.output.exists() or args.output.read_bytes() != data:
            parser.exit(1, "Corner font is missing or out of date; regenerate it.\n")
        print("Corner font matches its generator.")
    else:
        args.output.write_bytes(data)
        print(f"Generated {args.output} ({len(data)} bytes)")


if __name__ == "__main__":
    main()

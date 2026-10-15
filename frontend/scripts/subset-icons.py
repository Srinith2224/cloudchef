"""
Builds a small Material Symbols Rounded font that only contains the icons the
app uses (the full font is 5 MB). Run again after adding new icons:

    pip install fonttools brotli
    python scripts/subset-icons.py
"""
import re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'node_modules' / 'material-symbols' / 'material-symbols-rounded.woff2'
OUT = ROOT / 'src' / 'assets' / 'fonts' / 'material-symbols-rounded-subset.woff2'

# Every quoted snake_case word in the source is a candidate icon name
words = set()
for path in (ROOT / 'src').rglob('*.js'):
    words.update(re.findall(r"['\"`]([a-z][a-z0-9_]{1,40})['\"`]", path.read_text(encoding='utf-8')))

font = TTFont(SRC)
cmap = font.getBestCmap()
glyph_order = set(font.getGlyphOrder())

# Find ligature outputs that spell a wanted word
wanted_glyphs = set()
gsub = font['GSUB'].table
for lookup in gsub.LookupList.Lookup:
    for st in lookup.SubTable:
        if st.LookupType == 7:  # extension
            st = st.ExtSubTable
        if getattr(st, 'LookupType', None) != 4:
            continue
        for first, ligs in list(st.ligatures.items()):
            keep = []
            for lig in ligs:
                seq = [first] + list(lig.Component)
                rev = {v: k for k, v in cmap.items()}
                try:
                    text = ''.join(chr(rev[g]) for g in seq)
                except KeyError:
                    continue
                if text in words:
                    keep.append(lig)
                    wanted_glyphs.add(lig.LigGlyph)
            if keep:
                st.ligatures[first] = keep
            else:
                del st.ligatures[first]

letters = 'abcdefghijklmnopqrstuvwxyz0123456789_'
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
options.notdef_outline = True
options.name_IDs = ['*']
sub = subset.Subsetter(options)
sub.populate(text=letters, glyphs=sorted(wanted_glyphs))
sub.subset(font)
OUT.parent.mkdir(parents=True, exist_ok=True)
font.flavor = 'woff2'
font.save(OUT)
print(f'{len(wanted_glyphs)} icons -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')

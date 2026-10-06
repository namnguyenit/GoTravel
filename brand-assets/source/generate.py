"""Generate scalable, font-independent brand assets from original vector paths.
Run with fonttools installed. Raster exports are rendered separately with sharp.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

root = Path(__file__).resolve().parents[2]
config = json.loads((root / 'brand-assets/source/brands.json').read_text())
fonts = {w: TTFont(root / f'front_end/public/fonts/outfit-{w}.ttf') for w in [500, 800]}
out = root / 'brand-assets/exports'
out.mkdir(parents=True, exist_ok=True)


def paths(brand, color=None):
    return '<g fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round">%s</g>' % (
        color or brand['color'], config['strokeWidth'], ''.join('<path d="%s"/>' % d for d in brand['paths']))


def wordmark(brand, size=42, color='#222222', dot_color=None):
    x = 0
    pieces = []
    for segment, weight in [('go', 800), (brand['suffix'], 500), ('.', 800)]:
        font = fonts[weight]; glyphset = font.getGlyphSet(); cmap = font.getBestCmap()
        scale = size / font['head'].unitsPerEm
        for char in segment:
            name = cmap[ord(char)]; pen = SVGPathPen(glyphset); glyphset[name].draw(pen)
            fill = (dot_color or brand['color']) if char == '.' else color
            pieces.append(f'<path fill="{fill}" d="{pen.getCommands()}" transform="translate({x:.4f},0) scale({scale:.6f},{-scale:.6f})"/>')
            x += font['hmtx'][name][0] * scale - size * .07
    return ''.join(pieces), x + size * .07


def svg(body, width, height, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}"><title>{title}</title>{body}</svg>\n'


for b in config['brands']:
    d = out / b['key']; d.mkdir(exist_ok=True)
    for name, color in [('symbol', b['color']), ('symbol-black', '#222222'), ('symbol-white', '#FFFFFF')]:
        (d / f'{b["key"]}-{name}.svg').write_text(svg(paths(b, color), 64, 64, b['name']))
    badge = f'<rect x="2" y="2" width="60" height="60" rx="17" fill="{b["color"]}"/><g transform="translate(8,8) scale(.75)">{paths(b, "#FFFFFF")}</g>'
    (d / f'{b["key"]}-icon.svg').write_text(svg(badge, 64, 64, b['name']))
    for name, text_color, mark_color in [('lockup', '#222222', b['color']), ('lockup-black', '#222222', '#222222'), ('lockup-white', '#FFFFFF', '#FFFFFF')]:
        word, width = wordmark(b, color=text_color, dot_color=mark_color)
        body = paths(b, mark_color) + f'<g transform="translate(78,44)">{word}</g>'
        (d / f'{b["key"]}-{name}.svg').write_text(svg(body, round(80 + width, 2), 64, b['name']))

# Preview all four identities on light and dark backgrounds, with outlined text.
board = ['<rect width="1280" height="920" fill="#F6F6F8"/>']
for i, b in enumerate(config['brands']):
    x = 40 + (i % 2) * 620; y = 40 + (i // 2) * 440
    board.append(f'<rect x="{x}" y="{y}" width="580" height="400" rx="24" fill="#FFFFFF"/>')
    word, _ = wordmark(b, size=52)
    board.append(f'<g transform="translate({x+45},{y+62}) scale(1.25)">{paths(b)}</g>')
    board.append(f'<g transform="translate({x+145},{y+119})">{word}</g>')
    board.append(f'<rect x="{x+25}" y="{y+200}" width="530" height="175" rx="17" fill="#242238"/>')
    white_word, _ = wordmark(b, size=40, color='#FFFFFF', dot_color='#FFFFFF')
    board.append(f'<g transform="translate({x+45},{y+251})">{paths(b,"#FFFFFF")}</g>')
    board.append(f'<g transform="translate({x+126},{y+293})">{white_word}</g>')
    for j, size in enumerate([16, 24, 32]):
        board.append(f'<g transform="translate({x+410+j*42},{y+160}) scale({size/64})">{paths(b,"#222222")}</g>')
(root / 'brand-assets/brand-family.svg').write_text(svg(''.join(board), 1280, 920, 'GoTravel · GoID · GoPay · GoTicket'))
print('Original vector logo family exported; wordmarks are outlined paths.')

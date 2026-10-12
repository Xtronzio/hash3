"""One provisional Barlow Condensed #33 wordmark; no decorative colours.

Rebuild with Python, Pillow and fontTools. The licensed font is pinned in public.
The wordmark paths are shared by the header and every installation icon.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
out = root / 'public/icons'
font_path = root / 'public/fonts/BarlowCondensed-ExtraBold.ttf'
font = TTFont(font_path)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
units = font['head'].unitsPerEm
pen, bounds = SVGPathPen(glyphs), BoundsPen(glyphs)
offset = 0
for char in '#33':
    glyph = glyphs[cmap[ord(char)]]
    transform = (1, 0, 0, -1, offset, 0)
    glyph.draw(TransformPen(pen, transform))
    glyph.draw(TransformPen(bounds, transform))
    offset += glyph.width - .06 * units  # Existing header letter spacing.
x0, y0, x1, y1 = bounds.bounds
width, height = x1-x0, y1-y0
paths = f'<path fill="#f2f4f5" d="{pen.getCommands()}"/>'
wordmark = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:g} {y0:g} {width:g} {height:g}" class="brand-mark" role="img" aria-label="#33">{paths}</svg>'
(out / 'hash3-wordmark-r53.svg').write_text(wordmark+'\n')
factor = 376/width
tx, ty = 256-(x0+x1)*factor/2, 256-(y0+y1)*factor/2
icon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#08090b"/><g transform="translate({tx:g} {ty:g}) scale({factor:g})">{paths}</g></svg>'
(out / 'hash3-logo-r53.svg').write_text(icon+'\n')

# Supersampled rendering of the very same glyphs and spacing for PNG/ICO.
scale = 4
image = Image.new('RGB', (512*scale, 512*scale), '#08090b')
draw = ImageDraw.Draw(image)
pixel_size = round(units*factor*scale)
raster_font = ImageFont.truetype(str(font_path), pixel_size)
offset = 0
for char in '#33':
    draw.text((tx*scale+offset, ty*scale), char, font=raster_font, anchor='ls', fill='#f2f4f5')
    offset += (glyphs[cmap[ord(char)]].width / units - .06)*pixel_size
for name, size in [('favicon-32',32),('favicon-48',48),('apple-touch-icon',180),('icon-192',192),('icon-512',512)]:
    small = image.resize((size,size), Image.Resampling.LANCZOS)
    small.save(out / f'hash3-{name}-r53.png')
    if size == 32:
        small.save(root / 'public/favicon.png')
    if size == 180:
        small.save(root / 'public/apple-touch-icon.png')
        small.save(root / 'public/apple-touch-icon-precomposed.png')
image.resize((256,256),Image.Resampling.LANCZOS).save(root / 'public/favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

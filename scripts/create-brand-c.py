"""Regenerate approved C without a frame. Requires Node, fontTools and Pillow.

Geometry lives only in design/brand-c/master.json; src/brand.js composes it.
All PNG/ICO outputs rasterize the identical SVG, never a second font drawing.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from fontTools.pens.basePen import BasePen
from fontTools.svgLib.path import parse_path
import json
import subprocess
import re
import xml.etree.ElementTree as ET

def rasterize(svg):
    """Render the master's rectangles and quadratic paths at 4x, without fonts.

    The restricted SVG vocabulary is deliberate: reject unsupported geometry
    instead of silently making PNG assets diverge from the header's SVG.
    """
    image = Image.new('RGB', (2048,2048), '#08090b')
    draw = ImageDraw.Draw(image)
    class PathPen(BasePen):
        def __init__(self, x, y, scale, color):
            super().__init__(None)
            self.x, self.y, self.scale, self.color = x,y,scale,color
            self.points = []
        def point(self, p): return (self.x+p[0]*self.scale,self.y+p[1]*self.scale)
        def _moveTo(self,p): self.points=[self.point(p)]
        def _lineTo(self,p): self.points.append(self.point(p))
        def _qCurveToOne(self, control, end):
            start = self._getCurrentPoint()
            for i in range(1,65):
                t=i/64;u=1-t
                self.points.append(self.point((u*u*start[0]+2*u*t*control[0]+t*t*end[0],u*u*start[1]+2*u*t*control[1]+t*t*end[1])))
        def _curveToOne(self,*args): raise ValueError('Master must use quadratic curves')
        def _closePath(self): draw.polygon(self.points,fill=self.color)
        def _endPath(self): raise ValueError('Master paths must be closed')
    def paint(node,x=0,y=0,scale=4,color='#08090b'):
        for kind,args in re.findall(r'(translate|scale)\(([^)]+)\)',node.get('transform','')):
            values=[float(v) for v in re.split(r'[ ,]+',args.strip())]
            if kind=='translate': x+=scale*values[0];y+=scale*values[1]
            else:
                if len(values)>1 and values[1]!=values[0]:raise ValueError('Uniform scale required')
                scale*=values[0]
        color=node.get('fill',color);tag=node.tag.split('}')[-1]
        if tag=='rect':
            left=x+float(node.get('x',0))*scale;top=y+float(node.get('y',0))*scale
            width=float(node.get('width'))*scale;height=float(node.get('height'))*scale
            draw.rounded_rectangle((left,top,left+width,top+height),radius=float(node.get('rx',0))*scale,fill=color)
        elif tag=='path':parse_path(node.get('d'),PathPen(x,y,scale,color))
        elif tag not in ['svg','g']:raise ValueError('Unsupported master element: '+tag)
        for child in node:paint(child,x,y,scale,color)
    paint(ET.fromstring(svg))
    return image

root = Path(__file__).resolve().parents[1]
out = root / 'public/icons'
out.mkdir(exist_ok=True)
family = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {familyWordmark,familyIcon} from './src/brand.js';console.log(JSON.stringify([1,2,3].map(n=>({wordmark:familyWordmark(n),icon:familyIcon(n)}))))"], cwd=root))
for count, item in enumerate(family, 1):
    (root / f'design/brand-c/hash{"3" * count}.svg').write_text(item['wordmark']+'\n')
wordmark, icon = family[1]['wordmark'], family[1]['icon']
(out / 'hash3-wordmark-c1.svg').write_text(wordmark+'\n')
(out / 'hash3-logo-c1.svg').write_text(icon+'\n')
image = rasterize(icon)
for name, size in [('favicon-16',16),('favicon-32',32),('favicon-48',48),('apple-touch-icon',180),('icon-192',192),('icon-512',512)]:
    image.resize((size,size),Image.Resampling.LANCZOS).save(out / f'hash3-{name}-c1.png')
image.resize((256,256),Image.Resampling.LANCZOS).save(out / 'hash3-favicon-c1.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
for target, source in [('favicon.png','hash3-favicon-32-c1.png'),('apple-touch-icon.png','hash3-apple-touch-icon-c1.png'),('apple-touch-icon-precomposed.png','hash3-apple-touch-icon-c1.png'),('favicon.ico','hash3-favicon-c1.ico')]:
    (root / 'public' / target).write_bytes((out / source).read_bytes())

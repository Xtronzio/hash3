"""Reproducible vector identity and supersampled PNG install icons for #33."""
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]/'public'
out=root/'icons'
out.mkdir(exist_ok=True)
svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#080c12"/><rect x="33" y="33" width="446" height="446" rx="76" fill="#111b27" stroke="#304354" stroke-width="3"/><g fill="none" stroke="#f5f7fa" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"><path d="m114 177-25 150m79-150-25 150M63 226h119M52 281h119M215 185h77l-43 54h19q48 0 48 39t-48 39h-57M349 185h77l-43 54h19q48 0 48 39t-48 39h-57"/></g><path d="m364 97 26 26m0-26-26 26" stroke="#ff4a58" stroke-width="13" stroke-linecap="round"/><circle cx="122" cy="393" r="20" fill="none" stroke="#24d393" stroke-width="12"/><path d="M219 359h86" stroke="#ff4a58" stroke-width="7" stroke-linecap="round"/><path d="M353 359h86" stroke="#24d393" stroke-width="7" stroke-linecap="round"/></svg>'''
(out/'hash3-logo-r47.svg').write_text(svg)
# Same shapes as the vector master, drawn at 4x for crisp small-size reductions.
scale=4
im=Image.new('RGB',(512*scale,512*scale),'#080c12');d=ImageDraw.Draw(im)
def coords(points):return [(int(x*scale),int(y*scale)) for x,y in points]
def line(points,fill='#f5f7fa',width=22):
 points=coords(points);d.line(points,fill=fill,width=width*scale,joint='curve')
 r=width*scale/2
 for x,y in [points[0],points[-1]]:d.ellipse((x-r,y-r,x+r,y+r),fill=fill)
d.rounded_rectangle((33*scale,33*scale,479*scale,479*scale),76*scale,fill='#111b27',outline='#304354',width=3*scale)
for p in [[(114,177),(89,327)],[(168,177),(143,327)],[(63,226),(182,226)],[(52,281),(171,281)]]:line(p)
# The curved lower bowl is sampled from two quadratic Bezier segments.
for x in [215,349]:
 p=[(x,185),(x+77,185),(x+34,239),(x+53,239)]
 for a,b,c in [[(x+53,239),(x+101,239),(x+101,278)],[(x+101,278),(x+101,317),(x+53,317)]]:
  p += [((1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]) for t in [i/24 for i in range(1,25)]]
 p += [(x-4,317)];line(p)
line([(364,97),(390,123)],'#ff4a58',13);line([(390,97),(364,123)],'#ff4a58',13)
d.ellipse((102*scale,373*scale,142*scale,413*scale),outline='#24d393',width=12*scale)
line([(219,359),(305,359)],'#ff4a58',7);line([(353,359),(439,359)],'#24d393',7)
for name,size in [('favicon-32',32),('favicon-48',48),('apple-touch-icon',180),('icon-192',192),('icon-512',512)]:
 image=im.resize((size,size),Image.Resampling.LANCZOS);image.save(out/f'hash3-{name}-r47.png')
 if size==32:image.save(root/'favicon.png')
 if size==180:image.save(root/'apple-touch-icon.png')

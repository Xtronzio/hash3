"""Fresh Safari bookmark candidates; keep approved Home Screen artwork intact."""
from pathlib import Path
from shutil import copyfile
from PIL import Image
root=Path(__file__).resolve().parents[1]/'public'
icons=root/'icons'
for size in [32,48]:
    copyfile(icons/f'hash3-favicon-{size}-r53.png',icons/f'hash3-favicon-{size}-r55.png')
copyfile(icons/'hash3-icon-192-r53.png',icons/'hash3-icon-192-r55.png')
copyfile(icons/'hash3-apple-touch-icon-r53.png',icons/'hash3-bookmark-180-r55.png')
copyfile(root/'favicon.ico',icons/'hash3-favicon-r55.ico')
with Image.open(icons/'hash3-icon-512-r53.png') as image:
    image.resize((16,16),Image.Resampling.LANCZOS).save(icons/'hash3-favicon-16-r55.png')

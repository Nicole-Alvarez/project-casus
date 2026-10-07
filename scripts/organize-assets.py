"""Reproduce the categorized asset library from the downloaded official archives."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
PIXEL_URL = 'https://kenney.nl/media/pages/assets/pixel-platformer/33bb4921eb-1696667883/kenney_pixel-platformer.zip'
NEW_URL = 'https://kenney.nl/media/pages/assets/new-platformer-pack/1896103897-1764756702/kenney_new-platformer-pack-1.1.zip'
NAMED = {0:'grass-left',1:'grass-middle',2:'grass-middle-alt',3:'grass-right',4:'soil',21:'grass-platform',44:'heart',84:'sign',88:'sign-right',111:'flag-left',112:'flag-right',124:'plant-small',125:'plant-large',126:'tree-pine',127:'tree-round',128:'mushroom-small',129:'mushroom-tall',151:'coin',152:'coin-edge',153:'cloud-left',154:'cloud-middle',155:'cloud-right',156:'cloud-small'}
TERRAIN = set(range(44)) | set(range(47,64)) | set(range(73,84)) | set(range(100,104)) | set(range(116,124)) | set(range(136,144))
ITEMS = {27,44,45,46,67,151,152}
manifest = {'license':'CC0-1.0', 'sources':[], 'files':[]}

def save(z, source, pack, category, filename):
    destination = ASSETS / pack / category / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(z.read(source))
    manifest['files'].append({'path':str(destination.relative_to(ASSETS)), 'original':source, 'pack':pack, 'category':category})

for archive, pack, url, page in [
    ('kenney_pixel-platformer.zip','kenney-pixel-platformer',PIXEL_URL,'https://kenney.nl/assets/pixel-platformer'),
    ('kenney_new-platformer-pack-1.1.zip','kenney-new-platformer',NEW_URL,'https://kenney.nl/assets/new-platformer-pack'),
]:
    path = ASSETS / 'downloads' / archive
    manifest['sources'].append({'author':'Kenney', 'page':page, 'download':url, 'archive':'downloads/'+archive, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    with ZipFile(path) as z:
        for name in sorted(z.namelist()):
            if name.endswith('/'): continue
            filename = Path(name).name
            if filename == 'License.txt': save(z,name,pack,'licenses',filename)
            elif pack == 'kenney-new-platformer':
                if name.startswith('Sounds/') and name.endswith('.ogg'): save(z,name,pack,'audio',filename)
            elif name.startswith('Tilemap/') and name.endswith('.png'): save(z,name,pack,'spritesheets',filename)
            elif name.startswith('Tiles/Characters/') and name.endswith('.png'):
                n=int(Path(name).stem[5:]); colors={0:'green-idle',1:'green-walk',2:'blue-idle',3:'blue-walk',4:'pink-idle',5:'pink-walk',6:'yellow-idle',7:'yellow-walk'}
                save(z,name,pack,'characters',f'{colors.get(n,"character")}_{n:04d}.png')
            elif name.startswith('Tiles/Backgrounds/') and name.endswith('.png'): save(z,name,pack,'backgrounds',filename)
            elif name.startswith('Tiles/') and name.endswith('.png'):
                n=int(Path(name).stem[5:])
                category = 'items' if n in ITEMS else 'terrain' if n in TERRAIN else 'backgrounds' if n in [153,154,155,156] else 'ui' if n>=157 else 'props'
                save(z,name,pack,category,f'{NAMED.get(n,category.rstrip("s"))}_{n:04d}.png')
(ASSETS/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Organized {len(manifest["files"])} files with source URLs, original names, and archive SHA-256 hashes.')

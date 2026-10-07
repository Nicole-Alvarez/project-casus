"""Measure generated whole-pose PNGs; write metadata only, never alter images.

Developer tool: requires Pillow. Inspect the resulting in-game contact sheet
before accepting a new atlas. Alpha components isolate poses whose rectangular
bounds overlap; color components measure shell size independently of cape size.
"""
from collections import deque
from pathlib import Path
import json
import math
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/generated/sanctuary/characters'
GROUPS = {'ground': ['idle', 'run'],
          'air': ['jump', 'fall', 'doubleJump', 'grapple'],
          'special': ['float', 'cling', 'dash', 'wallDash']}

def components(width, height, predicate):
    seen = bytearray(width * height)
    result = []
    for y in range(height):
        for x in range(width):
            i = y * width + x
            if seen[i] or not predicate(x, y):
                continue
            seen[i] = 1
            queue = deque([(x, y)])
            points = []
            while queue:
                xx, yy = queue.popleft()
                points.append((xx, yy))
                for nx, ny in ((xx-1, yy), (xx+1, yy), (xx, yy-1), (xx, yy+1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        j = ny * width + nx
                        if not seen[j] and predicate(nx, ny):
                            seen[j] = 1
                            queue.append((nx, ny))
            if len(points) >= 100:
                result.append(points)
    return result

def bounds(points):
    return [min(x for x, y in points), min(y for x, y in points),
            max(x for x, y in points)+1, max(y for x, y in points)+1]

def shell(skin, rgba):
    r, g, b, a = rgba
    if a < 180:
        return False
    if skin == 'ant':
        return r > 85 and r > g * 1.25 and r > b * 1.1
    if skin == 'pillbug':
        return r > 145 and g > 140 and b > 105
    return r > 155 and g > 135 and b > 100

def inspect(skin, group):
    im = Image.open(ART / skin / (group+'.png'))
    if im.mode != 'RGBA':
        raise ValueError('Atlas must have alpha: '+str(im.filename))
    w, h = im.size
    px = im.load()
    poses = [c for c in components(w, h, lambda x, y: px[x, y][3] >= 160)
             if len(c) >= 1500]
    states = GROUPS[group]
    if len(poses) != len(states)*4:
        raise ValueError(f'{skin}/{group}: expected {len(states)*4} poses, found {len(poses)}')
    poses.sort(key=lambda p: (bounds(p)[1]+bounds(p)[3])/2)
    clips = {}
    for row, state in enumerate(states):
        sequence = sorted(poses[row*4:row*4+4], key=lambda p: bounds(p)[0])
        frames = []
        for points in sequence:
            left, top, right, bottom = bounds(points)
            source = set(points)
            # Restrict shell search to the upper portion of this complete pose.
            masks = components(right-left, bottom-top,
                lambda x, y: (x+left, y+top) in source
                and y < (bottom-top)*.66 and shell(skin, px[x+left, y+top]))
            if not masks:
                raise ValueError(f'{skin}/{state}: no shell component')
            head = bounds(max(masks, key=len))
            # Ink seams can split a single shell into adjacent color regions.
            # Include regions on the face, excluding antennae and the lower scarf.
            main = head[:]
            for mask in masks:
                box = bounds(mask)
                overlap = max(0, min(main[3], box[3])-max(main[1], box[1]))
                face_fragment = (box[3]-box[1] >= (main[3]-main[1])*.5
                    and abs((box[1]+box[3]-main[1]-main[3])/2) < (main[3]-main[1])*.4)
                if face_fragment and overlap >= min(main[3]-main[1], box[3]-box[1])*.5 and abs((box[0]+box[2]-main[0]-main[2])/2) < (main[3]-main[1])*.95:
                    head = [min(head[0],box[0]),min(head[1],box[1]),max(head[2],box[2]),max(head[3],box[3])]
            if skin == 'moth':
                # Feather stalks sometimes touch the face's fill. Erode only
                # the inspection mask to separate those thin connections;
                # the original full drawing is never edited.
                radius = 5
                def face_core(x, y):
                    return all(0 <= x+dx < right-left and 0 <= y+dy < bottom-top
                        and (x+dx+left, y+dy+top) in source
                        and shell(skin, px[x+dx+left, y+dy+top])
                        for dx, dy in [(0,0),(-radius,0),(radius,0),(0,-radius),(0,radius),
                                       (-radius,-radius),(radius,-radius),(-radius,radius),(radius,radius)])
                cores = components(right-left, bottom-top, face_core)
                if not cores:
                    raise ValueError('No moth face core')
                core = bounds(max(cores, key=len))
                main_core = core[:]
                for fragment in cores:
                    box = bounds(fragment)
                    if (box[3]-box[1] >= (main_core[3]-main_core[1])*.5
                        and abs((box[1]+box[3]-main_core[1]-main_core[3])/2) < (main_core[3]-main_core[1])*.4
                        and abs((box[0]+box[2]-main_core[0]-main_core[2])/2) < (main_core[3]-main_core[1])*.95):
                        core = [min(core[0],box[0]),min(core[1],box[1]),max(core[2],box[2]),max(core[3],box[3])]
                head = [max(0,core[0]-radius),max(0,core[1]-radius),
                        min(right-left,core[2]+radius),min(bottom-top,core[3]+radius)]
            hx, hy = left+(head[0]+head[2])/2, top+(head[1]+head[3])/2
            head_height = head[3]-head[1]
            head_span = math.sqrt((head[2]-head[0])*head_height)
            scale = 20/head_span
            feet = [(x, y) for x, y in points
                    if abs(x-hx) < head_height*.65
                    and max(px[x, y][:3]) < 100 and y > hy+head_height*.4]
            if not feet:
                raise ValueError(f'{skin}/{state}: no foot/body anchor')
            foot_y = max(y for x, y in feet)+1
            sx, sy = max(0, left-2), max(0, top-2)
            sw, sh = min(w, right+2)-sx, min(h, bottom+2)-sy
            frames.append({'sheet': skin+'-'+group, 'sx': sx, 'sy': sy, 'sw': sw, 'sh': sh,
                           'seedX': points[0][0]-sx, 'seedY': points[0][1]-sy,
                           'pivotX': round(hx-sx, 2), 'pivotY': foot_y-sy,
                           'scale': round(scale, 8), 'shellHeight': head_height, 'shellSpan': round(head_span, 8),
                           'shellCenterY': round(hy-sy, 2)})
        clips[state] = {'fps': 8, 'loop': state in ['idle','run','fall','doubleJump','float','cling','grapple'],
                        'frames': frames}
    return clips

if __name__ == '__main__':
    atlas = {}
    for skin in ['beetle','moth','ant','pillbug']:
        atlas[skin] = {}
        for group in GROUPS:
            atlas[skin].update(inspect(skin, group))
    destination = ROOT / 'frontend/src/sprite-frames.mjs'
    destination.write_text('// Measured by scripts/inspect-sprites.py; source PNGs are unchanged.\n'
                           + 'export const SPRITE_FRAMES=' + json.dumps(atlas, separators=(',', ':')) + ';\n')
    print('Measured 160 complete poses across 12 source sheets; all clips play at 8 fps.')

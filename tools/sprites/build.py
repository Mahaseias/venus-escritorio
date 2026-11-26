import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from PIL import Image
from process import cut, shrink, BOX, TARGET

# índice dos quadros em cada folha (ver prev_*.png). Lados: todos olham para a direita.
MAP = {
  'livia':  {'down': [1, 8, 9], 'side': [2, 10, 11], 'up': None,          'sit': [12, 13], 'blink': 0, 'ref': 1},
  'rafael': {'down': [1, 8, 9], 'side': [2, 10, 11], 'up': None,          'sit': [12, 13], 'blink': None, 'ref': 1},
  'bia':    {'down': [0, 3, 4], 'side': [2, 7, 8],   'up': [1, 5, 6],     'sit': [9, 10],  'blink': None, 'ref': 0},
  'caio':   {'down': [1, 4, 'm4'], 'side': [2, 12, 14], 'up': None,       'sit': [16, 17, 18], 'blink': 0, 'ref': 1},
}

def trim(t):
    a = t[..., 3] > 0
    ys, xs = np.where(a)
    return t[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def anchor(t):
    # centro horizontal pela cabeça/ombros (parte de cima), estável entre quadros de caminhada
    a = t[..., 3] > 0
    top = a[:max(3, int(a.shape[0] * .45))]
    xs = np.where(top.any(0))[0]
    return int(round((xs.min() + xs.max()) / 2))

atlas_frames, meta = [], {}
for n, mp in MAP.items():
    a = np.array(Image.open(f'in/{n}.jpg').convert('RGB'))
    boxes = BOX[n]
    f = TARGET / (boxes[mp['ref']][3] - boxes[mp['ref']][1])
    cache = {}
    def get(i):
        mirror = isinstance(i, str)
        k = int(i[1:]) if mirror else i
        if k not in cache:
            c, al = cut(a, boxes[k])
            cache[k] = trim(shrink(c, al, f))
        t = cache[k]
        return t[:, ::-1].copy() if mirror else t
    frames = {}
    for pose in ['down', 'side', 'up', 'sit']:
        if mp[pose]:
            for j, i in enumerate(mp[pose]):
                frames[f'{pose}{j}'] = get(i)
    if mp['blink'] is not None:
        frames['blink'] = get(mp['blink'])
    # sentado no sofá: tronco da pose de frente + pés (pernas encurtadas)
    d = frames['down0']; h = d.shape[0]; cutr = int(h * .70)
    frames['sofa'] = np.concatenate([d[:cutr], d[h - 4:]], 0)
    if n == 'livia':  # blusa pêssego muito parecida com a pele: puxa para rosé
        import colorsys
        for k, fr in frames.items():
            if k == 'sofa': continue
            h = fr.shape[0]
            for yy in range(int(h * .45), h):
                for xx in range(fr.shape[1]):
                    r, g, b, al = [int(v) for v in fr[yy, xx]]
                    if al and r > 170 and g > 90 and b / max(g, 1) > .7 and r - b < 140:
                        hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                        nr, ng, nb = colorsys.hsv_to_rgb(345 / 360, min(1, ss * 1.15), vv * .97)
                        fr[yy, xx, :3] = [int(nr * 255), int(ng * 255), int(nb * 255)]
    d = frames['down0']; h = d.shape[0]; frames['sofa'] = np.concatenate([d[:int(h * .70)], d[h - 4:]], 0)
    meta[n] = {}
    for k, fr in frames.items():
        atlas_frames.append((n, k, fr))

# empacota em linhas de até 512px
x = y = rowh = 0; W = 512; place = []
for n, k, fr in atlas_frames:
    h, w = fr.shape[:2]
    if x + w > W: x = 0; y += rowh + 1; rowh = 0
    place.append((n, k, fr, x, y)); x += w + 1; rowh = max(rowh, h)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for n, k, fr, x, y in place:
    atlas.alpha_composite(Image.fromarray(fr), (x, y))
    meta[n][k] = [x, y, fr.shape[1], fr.shape[0], anchor(fr)]
atlas.save('sprites.png', optimize=True)
json.dump(meta, open('sprites.json', 'w'), separators=(',', ':'))
print(atlas.size, {n: list(v) for n, v in meta.items()})
big = atlas.resize((W * 4, H * 4), Image.NEAREST); bg = Image.new('RGBA', big.size, (40, 34, 60, 255)); bg.alpha_composite(big); bg.save('atlas_preview.png')

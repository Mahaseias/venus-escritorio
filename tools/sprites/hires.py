import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, colorsys
import numpy as np
from PIL import Image
from process import cut, BOX

SRC_H = 128      # altura (px) do boneco em pé no atlas
DRAW_H = 35      # altura do boneco em pé no mapa (px lógicos)

# (folha, índice) — 'm' na frente = espelhado. Lados olham para a direita.
P = {
 'livia': {'ref': ('lr2', 1), 'down': [('lr2', 1), ('lr2', 0), ('lr2', 'm0')], 'side': [('lr2', 2), ('lr2', 10), ('lr2', 9)],
           'up': None, 'sit': [('livia', 12), ('livia', 13)], 'sitref': ('livia', 1), 'recolor': 'livia'},
 'rafael': {'ref': ('lr2', 4), 'down': [('lr2', 4), ('lr2', 12), ('lr2', 'm12')], 'side': [('lr2', 5), ('lr2', 13), ('lr2', 14)],
            'up': [('lr2', 11), ('lr2', 11), ('lr2', 'm11')], 'sit': [('rafael', 12), ('rafael', 13)], 'sitref': ('rafael', 1), 'recolor': 'rafael'},
 'bia': {'ref': ('bia', 0), 'down': [('bia', 0), ('bia', 3), ('bia', 4)], 'side': [('bia', 2), ('bia', 7), ('bia', 8)],
         'up': [('bia', 1), ('bia', 5), ('bia', 6)], 'sit': [('bia', 9), ('bia', 10)], 'sitref': ('bia', 0)},
 'caio': {'ref': ('caio2', 1), 'down': [('caio2', 1), ('caio2', 4), ('caio2', 'm4')], 'side': [('caio2', 2), ('caio2', 12), ('caio2', 14)],
          'up': [('caio2', 16), ('caio2', 17), ('caio2', 'm17')], 'sit': [('caio', 16), ('caio', 17), ('caio', 18)], 'sitref': ('caio', 1),
          'blink': ('caio2', 0)},
}
SHEETS = {}
def sheet(n):
    if n not in SHEETS: SHEETS[n] = np.array(Image.open(f'in/{n}.jpg').convert('RGB'))
    return SHEETS[n]

def frame(src, i, f):
    mirror = isinstance(i, str); k = int(i[1:]) if mirror else i
    c, al = cut(sheet(src), BOX[src][k])
    ys, xs = np.where(al > .05)
    c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; al = al[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = al.shape
    nw, nh = max(1, round(w * f)), max(1, round(h * f))
    pre = Image.fromarray(np.dstack([c[..., 0] * al, c[..., 1] * al, c[..., 2] * al]).clip(0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)
    A = Image.fromarray((al * 255).clip(0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)
    pre = np.array(pre).astype(float); A = np.array(A).astype(float)
    rgb = np.where(A[..., None] > 2, pre / np.maximum(A[..., None] / 255, 1e-3), 0).clip(0, 255)
    A[A < 24] = 0
    out = np.dstack([rgb, A]).astype(np.uint8)
    return out[:, ::-1].copy() if mirror else out

def recolor(fr, who):
    out = fr.copy()
    h = fr.shape[0]
    for y in range(h):
        for x in range(fr.shape[1]):
            r, g, b, a = [int(v) for v in fr[y, x]]
            if not a: continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            deg = hh * 360
            if who == 'rafael' and ss > .12 and (deg > 250 or deg < 15) and vv > .3:      # polo rosa → roxo
                hh, ss, vv = 278 / 360, min(1, ss * 1.5), vv * .82
            elif who == 'livia':
                if y > h * .45 and r > 150 and b / max(g, 1) > .7 and ss > .15:            # blusa pêssego → coral
                    hh, ss, vv = 8 / 360, min(1, ss * 1.45), vv * .97
                elif 10 < deg < 40 and ss > .3:                                            # cabelo mais claro
                    vv = min(1, vv * 1.12); ss = ss * .88
            else:
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(hh, ss, vv)
            out[y, x, :3] = [int(nr * 255), int(ng * 255), int(nb * 255)]
    return out

def anchor(t):
    a = t[..., 3] > 60
    top = a[:max(3, int(a.shape[0] * .45))]
    xs = np.where(top.any(0))[0]
    return int(round((xs.min() + xs.max()) / 2))

frames = []
for n, p in P.items():
    def scale(ref): s, k = ref; b = BOX[s][k]; return SRC_H / (b[3] - b[1])
    f_main = scale(p['ref']); f_sit = scale(p['sitref'])
    fr = {}
    for pose in ['down', 'side', 'up']:
        if p.get(pose):
            for j, (s, i) in enumerate(p[pose]): fr[f'{pose}{j}'] = frame(s, i, f_main)
    for j, (s, i) in enumerate(p['sit']):
        t = frame(s, i, f_sit)
        fr[f'sit{j}'] = recolor(t, p['recolor']) if p.get('recolor') else t
    if p.get('blink'): fr['blink'] = frame(*p['blink'], f_main)
    d = fr['down0']; h = d.shape[0]
    fr['sofa'] = np.concatenate([d[:int(h * .70)], d[h - int(h * .12):]], 0)
    for k, v in fr.items(): frames.append((n, k, v))

W = 1024; x = y = rowh = 0; place = []
for n, k, fr in frames:
    h, w = fr.shape[:2]
    if x + w > W: x = 0; y += rowh + 2; rowh = 0
    place.append((n, k, fr, x, y)); x += w + 2; rowh = max(rowh, h)
H = y + rowh
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0)); meta = {'_scale': SRC_H / DRAW_H}
for n, k, fr, x, y in place:
    atlas.alpha_composite(Image.fromarray(fr), (x, y))
    meta.setdefault(n, {})[k] = [x, y, fr.shape[1], fr.shape[0], anchor(fr)]
atlas.save('sprites.png', optimize=True)
json.dump(meta, open('sprites.json', 'w'), separators=(',', ':'))
print(atlas.size, os.path.getsize('sprites.png') // 1024, 'KB', {n: list(v) for n, v in meta.items() if n[0] != '_'})
bg = Image.new('RGBA', atlas.size, (40, 34, 60, 255)); bg.alpha_composite(atlas); bg.save('atlas_preview.png')

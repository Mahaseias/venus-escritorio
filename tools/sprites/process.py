import json, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

BOX = json.load(open('boxes.json'))
TARGET = 30  # altura do boneco em pé, em pixels do mapa

def cut(a, b, sofa=False):
    x0, y0, x1, y1 = b
    c = a[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3].astype(float)
    r, g, bl = c[..., 0], c[..., 1], c[..., 2]
    gr = g - np.maximum(r, bl)
    alpha = np.clip((70 - gr) / 40, 0, 1)            # verde forte -> 0
    alpha[g < 110] = np.maximum(alpha[g < 110], 1.0)  # tons escuros nunca são fundo
    c[..., 1] = np.minimum(g, np.maximum(r, bl) + 18)  # remove respingo verde
    if sofa:
        rgb = c[..., :3]
        w = rgb.shape[1]
        strips = np.concatenate([rgb[:, :int(w * .17)].reshape(-1, 3), rgb[:, int(w * .83):].reshape(-1, 3)])
        sa = np.concatenate([alpha[:, :int(w * .17)].ravel(), alpha[:, int(w * .83):].ravel()])
        pal = strips[(sa > .5) & (strips.max(-1) > 70)]
        pal = np.unique((pal // 12) * 12, axis=0)
        flat = rgb.reshape(-1, 3)
        hit = np.zeros(len(flat), bool)
        for i in range(0, len(pal), 64):
            d = np.abs(flat[:, None, :] - pal[None, i:i + 64, :] - 6).max(-1)
            hit |= (d < 16).any(1)
        hit = hit.reshape(alpha.shape) & (rgb.max(-1) > 70)
        cand = (alpha > .5) & ~hit
        op = ndimage.binary_opening(cand, iterations=4)
        lab, k = ndimage.label(op)
        if k:
            sizes = ndimage.sum(op, lab, range(1, k + 1))
            core = lab == (1 + int(np.argmax(sizes)))
            alpha = alpha * (ndimage.binary_dilation(core, iterations=5) & cand)
    m = alpha > .5
    lab, k = ndimage.label(m)
    if k > 1:
        sizes = ndimage.sum(m, lab, range(1, k + 1))
        keep = 1 + int(np.argmax(sizes))
        big = ndimage.binary_dilation(lab == keep, iterations=2)
        alpha = alpha * big
    return c, alpha

def shrink(c, alpha, f):
    h, w = alpha.shape
    nw, nh = max(1, round(w * f)), max(1, round(h * f))
    pre = np.dstack([c * alpha[..., None], alpha * 255]).astype(np.uint8)
    # premultiplicado -> reduz por média (cada "pixel de arte" vira 1 pixel)
    p = Image.fromarray(np.dstack([c[..., 0] * alpha, c[..., 1] * alpha, c[..., 2] * alpha]).astype(np.uint8)).resize((nw, nh), Image.BOX)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    p = np.array(p).astype(float); al = np.array(al).astype(float) / 255
    rgb = np.where(al[..., None] > 0.01, p / np.maximum(al[..., None], 0.01), 0)
    A = (al > 0.45).astype(np.uint8) * 255
    return np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), A])

def run(n, preview=True):
    a = np.array(Image.open(f'in/{n}.jpg').convert('RGB'))
    boxes = BOX[n]
    return a, boxes

if __name__ == '__main__':
    # pré-visualização de todos os quadros reduzidos, numerados
    for n in BOX:
        a = np.array(Image.open(f'in/{n}.jpg').convert('RGB'))
        boxes = BOX[n]
        ref = sorted(b[3] - b[1] for b in boxes)[len(boxes) // 3]
        f = TARGET / ref
        tiles = []
        for i, b in enumerate(boxes):
            c, al = cut(a, b, sofa=(b[2] - b[0] > 150))
            tiles.append(shrink(c, al, f))
        W = sum(t.shape[1] + 4 for t in tiles); H = max(t.shape[0] for t in tiles) + 10
        sheet = Image.new('RGBA', (W, H), (40, 34, 60, 255))
        x = 0
        for i, t in enumerate(tiles):
            sheet.alpha_composite(Image.fromarray(t), (x, H - t.shape[0]))
            x += t.shape[1] + 4
        sheet = sheet.resize((W * 6, H * 6), Image.NEAREST)
        d = ImageDraw.Draw(sheet); x = 0
        for i, t in enumerate(tiles):
            d.text((x * 6 + 4, 2), str(i), fill=(255, 255, 0)); x += t.shape[1] + 4
        sheet.save(f'prev_{n}.png')
        print(n, 'f=%.3f' % f, [t.shape[:2] for t in tiles])

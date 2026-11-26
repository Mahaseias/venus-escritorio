import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

def mask_of(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    green = (g > 120) & (g - r > 45) & (g - b > 45)
    return ~green

out = {}
for n in ['livia', 'rafael', 'bia', 'caio']:
    im = Image.open(f'in/{n}.jpg').convert('RGB')
    a = np.array(im)
    m = mask_of(a)
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(ndimage.binary_closing(m, iterations=3))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if h * w < 2000: continue
        boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    # ordena por linha (y central agrupado) e x
    boxes.sort(key=lambda b: (round(((b[1] + b[3]) / 2) / 120), b[0]))
    out[n] = boxes
    d = ImageDraw.Draw(im)
    for i, b in enumerate(boxes):
        d.rectangle(b, outline=(255, 0, 0), width=2); d.text((b[0] + 2, b[1] + 2), str(i), fill=(255, 255, 0))
    im.save(f'ann_{n}.png')
    print(n, len(boxes), [(i, b[2] - b[0], b[3] - b[1]) for i, b in enumerate(boxes)])
json.dump(out, open('boxes.json', 'w'))

"""Generate original SchoologyCompass icons (run once, commit outputs).

Mark: navy disc, full sky-blue progress ring, two-tone compass needle
(white north, amber south) with navy hub. Original design.
"""
from PIL import Image, ImageDraw

NAVY = (17, 24, 39, 255)
SKY = (56, 189, 248, 255)
AMBER = (251, 191, 36, 255)
WHITE = (255, 255, 255, 255)


def draw_icon(base: Image.Image, box):
    d = ImageDraw.Draw(base)
    x0, y0, s = box  # origin + size (256-unit design space scaled)
    u = s / 256.0

    def C(cx, cy, r, fill):
        d.ellipse([x0 + (cx - r) * u, y0 + (cy - r) * u,
                   x0 + (cx + r) * u, y0 + (cy + r) * u], fill=fill)

    def P(pts, fill):
        d.polygon([(x0 + x * u, y0 + y * u) for x, y in pts], fill=fill)

    C(128, 128, 120, NAVY)
    d.ellipse([x0 + 26 * u, y0 + 26 * u, x0 + 230 * u, y0 + 230 * u],
              outline=SKY, width=int(22 * u))
    P([(128, 58), (152, 128), (128, 198), (104, 128)], WHITE)
    P([(128, 198), (152, 128), (104, 128)], AMBER)
    C(128, 128, 12, NAVY)


def full_bleed(px: int) -> Image.Image:
    img = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    draw_icon(img, (0, 0, px))
    return img


def maskable(px: int) -> Image.Image:
    img = Image.new('RGBA', (px, px), NAVY)
    m = int(px * 0.1)
    draw_icon(img, (m, m, px - 2 * m))
    return img


OUT = {
    'pwa-64x64.png': full_bleed(64),
    'pwa-192x192.png': full_bleed(192),
    'pwa-512x512.png': full_bleed(512),
    'apple-touch-icon-180x180.png': full_bleed(180).convert('RGB'),
    'maskable-icon-512x512.png': maskable(512).convert('RGB'),
}

import os
HERE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.abspath(os.path.join(HERE, '..', 'static'))
for name, img in OUT.items():
    img.save(os.path.join(STATIC, name))
    print('wrote', name)

full_bleed(48).save(os.path.join(STATIC, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
print('wrote favicon.ico')

"""Generate original SchoologyCompass icons (run once, commit outputs)."""
from PIL import Image, ImageDraw

SIZE = 512
BG = (29, 78, 216, 255)      # blue-700
BAR_DIM = (255, 255, 255, 140)
BAR_MID = (255, 255, 255, 205)
BAR_TOP = (255, 255, 255, 255)
ACCENT = (251, 191, 36, 255)  # amber-400


def draw_icon(base: Image.Image, scale_box):
    d = ImageDraw.Draw(base)
    x0, y0, s = scale_box  # origin + box size (256-unit design space scaled)
    u = s / 256.0

    def R(x, y, w, h, r, fill):
        d.rounded_rectangle([x0 + x * u, y0 + y * u, x0 + (x + w) * u, y0 + (y + h) * u],
                            radius=r * u, fill=fill)

    R(8, 8, 240, 240, 56, BG)
    R(56, 152, 34, 56, 8, BAR_DIM)
    R(104, 122, 34, 86, 8, BAR_MID)
    R(152, 92, 34, 116, 8, BAR_TOP)
    d.line([x0 + 48 * u, y0 + 176 * u, x0 + 118 * u, y0 + 120 * u,
            x0 + 150 * u, y0 + 142 * u, x0 + 208 * u, y0 + 76 * u],
           fill=ACCENT, width=int(18 * u), joint='curve')
    d.polygon([x0 + 178 * u, y0 + 72 * u, x0 + 212 * u, y0 + 72 * u,
               x0 + 212 * u, y0 + 106 * u], fill=ACCENT)


def full_bleed(px: int) -> Image.Image:
    img = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    draw_icon(img, (0, 0, px))
    return img


def maskable(px: int) -> Image.Image:
    img = Image.new('RGBA', (px, px), BG)
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

import base64
import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('imgs', exist_ok=True)
os.makedirs('frontend/imgs', exist_ok=True)

# 1. Clean and complete emblem from logo_no_bg.png
import numpy as np
src = Image.open('frontend/imgs/logo_no_bg.png').convert('RGB')
arr = np.array(src)

non_white = np.where(np.any(arr < 240, axis=2))
y1, y2 = non_white[0].min(), non_white[0].max()
x1, x2 = non_white[1].min(), non_white[1].max()

crop = src.crop((x1, y1, x2 + 1, y2 + 1))
crop_arr = np.array(crop).astype(np.float32)

whiteness = np.min(crop_arr, axis=2)
alpha = np.clip((250.0 - whiteness) / 50.0, 0.0, 1.0) * 255.0

out_rgba = np.zeros((crop.height, crop.width, 4), dtype=np.uint8)
a_norm = alpha / 255.0
mask = a_norm > 0.01

for c in range(3):
    fg_c = np.where(mask, (crop_arr[:, :, c] - (1.0 - a_norm) * 255.0) / np.maximum(a_norm, 0.001), 17.0)
    out_rgba[:, :, c] = np.clip(fg_c, 0, 255).astype(np.uint8)

out_rgba[:, :, 3] = alpha.astype(np.uint8)
emblem_rgba = Image.fromarray(out_rgba, mode='RGBA')
emblem_rgba.save('imgs/logo.png')
emblem_rgba.save('frontend/imgs/logo.png')
print('Saved clean imgs/logo.png')

# Banner parameters
W, H = 1600, 420

# 1. RENDER PERFECT PNG BANNER
banner = Image.new('RGB', (W, H), (255, 255, 255))
draw = ImageDraw.Draw(banner)

# Proportions
emblem_h = 220
emblem_w = int(emblem_rgba.width * (emblem_h / emblem_rgba.height))
emblem_res = emblem_rgba.resize((emblem_w, emblem_h), Image.Resampling.LANCZOS)

font = ImageFont.truetype('frontend/fonts/Geist-ExtraBold.ttf', 132)
text = 'FileNotFound'

bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]

gap = 60
total_w = emblem_w + gap + text_w
x_start = (W - total_w) // 2 + 5

# Vertical centering
y_emblem = (H - emblem_h) // 2
x_emblem = x_start

x_text = x_start + emblem_w + gap
y_text = (H - text_h) // 2 - bbox[1]

# Paste emblem onto pure white
banner.paste(emblem_res, (x_emblem, y_emblem), emblem_res)

# Draw FileNotFound in #111111
draw.text((x_text, y_text), text, font=font, fill=(17, 17, 17))

# Draw clean border: #E5E5E5 (1.5px)
draw.rectangle([(0, 0), (W - 1, H - 1)], outline=(229, 229, 229), width=2)

banner.save('imgs/banner.png', quality=95)
banner.save('frontend/imgs/banner.png', quality=95)

# 2. GENERATE MATCHING SVG BANNER
with open('imgs/logo.png', 'rb') as f:
    b64_logo = base64.b64encode(f.read()).decode('utf-8')

ascent, descent = font.getmetrics()
svg_baseline = y_text + ascent

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="100%" height="auto">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@800&amp;display=swap');
      .brand-text {{
        font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
        font-size: 132px;
        fill: #111111;
        letter-spacing: -0.03em;
      }}
    </style>
  </defs>
  <!-- Background -->
  <rect width="{W}" height="{H}" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2" rx="16" />
  <!-- Logo (Left) -->
  <image href="data:image/png;base64,{b64_logo}" x="{x_emblem}" y="{y_emblem}" width="{emblem_w}" height="{emblem_h}" />
  <!-- Brand Name (Right) -->
  <text x="{x_text}" y="{svg_baseline}" class="brand-text">FileNotFound</text>
</svg>'''

with open('imgs/banner.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)
with open('frontend/imgs/banner.svg', 'w', encoding='utf-8') as f:
    f.write(svg_content)

print(f'Done! Created banner.png and banner.svg at {W}x{H}')
print(f'Logo at x={x_emblem}, y={y_emblem}, w={emblem_w}, h={emblem_h}')
print(f'Text at x={x_text}, y={y_text}, w={text_w}, h={text_h}')

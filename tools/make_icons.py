"""Render the owl Home Screen icons (run once; output is committed)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", 160)
owl = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
ImageDraw.Draw(owl).text((100, 100), "🦉", font=font, embedded_color=True, anchor="mm")
owl = owl.crop(owl.getbbox())
for size in (180, 192, 512):
    icon = Image.new("RGB", (size, size), "#FFF6D6")
    inner = int(size * 0.72)
    scale = inner / max(owl.width, owl.height)
    o = owl.resize((int(owl.width * scale), int(owl.height * scale)), Image.LANCZOS)
    icon.paste(o, ((size - o.width) // 2, (size - o.height) // 2), o)
    icon.save(OUT / f"icon-{size}.png")
print("ok")

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def font(size: int):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def build_icon(size: int):
    image = Image.new("RGB", (size, size), "#111e2c")
    draw = ImageDraw.Draw(image)
    inset = round(size * 0.13)
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=round(size * 0.14),
        fill="#f25a16",
    )
    letter_font = font(round(size * 0.46))
    text = "B"
    box = draw.textbbox((0, 0), text, font=letter_font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text(
        ((size - width) / 2, (size - height) / 2 - box[1]),
        text,
        font=letter_font,
        fill="white",
    )
    image.save(PUBLIC / f"icon-{size}.png")


for icon_size in (192, 512):
    build_icon(icon_size)

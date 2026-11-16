"""Captures de vérif desktop + mobile (dark, anims gelées).
Usage: python scripts/shoot-check.py
"""
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
SHOTS = [
    ("/cockpit", 1440, 900, "check-cockpit-desktop"),
    ("/preview", 1440, 900, "check-preview-desktop"),
    ("/preview", 390, 844, "check-preview-mobile"),
    ("/cockpit", 390, 844, "check-cockpit-mobile"),
]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for route, w, h, name in SHOTS:
        ctx = b.new_context(
            viewport={"width": w, "height": h},
            device_scale_factor=2 if w < 500 else 1.5,
            color_scheme="dark",
            reduced_motion="reduce",
        )
        pg = ctx.new_page()
        pg.goto("http://localhost:3008" + route, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1200)
        pg.screenshot(path=OUT + f"\\{name}.png", full_page=True)
        print("WROTE", name, f"({w}x{h})")
        ctx.close()
    b.close()

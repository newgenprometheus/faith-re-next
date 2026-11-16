"""Capture /cockpit (dark + light) pour le contrat visuel du refactor V3.
Usage: python scripts/shoot-baseline.py [prefix]
  prefix défaut = "baseline" -> baseline-cockpit-dark.png / baseline-cockpit-light.png
  ex: python scripts/shoot-baseline.py after-ws1
"""
import sys
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
URL = "http://localhost:3008/cockpit"
prefix = sys.argv[1] if len(sys.argv) > 1 else "baseline"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for scheme in ("dark", "light"):
        ctx = b.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.5,
            color_scheme=scheme,
            reduced_motion="reduce",
        )
        pg = ctx.new_page()
        pg.goto(URL, wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1500)
        out = OUT + f"\\{prefix}-cockpit-{scheme}.png"
        pg.screenshot(path=out, full_page=True)
        print("WROTE", out)
        ctx.close()
    b.close()

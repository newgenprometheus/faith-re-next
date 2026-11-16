"""Capture la vue table multi-persos (mock /cockpit?view=table), dark."""
from playwright.sync_api import sync_playwright

OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for w, h, name in [(1600, 1000, "check-table-desktop"), (390, 844, "check-table-mobile")]:
        ctx = b.new_context(
            viewport={"width": w, "height": h},
            device_scale_factor=2 if w < 500 else 1.5,
            color_scheme="dark",
            reduced_motion="reduce",
        )
        pg = ctx.new_page()
        pg.goto("http://localhost:3008/cockpit?view=table", wait_until="networkidle", timeout=60000)
        pg.wait_for_timeout(1000)
        pg.screenshot(path=OUT + f"\\{name}.png", full_page=True)
        print("WROTE", name, f"({w}x{h})")
        ctx.close()
    b.close()

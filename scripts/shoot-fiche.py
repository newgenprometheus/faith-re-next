from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1300}, device_scale_factor=1.4)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    # center sheet area — between roster (~520) and right panel (~1130)
    pg.screenshot(path=OUT + r"\fiche-before.png", clip={"x": 528, "y": 60, "width": 600, "height": 760})
    print("WROTE fiche-before")
    b.close()

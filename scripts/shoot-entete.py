from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1100}, device_scale_factor=1.6)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT + r"\entete-v2.png", clip={"x": 528, "y": 70, "width": 620, "height": 300})
    print("WROTE entete-v2")
    b.close()

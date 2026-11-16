from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=1.6)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    # roster column ~ x 470-780
    pg.screenshot(path=OUT + r"\roster-v2.png", clip={"x": 468, "y": 95, "width": 360, "height": 430})
    print("WROTE roster-v2")
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

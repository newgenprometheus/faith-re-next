from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 400}, device_scale_factor=1.5)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(700)
    pg.screenshot(path=OUT + r"\warm-off.png", clip={"x": 700, "y": 0, "width": 580, "height": 60})
    print("WROTE warm-off")
    try:
        btn = pg.get_by_role("button", name="Allumer la table")
        print("BTN COUNT:", btn.count())
        btn.first.click()
        pg.wait_for_timeout(500)
        pg.screenshot(path=OUT + r"\warm-on.png", clip={"x": 700, "y": 0, "width": 580, "height": 60})
        print("WROTE warm-on (after click)")
    except Exception as e:
        print("CLICK ERR:", e)
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

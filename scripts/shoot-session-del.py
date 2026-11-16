from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1.4)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    print("SESSION DELETE BTN:", pg.get_by_role("button", name="Supprimer la session").count())
    print("RENAME (pencil) BTN:", pg.get_by_role("button", name="Renommer la session").count())
    # screenshot bottom-left session controls
    pg.screenshot(path=OUT + r"\session-del.png", clip={"x": 0, "y": 700, "width": 470, "height": 320})
    print("WROTE session-del")
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

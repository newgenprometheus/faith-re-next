from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 1200}, device_scale_factor=1.2)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    pg.get_by_role("tab", name="Objets").click()
    pg.wait_for_timeout(600)
    pg.screenshot(path=OUT + r"\p1-objets-cristaux.png")
    print("WROTE p1-objets-cristaux")
    # Le champ cristaux est-il un input éditable ?
    try:
        inp = pg.get_by_label("Nombre de cristaux de lumière")
        print("CRISTAUX INPUT:", inp.count(), "editable=", inp.first.get_attribute("type"))
    except Exception as e:
        print("CRISTAUX INPUT ERR:", e)
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

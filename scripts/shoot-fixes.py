from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1.2)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    # 1) nav "Plateau" present?
    print("NAV 'Plateau':", pg.get_by_role("link", name="Plateau").count())
    print("NAV 'Dés' (should be 0):", pg.get_by_text("Dés", exact=True).count())
    # 2) open MODIFICATIONS → delete button
    try:
        pg.get_by_role("button", name="MODIFICATIONS").first.click()
        pg.wait_for_timeout(600)
        print("DELETE BTN:", pg.get_by_role("button", name="Supprimer le personnage").count())
        pg.screenshot(path=OUT + r"\fix-modif-delete.png", full_page=False)
        print("WROTE fix-modif-delete")
    except Exception as e:
        print("MODIF ERR:", e)
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

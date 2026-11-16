from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 950}, device_scale_factor=1.5)
    # MJ view: paliers present
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(600)
    mj_paliers = pg.get_by_text("Paliers — récompenses").count()
    # open a skill roll drawer (click a dice button in Stats)
    pg.get_by_role("tab", name="Stats").click()
    pg.wait_for_timeout(400)
    # click first skill dice (aria-label "Lancer 2d6 + ...")
    dice = pg.locator("[aria-label^='Lancer 2d6']").first
    dice.click()
    pg.wait_for_timeout(400)
    body = pg.inner_text("body")
    drawer_has_plus_attr = " + " in (pg.locator("text=/2d6/").first.inner_text() if pg.locator("text=/2d6/").count() else "")
    OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
    pg.screenshot(path=OUT + r"\roll-drawer.png")
    # player view: paliers absent
    pg.goto("http://localhost:3008/cockpit?mode=player", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(600)
    pl_paliers = pg.get_by_text("Paliers — récompenses").count()
    print(f"MJ paliers={mj_paliers} (expect 1)   player paliers={pl_paliers} (expect 0)")
    b.close()

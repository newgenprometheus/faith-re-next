from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 940}, device_scale_factor=2)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(700)
    has_paliers = pg.get_by_text("Paliers — récompenses").count()
    has_modgrid = pg.get_by_text("Modificateurs").count()  # old preset panel (should be 0)
    has_modif = pg.get_by_text("Modif.").count()
    print(f"paliers panel={has_paliers} (expect 1)  old-mod-grid={has_modgrid} (expect 0)  pool-modif={has_modif} (expect 1)")
    # clip the right roll panel
    roll = pg.locator("aside").last
    roll.screenshot(path=OUT + r"\rev2-rollpanel.png")
    # scroll main to paliers
    pg.locator("text=Paliers — récompenses").scroll_into_view_if_needed()
    pg.wait_for_timeout(300)
    pg.locator("section", has=pg.locator("text=Paliers — récompenses")).first.screenshot(path=OUT + r"\rev2-paliers.png")
    print("WROTE rollpanel + paliers")
    b.close()

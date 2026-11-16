from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 950}, device_scale_factor=1.5)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(600)
    mj = pg.get_by_text("Paliers — récompenses").count()
    # MOD column removed? count "Bonus au jet" titles (old MOD span) — expect 0
    pg.goto("http://localhost:3008/cockpit?mode=player", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(600)
    pl = pg.get_by_text("Paliers — récompenses").count()
    print(f"MJ paliers={mj} (expect 1)   player paliers={pl} (expect 0)")
    b.close()

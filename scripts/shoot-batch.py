from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1.5)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(700)
    # checks
    print("XP bar:", pg.get_by_text("XP", exact=False).count() > 0, "| Temps de session:", pg.get_by_text("Temps de session").count(), "| restart btn:", pg.get_by_role("button", name="Recommencer le cycle depuis le début").count())
    pg.screenshot(path=OUT + r"\batch-dashboard.png")
    # Profil tab for the avatar upload
    pg.get_by_role("tab", name="Profil").click()
    pg.wait_for_timeout(400)
    print("Téléverser btn:", pg.get_by_role("button", name="Téléverser").count())
    pg.screenshot(path=OUT + r"\batch-profil.png")
    b.close()

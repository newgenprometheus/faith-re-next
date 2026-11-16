from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 1400}, device_scale_factor=1.25)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)

    # 1) Vitaux — conditions panel (presets + dice modifier), armor on health gauge
    pg.screenshot(path=OUT + r"\6f-vitaux.png")
    print("WROTE 6f-vitaux")

    # 2) Objets tab (restructured: Cristaux de Lumière, Runes, Compétences de l'Aléa)
    try:
        pg.get_by_role("tab", name="Objets").click()
        pg.wait_for_timeout(600)
        pg.screenshot(path=OUT + r"\6f-objets.png")
        print("WROTE 6f-objets")
    except Exception as e:
        print("OBJETS FAIL:", e)

    b.close()

from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1600, "height": 1000}, device_scale_factor=1.1)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    pg.screenshot(path=OUT + r"\5q-cockpit.png")
    print("WROTE 5q-cockpit")
    # Does the new "Logs" nav entry exist?
    try:
        loc = pg.get_by_text("Logs", exact=True)
        print("LOGS NAV COUNT:", loc.count())
    except Exception as e:
        print("LOGS NAV ERR:", e)
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

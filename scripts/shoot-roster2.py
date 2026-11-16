from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=1.5)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    # locate the roster panel by its "Roster" header text, screenshot its bounding box
    el = pg.get_by_text("Roster", exact=True).first
    box = el.evaluate("e => { const p = e.closest('.campaign-panel'); const r = p.getBoundingClientRect(); return {x:r.x, y:r.y, w:r.width, h:r.height}; }")
    print("roster box:", box)
    pg.screenshot(path=OUT + r"\roster-v2b.png", clip={"x": box["x"]-2, "y": box["y"]-2, "width": box["w"]+4, "height": min(box["h"], 460)+4})
    print("WROTE roster-v2b")
    b.close()

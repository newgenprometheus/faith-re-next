from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1100}, device_scale_factor=1.5)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    pg.get_by_role("tab", name="Stats").click()
    pg.wait_for_timeout(500)
    # the allocation cap text
    import re
    txt = pg.get_by_text(re.compile(r"/ ?8[0-9]")).first
    print("CAP text count:", pg.get_by_text(re.compile(r"/ ?83")).count(), "(expect ≥1 for /83)")
    box = pg.evaluate("""() => { for (const s of document.querySelectorAll('section.campaign-panel')) { if(s.textContent.includes('Allocation')||s.textContent.includes('ALLOCATION')){const r=s.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};} } return null; }""")
    if box:
        pg.screenshot(path=OUT + r"\cap-v2.png", clip={"x":box["x"]-3,"y":box["y"]-3,"width":box["w"]+6,"height":box["h"]+6})
        print("WROTE cap-v2")
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

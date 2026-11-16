from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=1.5)
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(900)
    # find the roster panel header (the <p>Roster</p> inside a campaign-panel, NOT the nav link)
    box = pg.evaluate("""() => {
      const ps = [...document.querySelectorAll('.campaign-panel')];
      for (const p of ps) {
        const h = p.querySelector('p');
        if (h && h.textContent.trim() === 'Roster') { const r = p.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; }
      }
      return null;
    }""")
    print("box:", box)
    if box:
        pg.screenshot(path=OUT + r"\roster-v2c.png", clip={"x": box["x"]-3, "y": box["y"]-3, "width": box["w"]+6, "height": min(box["h"],470)+6})
        print("WROTE roster-v2c")
    b.close()

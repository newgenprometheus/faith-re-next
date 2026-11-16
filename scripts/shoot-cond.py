from playwright.sync_api import sync_playwright
OUT = r"C:\Users\newgenprometheus\42\faith-re-next\.tmp-screens"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1400, "height": 1200}, device_scale_factor=1.5)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(800)
    # open the Conditions add form (the "Ajouter" inside the Conditions panel)
    try:
        pg.get_by_role("button", name="Ajouter").first.click()
        pg.wait_for_timeout(500)
        # presets present?
        for lbl in ["Debuff", "Buff", "Marqueur", "Concentration", "Fatigue"]:
            print(f"preset '{lbl}':", pg.get_by_role("button", name=lbl, exact=True).count())
        # sign buttons
        print("sign '-' (Malus):", pg.get_by_role("button", name="Malus (négatif)").count())
        print("sign '+' (Bonus):", pg.get_by_role("button", name="Bonus (positif)").count())
        # locate conditions panel, screenshot
        box = pg.evaluate("""() => { for (const s of document.querySelectorAll('section.campaign-panel')) { const p=s.querySelector('p'); if(p&&p.textContent.trim()==='Conditions'){const r=s.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};} } return null; }""")
        if box:
            pg.screenshot(path=OUT + r"\conditions-v2.png", clip={"x":box["x"]-3,"y":box["y"]-3,"width":box["w"]+6,"height":min(box["h"],340)+6})
            print("WROTE conditions-v2")
    except Exception as e:
        print("ERR:", e)
    print("PAGE ERRORS:", errs if errs else "none")
    b.close()

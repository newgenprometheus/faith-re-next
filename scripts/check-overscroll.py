from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page()
    pg.goto("http://localhost:3008/cockpit", wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(500)
    body = pg.evaluate("getComputedStyle(document.body).overscrollBehaviorY")
    html = pg.evaluate("getComputedStyle(document.documentElement).overscrollBehaviorY")
    main = pg.evaluate("getComputedStyle(document.querySelector('main.cockpit-print-area')).overscrollBehaviorY")
    print(f"html={html}  body={body}  main={main}  (expect 'none')")
    b.close()

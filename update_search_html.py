"""
update_search_html.py
Updates all HTML pages to wire up the new search feature:
  1. Desktop: <a href="#" class="nav-link nav-link--desktop">Search</a>
             → <button id="alf-search-btn" class="nav-link nav-link--desktop">Search</button>
  2. Mobile:  <a href="#" class="mobile-menu__link">Search</a>
             → <button id="alf-mobile-search-btn" class="mobile-menu__link">Search</button>
  3. Adds    <script type="module" src="js/search.js"></script> before </body>
"""
import os
import re

HTML_FILES = [
    "index.html",
    "shop.html",
    "about.html",
    "account.html",
    "cart.html",
    "product-details.html",
    "craftsmanship.html",
    "care-guide.html",
    "shipping-returns.html",
    "privacy-policy.html",
    "terms.html",
    "manage-ecommerce.html",
]

DESKTOP_OLD = '<a href="#" class="nav-link nav-link--desktop">Search</a>'
DESKTOP_NEW = '<button id="alf-search-btn" class="nav-link nav-link--desktop">Search</button>'

MOBILE_OLD  = '<a href="#" class="mobile-menu__link">Search</a>'
MOBILE_NEW  = '<button id="alf-mobile-search-btn" class="mobile-menu__link">Search</button>'

SEARCH_SCRIPT = '    <script type="module" src="js/search.js"></script>'

changed = []
skipped = []

for fname in HTML_FILES:
    if not os.path.exists(fname):
        skipped.append(fname + " (not found)")
        continue

    with open(fname, "r", encoding="utf-8") as f:
        content = f.read()

    original = content

    # 1. Desktop trigger
    content = content.replace(DESKTOP_OLD, DESKTOP_NEW)

    # 2. Mobile trigger
    content = content.replace(MOBILE_OLD, MOBILE_NEW)

    # 3. Add script before </body> — only if not already there
    if "js/search.js" not in content:
        content = content.replace("</body>", SEARCH_SCRIPT + "\n  </body>")

    if content != original:
        with open(fname, "w", encoding="utf-8") as f:
            f.write(content)
        changed.append(fname)
    else:
        skipped.append(fname + " (no changes needed)")

print("Updated:", changed)
print("Skipped:", skipped)

/**
 * search.js — Professional search with Firestore integration
 * Works on every page. Self-contained ES module — no global race conditions.
 */
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-config.js";

const MAX_RESULTS = 6;
let productsCache = null;

/* ─────────────────────────────────────────────────────────────
   1.  Inject Desktop Search Overlay  (body-level, fixed position)
───────────────────────────────────────────────────────────────*/
const desktopOverlay = document.createElement('div');
desktopOverlay.id = 'alf-search-overlay';
desktopOverlay.setAttribute('role', 'search');
desktopOverlay.setAttribute('aria-label', 'Product search');
desktopOverlay.setAttribute('aria-hidden', 'true');
desktopOverlay.innerHTML = `
  <div class="alf-search-input-wrap">
    <svg class="alf-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input type="text" id="alf-search-input" class="alf-search-input"
           placeholder="Search products…" autocomplete="off" spellcheck="false" />
    <button id="alf-search-close" class="alf-search-close" aria-label="Close search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
  <div id="alf-search-results" class="alf-search-results" role="listbox" aria-label="Search results"></div>
`;
document.body.appendChild(desktopOverlay);

/* ─────────────────────────────────────────────────────────────
   2.  Inject Mobile Search Panel  (inside mobile drawer)
───────────────────────────────────────────────────────────────*/
const mobilePanel = document.createElement('div');
mobilePanel.id = 'alf-mobile-search-panel';
mobilePanel.className = 'alf-mobile-search-panel';
mobilePanel.setAttribute('aria-hidden', 'true');
mobilePanel.innerHTML = `
  <div class="alf-mobile-search-inner">
    <svg class="alf-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input type="text" id="alf-mobile-search-input" class="alf-search-input alf-search-input--mobile"
           placeholder="Search products…" autocomplete="off" spellcheck="false" />
  </div>
  <div id="alf-mobile-search-results" class="alf-search-results alf-search-results--mobile"
       role="listbox" aria-label="Search results"></div>
`;

const mobileTrigger = document.getElementById('alf-mobile-search-btn');
if (mobileTrigger && mobileTrigger.parentNode) {
  mobileTrigger.parentNode.insertBefore(mobilePanel, mobileTrigger.nextSibling);
}

/* ─────────────────────────────────────────────────────────────
   3.  Firestore — fetch products once, cache them
───────────────────────────────────────────────────────────────*/
async function getProducts() {
  if (productsCache) return productsCache;
  try {
    const snap = await getDocs(collection(db, 'products'));
    productsCache = [];
    snap.forEach(function(docSnap) {
      var d = docSnap.data();
      if (!d.name) return;
      productsCache.push({
        id:       docSnap.id,
        name:     d.name || '',
        price:    d.price || d.priceINR || d.variants?.[0]?.price || '',
        image:    (d.images && d.images[0]) || d.image || '',
        category: d.category || ''
      });
    });
    return productsCache;
  } catch (err) {
    console.warn('[Alfaaz Search] Could not load products:', err.message);
    return [];
  }
}

function formatPrice(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  var num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return String(raw);
  return '₹' + num.toLocaleString('en-IN');
}

/* ─────────────────────────────────────────────────────────────
   4.  Render helpers
───────────────────────────────────────────────────────────────*/
function renderResults(matches, container) {
  if (!container) return;
  if (matches.length === 0) {
    container.innerHTML = '<p class="alf-search-empty">No products found</p>';
    container.classList.add('is-open');
    return;
  }
  var html = matches.slice(0, MAX_RESULTS).map(function(p) {
    var img = p.image
      ? '<img src="' + p.image + '" alt="' + p.name + '" class="alf-search-result-img" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<div class="alf-search-result-img alf-search-result-img--placeholder"></div>';
    var priceHtml = p.price ? '<div class="alf-search-result-price">' + formatPrice(p.price) + '</div>' : '';
    return '<a href="product-details.html?id=' + encodeURIComponent(p.id) + '" class="alf-search-result-item" role="option">'
      + img
      + '<div class="alf-search-result-info">'
      + '<div class="alf-search-result-name">' + p.name + '</div>'
      + priceHtml
      + '</div></a>';
  }).join('');
  container.innerHTML = html;
  container.classList.add('is-open');
}

function clearResults(container) {
  if (!container) return;
  container.innerHTML = '';
  container.classList.remove('is-open');
}

async function handleSearch(query, resultsEl) {
  var q = query.trim().toLowerCase();
  if (!q) { clearResults(resultsEl); return; }
  var products = await getProducts();
  var matches = products.filter(function(p) {
    return p.name.toLowerCase().includes(q);
  });
  renderResults(matches, resultsEl);
}

/* ─────────────────────────────────────────────────────────────
   5.  Desktop — open / close / events
───────────────────────────────────────────────────────────────*/
var desktopTrigger   = document.getElementById('alf-search-btn');
var desktopInput     = document.getElementById('alf-search-input');
var desktopResults   = document.getElementById('alf-search-results');
var desktopCloseBtn  = document.getElementById('alf-search-close');

function openDesktop() {
  desktopOverlay.classList.add('is-open');
  desktopOverlay.setAttribute('aria-hidden', 'false');
  if (desktopInput) { desktopInput.focus(); }
}

function closeDesktop() {
  desktopOverlay.classList.remove('is-open');
  desktopOverlay.setAttribute('aria-hidden', 'true');
  if (desktopInput) desktopInput.value = '';
  clearResults(desktopResults);
}

if (desktopTrigger) {
  desktopTrigger.addEventListener('click', function(e) {
    e.preventDefault();
    desktopOverlay.classList.contains('is-open') ? closeDesktop() : openDesktop();
  });
}

if (desktopCloseBtn) {
  desktopCloseBtn.addEventListener('click', closeDesktop);
}

if (desktopInput) {
  desktopInput.addEventListener('input', function() {
    handleSearch(this.value, desktopResults);
  });
}

/* ─────────────────────────────────────────────────────────────
   6.  Mobile — open / close / events
───────────────────────────────────────────────────────────────*/
var mobileTriggerBtn = document.getElementById('alf-mobile-search-btn');
var mobileInput      = document.getElementById('alf-mobile-search-input');
var mobileResults    = document.getElementById('alf-mobile-search-results');

function openMobile() {
  mobilePanel.classList.add('is-open');
  mobilePanel.setAttribute('aria-hidden', 'false');
  setTimeout(function() { if (mobileInput) mobileInput.focus(); }, 80);
}

function closeMobile() {
  mobilePanel.classList.remove('is-open');
  mobilePanel.setAttribute('aria-hidden', 'true');
  if (mobileInput) mobileInput.value = '';
  clearResults(mobileResults);
}

if (mobileTriggerBtn) {
  mobileTriggerBtn.addEventListener('click', function(e) {
    e.preventDefault();
    mobilePanel.classList.contains('is-open') ? closeMobile() : openMobile();
  });
}

if (mobileInput) {
  mobileInput.addEventListener('input', function() {
    handleSearch(this.value, mobileResults);
  });
}

/* ─────────────────────────────────────────────────────────────
   7.  Global — Escape key & outside click
───────────────────────────────────────────────────────────────*/
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (desktopOverlay.classList.contains('is-open')) closeDesktop();
    if (mobilePanel.classList.contains('is-open')) closeMobile();
  }
});

document.addEventListener('click', function(e) {
  if (desktopOverlay.classList.contains('is-open')) {
    var insideOverlay  = desktopOverlay.contains(e.target);
    var insideTrigger  = desktopTrigger && desktopTrigger.contains(e.target);
    if (!insideOverlay && !insideTrigger) closeDesktop();
  }
}, true);

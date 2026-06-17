/**
 * cms.js — Aalfaz Universal CMS v3 (Clean)
 *
 * KEY BEHAVIOURS:
 * ─ Admin mode persists across page navigations via sessionStorage
 * ─ NO navigation blocking — the site works normally while in admin mode
 * ─ Every text/image (except product-detail dynamic fields) gets an edit outline
 * ─ Products panel: add / edit / delete / featured toggle for all categories
 * ─ Influencer section: click any card to swap its video/image URL
 * ─ Save button writes everything to Firestore siteContent/{pageSlug}
 */

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, collection, getDocs,
  addDoc, deleteDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ─── Page identity ───────────────────────────────────────────── */
const PAGE_SLUG = (location.pathname.split('/').pop().replace('.html','') || 'home').toLowerCase();
const IS_PDP    = PAGE_SLUG === 'product-details'; // product detail page

/* ─── Constants ───────────────────────────────────────────────── */
const COUNTRIES = [
  { key:'IN', label:'🇮🇳 India',       symbol:'₹'   },
  { key:'US', label:'🇺🇸 USA',          symbol:'$'   },
  { key:'GB', label:'🇬🇧 UK',           symbol:'£'   },
  { key:'AE', label:'🇦🇪 UAE',          symbol:'د.إ' },
  { key:'SA', label:'🇸🇦 Saudi Arabia', symbol:'﷼'  },
  { key:'AU', label:'🇦🇺 Australia',    symbol:'A$'  },
  { key:'CA', label:'🇨🇦 Canada',       symbol:'CA$' },
  { key:'EU', label:'🇪🇺 Europe',       symbol:'€'   },
  { key:'SG', label:'🇸🇬 Singapore',    symbol:'S$'  },
];
const CATEGORIES = ['rings','pendants','earrings','bracelets','anklets','accessories'];

/* IDs that belong to product-details.js — cms.js must never touch these */
const PDP_SKIP_IDS = new Set([
  'pdp-name','pdp-subtitle','pdp-type','pdp-price','pdp-description',
  'pdp-reviews','pdp-breadcrumb-name','pdp-main-img','pdp-thumbs',
  'pdp-qty-num','pdp-qty-minus','pdp-qty-plus','pdp-buy-now','pdp-add-to-cart'
]);

const DEFAULT_PRODUCTS = [
  { name:'Solitaire Ring',  category:'rings',     featured:true,  subtitle:'Crafted in 18K gold',       badge:'new',            description:'A timeless solitaire ring crafted in 18K gold.',           images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842384/file_00000000e4b4722f8e2c578c5734a676_jadeog.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_0000000091d4722f99050295d4df3d55_rfvxmr.png'], prices:{IN:45000,US:540,GB:430,AE:1980,SA:2025,AU:825,CA:735,EU:500,SG:730},   stock:{status:'in_stock',qty:50}, reviews:[] },
  { name:'The Bangle Set',  category:'bracelets', featured:true,  subtitle:'Set of three',              badge:'new',            description:'Three hand-crafted bangles in 22K gold.',                  images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_000000005dc8722f80fdcd06c66d08a0_qmpmmj.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842389/file_00000000e0f8722f8134cab7a06e7b14_dokbto.png'],  prices:{IN:125000,US:1500,GB:1200,AE:5500,SA:5625,AU:2300,CA:2050,EU:1400,SG:2025}, stock:{status:'in_stock',qty:30}, reviews:[] },
  { name:'Pearl Pendant',   category:'pendants',  featured:true,  subtitle:'Limited edition piece',     badge:'limited edition',description:'A rare freshwater pearl pendant on an 18K gold chain.',    images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000008d20722f930db39bd306a08c_djuj0y.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000001534722f8c47bcee05a10c49_qyvafp.png'],  prices:{IN:32000,US:385,GB:305,AE:1410,SA:1440,AU:590,CA:525,EU:355,SG:520},   stock:{status:'in_stock',qty:15}, reviews:[] },
  { name:'Cuban Chain',     category:'pendants',  featured:true,  subtitle:'22K gold finish',           badge:'new',            description:'A bold Cuban link chain in 22K gold.',                    images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842387/file_00000000bf88722fab83a9a5152dbd3b_osqjva.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842381/file_000000003d14722fabc2369201f40f39_pc4riq.png'],  prices:{IN:58000,US:695,GB:555,AE:2550,SA:2610,AU:1065,CA:950,EU:645,SG:940},  stock:{status:'in_stock',qty:20}, reviews:[] },
  { name:'Drop Earrings',   category:'earrings',  featured:true,  subtitle:'Diamond studded',           badge:'new',            description:'Exquisite diamond-studded drop earrings in 18K gold.',    images:['https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80'], prices:{IN:28000,US:335,GB:270,AE:1230,SA:1260,AU:515,CA:460,EU:310,SG:455}, stock:{status:'in_stock',qty:40}, reviews:[] },
  { name:'Tennis Bracelet', category:'bracelets', featured:true,  subtitle:'Lab-grown diamonds',        badge:'limited edition',description:'A tennis bracelet with lab-grown diamonds in 18K white gold.', images:['https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80'], prices:{IN:75000,US:900,GB:720,AE:3310,SA:3375,AU:1375,CA:1225,EU:840,SG:1215}, stock:{status:'in_stock',qty:10}, reviews:[] },
];

/* ─── State ───────────────────────────────────────────────────── */
let cmsData  = {};
let isAdmin  = false;
let auth, db;
let _ckSeq   = 0;
let _activeTab = 'all';

/* ─── Elements to skip when assigning CMS keys ────────────────── */
const SKIP_ANCESTOR = [
  '#cms-admin-bar','.cms-panel','.cms-modal-overlay','#cms-login-modal',
  'header','.navbar','.nav-links','.nav-inner','.mega-menu','.mobile-menu',
  '.account-drawer','.account-overlay',
  '.products__scroll',   // homepage featured carousel — Firestore-driven, no inline edit
  '.shop-grid',          // shop page grid — Firestore-driven
  '.influencer__controls',
  '.region-tray','#region-tray',
  '.alfaaz-toast-container',
  '#checkout-modal','.checkout-backdrop',
  '.pdp-related',
].join(',');

const SKIP_TAGS = new Set([
  'SCRIPT','STYLE','META','LINK','HEAD','HTML','BODY','NOSCRIPT',
  'SVG','PATH','POLYLINE','LINE','RECT','CIRCLE','POLYGON','DEFS',
  'G','USE','SYMBOL','CLIPPATH','FILTER','MASK',
  'BUTTON','SELECT','OPTION','INPUT','TEXTAREA','IFRAME','VIDEO','SOURCE'
]);

function isSkipped(el) {
  if (!el || el.nodeType !== 1) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  // On the product-detail page, skip the dynamic product fields
  if (IS_PDP && el.id && PDP_SKIP_IDS.has(el.id)) return true;
  if (el.closest && el.closest(SKIP_ANCESTOR)) return true;
  if (el.classList.contains('nav-logo') || el.classList.contains('nav-brand-logo__img')) return true;
  if (el.classList.contains('cart-count-text') || el.classList.contains('cart-badge')) return true;
  if (el.classList.contains('products__arrow') || el.classList.contains('influencer__arrow')) return true;
  return false;
}

/* ─── Boot ────────────────────────────────────────────────────── */
function boot() {
  if (!window.firebaseAuth || !window.firebaseDb) return setTimeout(boot, 80);
  auth = window.firebaseAuth;
  db   = window.firebaseDb;

  // Fetch saved content immediately (for all visitors)
  fetchAndHydrate();

  // Watch auth state
  onAuthStateChanged(auth, user => {
    if (user) {
      // Logged in — activate admin if triggered by hash OR by previous session
      if (window.location.hash === '#admin' || sessionStorage.getItem('cms-admin') === '1') {
        enableAdminMode();
      }
    } else {
      // Logged out — clear session
      sessionStorage.removeItem('cms-admin');
      if (window.location.hash === '#admin') showLoginModal();
    }
  });

  // Hash trigger (visiting any page#admin manually)
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      if (auth.currentUser) enableAdminMode();
      else showLoginModal();
    }
  });

  // Immediate check on page load
  if (window.location.hash === '#admin') {
    if (auth.currentUser) enableAdminMode();
    else showLoginModal();
  }
}

/* ─── Fetch saved content + hydrate DOM ──────────────────────── */
async function fetchAndHydrate() {
  try {
    const [pageSnap, mainSnap] = await Promise.all([
      getDoc(doc(db, 'siteContent', PAGE_SLUG)),
      getDoc(doc(db, 'siteContent', 'main'))
    ]);
    if (pageSnap.exists()) cmsData = pageSnap.data();
    const social = mainSnap.exists() ? (mainSnap.data().social || {}) : {};

    assignCmsKeys();
    hydrateDOM();
    hydrateFooterSocial(social);

    // Hydrate influencer cards from saved data
    if (PAGE_SLUG === 'home' || PAGE_SLUG === 'index' || PAGE_SLUG === '') {
      hydrateInfluencerCards(pageSnap.exists() ? (pageSnap.data().influencerCards || []) : []);
    }
  } catch (e) {
    console.warn('[CMS] Could not fetch content:', e.message);
    assignCmsKeys(); // still assign keys even if fetch fails
  }
}

function assignCmsKeys() {
  _ckSeq = 0;
  document.querySelectorAll('h1,h2,h3,h4,p,span,a,img').forEach(el => {
    if (isSkipped(el)) return;
    if (el.dataset.ck) return; // already keyed
    if (el.dataset.cmsKey) { el.dataset.ck = el.dataset.cmsKey; return; } // legacy support
    if (el.tagName !== 'IMG' && !el.textContent.trim()) return; // skip empty text
    if (el.tagName === 'A' && el.querySelector('div,article,section,img')) return; // skip wrapper links
    el.dataset.ck = `${PAGE_SLUG}_${el.tagName.toLowerCase()}_${++_ckSeq}`;
  });
}

function hydrateDOM() {
  document.querySelectorAll('[data-ck]').forEach(el => {
    const val = cmsData[el.dataset.ck];
    if (!val) return;
    if (el.tagName === 'IMG') el.src = val;
    else el.innerHTML = val;
  });
}

function hydrateFooterSocial(social) {
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    const key = el.dataset.cmsSocial;
    if (social[key]) el.href = social[key];
  });
}

function hydrateInfluencerCards(cards) {
  if (!cards || !cards.length) return;
  cards.forEach(({ idx, type, url }) => {
    const card = document.querySelector(`.influencer__card[data-cms-influencer-idx="${idx}"]`);
    if (!card || !url) return;
    if (type === 'video') {
      const source = card.querySelector('source');
      const video  = card.querySelector('video');
      if (source) { source.src = url; video && video.load(); }
    } else {
      const img = card.querySelector('img');
      if (img) img.src = url;
    }
  });
}

/* ─── Enable Admin Mode ───────────────────────────────────────── */
function enableAdminMode() {
  if (isAdmin) return;
  isAdmin = true;
  sessionStorage.setItem('cms-admin', '1'); // persist across page navigations
  document.body.classList.add('cms-admin');

  // Make content editable
  assignCmsKeys(); // re-run in case DOM changed after hydration
  makeEditable();
  makeSocialEditable();
  makeInfluencerEditable();
  injectAdminBar();

  // Show manage ecommerce footer link
  const ecomLink = document.getElementById('manage-ecom-link');
  if (ecomLink) ecomLink.style.display = '';

  // Seed products to Firestore on first ever login
  seedProductsIfEmpty();
}

/* ─── Disable Admin Mode ──────────────────────────────────────── */
async function disableAdminMode() {
  if (!isAdmin) return;
  if (!confirm('Exit Admin Mode?\n\nMake sure you clicked "Save Changes" first — unsaved edits will be lost.')) return;
  isAdmin = false;
  sessionStorage.removeItem('cms-admin');
  document.body.classList.remove('cms-admin');

  // Clean up editable state
  document.querySelectorAll('[data-ck]:not(img)').forEach(el => {
    el.contentEditable = 'false';
    el.style.outline = '';
    el.title = '';
  });
  document.querySelectorAll('img[data-ck]').forEach(el => {
    el.style.outline = '';
    el.style.cursor  = '';
    el.title = '';
    el.onclick = null;
  });
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    el.style.outline = '';
    el.onclick = null;
  });
  // Remove influencer overlays
  document.querySelectorAll('.cms-inf-overlay').forEach(el => el.remove());

  document.getElementById('cms-admin-bar')?.remove();
  document.getElementById('cms-products-panel')?.remove();

  await signOut(auth);
  history.replaceState(null, '', location.pathname);
}

/* ─── Make text/image editable ───────────────────────────────── */
function makeEditable() {
  // Text elements: contentEditable
  document.querySelectorAll('[data-ck]:not(img)').forEach(el => {
    el.contentEditable = 'true';
    el.style.outline   = '1px dashed rgba(201,168,76,0.5)';
    el.style.minHeight = '1em';
    el.title = '✏️ Click to edit';
  });

  // Images: click to swap URL
  document.querySelectorAll('img[data-ck]').forEach(el => {
    el.style.outline = '2px dashed rgba(201,168,76,0.7)';
    el.style.cursor  = 'pointer';
    el.title = '📷 Click to change image';
    el.onclick = e => {
      if (!isAdmin) return;
      e.preventDefault(); e.stopPropagation();
      const url = prompt('🖼 New image URL:', el.src);
      if (url && url.trim()) el.src = url.trim();
    };
  });
}

function makeSocialEditable() {
  const labels = {
    call:      'Phone number (e.g. +919876543210)',
    whatsapp:  'WhatsApp number (e.g. 919876543210)',
    instagram: 'Instagram URL',
    email:     'Email address',
    facebook:  'Facebook URL'
  };
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    el.style.outline = '2px dashed rgba(201,168,76,0.7)';
    const key = el.dataset.cmsSocial;
    el.onclick = e => {
      if (!isAdmin) return;
      e.preventDefault(); e.stopPropagation();
      const cur = (el.href && !el.href.endsWith('#')) ? el.href : '';
      const val = prompt(`Set ${labels[key] || key}:`, cur);
      if (val === null) return;
      const t = val.trim();
      if (key === 'call')      el.href = t.startsWith('tel:')     ? t : 'tel:' + t;
      else if (key === 'whatsapp') el.href = t.startsWith('https://') ? t : 'https://wa.me/' + t.replace(/\D/g,'');
      else if (key === 'email') el.href = t.startsWith('mailto:') ? t : 'mailto:' + t;
      else el.href = t;
    };
  });
}

/* ─── Influencer section editing ──────────────────────────────── */
function makeInfluencerEditable() {
  document.querySelectorAll('.influencer__card').forEach(card => {
    // Remove any existing overlay
    card.querySelector('.cms-inf-overlay')?.remove();

    const hasVideo = !!card.querySelector('video');
    const overlay  = document.createElement('div');
    overlay.className = 'cms-inf-overlay';
    overlay.innerHTML = `<span>${hasVideo ? '📹 Change Video' : '📷 Change Image'}</span>`;

    // Card must be relative-positioned for overlay to work
    const curPos = getComputedStyle(card).position;
    if (curPos === 'static') card.style.position = 'relative';

    card.appendChild(overlay);

    overlay.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (hasVideo) {
        const video  = card.querySelector('video');
        const source = card.querySelector('source');
        const cur    = source ? source.src : '';
        const url    = prompt('📹 Video URL (MP4):', cur);
        if (url && url.trim()) {
          if (source) { source.src = url.trim(); }
          else {
            const s = document.createElement('source');
            s.src = url.trim(); s.type = 'video/mp4';
            video.appendChild(s);
          }
          video.load(); video.play().catch(() => {});
          card.dataset.cmsInfUrl  = url.trim();
          card.dataset.cmsInfType = 'video';
        }
      } else {
        const img = card.querySelector('img');
        const cur = img ? img.src : '';
        const url = prompt('📷 Image URL:', cur);
        if (url && url.trim() && img) {
          img.src = url.trim();
          card.dataset.cmsInfUrl  = url.trim();
          card.dataset.cmsInfType = 'image';
        }
      }
    });
  });
}

/* ─── Admin Bar ───────────────────────────────────────────────── */
function injectAdminBar() {
  if (document.getElementById('cms-admin-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'cms-admin-bar';
  bar.innerHTML = `
    <div class="cms-bar__left">
      <span class="cms-bar__dot"></span>
      <span class="cms-bar__label">Admin Mode</span>
    </div>
    <div class="cms-bar__center">
      <button class="cms-bar__btn" id="cms-products-btn">🛍 Products</button>
      ${IS_PDP ? '<button class="cms-bar__btn" id="cms-edit-pdp-btn">✏️ Edit This Product</button>' : ''}
      <a href="manage-ecommerce.html" target="_blank" class="cms-bar__btn">⚙️ Ecommerce</a>
    </div>
    <div class="cms-bar__right">
      <button class="cms-bar__btn cms-bar__btn--save" id="cms-save-btn">Save Changes</button>
      <button class="cms-bar__btn cms-bar__btn--exit" id="cms-exit-btn">Exit Admin</button>
    </div>
  `;
  document.body.appendChild(bar);

  document.getElementById('cms-save-btn').onclick    = saveAll;
  document.getElementById('cms-exit-btn').onclick    = disableAdminMode;
  document.getElementById('cms-products-btn').onclick = openProductsPanel;

  if (IS_PDP) {
    const pid = new URLSearchParams(location.search).get('id');
    if (pid) document.getElementById('cms-edit-pdp-btn').onclick = () => openProductModalById(pid);
  }
}

/* ─── Save all changes ────────────────────────────────────────── */
async function saveAll() {
  const btn = document.getElementById('cms-save-btn');
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    // Page text + image edits
    const pageData = {};
    document.querySelectorAll('[data-ck]').forEach(el => {
      // Skip product-detail dynamic fields even if they somehow got a ck
      if (IS_PDP && el.id && PDP_SKIP_IDS.has(el.id)) return;
      pageData[el.dataset.ck] = el.tagName === 'IMG' ? el.src : el.innerHTML.trim();
    });

    // Social links
    const social = {};
    document.querySelectorAll('[data-cms-social]').forEach(el => {
      social[el.dataset.cmsSocial] = el.href;
    });

    // Influencer card edits
    const influencerCards = [];
    document.querySelectorAll('.influencer__card[data-cms-inf-url]').forEach(card => {
      const idx = parseInt(card.dataset.cmsInfluencerIdx ?? -1);
      if (idx >= 0) {
        influencerCards.push({ idx, type: card.dataset.cmsInfType, url: card.dataset.cmsInfUrl });
      }
    });

    await setDoc(doc(db, 'siteContent', PAGE_SLUG), { ...pageData, ...(influencerCards.length ? { influencerCards } : {}) });
    await setDoc(doc(db, 'siteContent', 'main'), { social }, { merge: true });
    cmsData = { ...pageData };
    showNotification('✓ Changes saved — live for all visitors!', 'success');
  } catch (e) {
    showNotification('✗ Save failed: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save Changes'; btn.disabled = false;
  }
}

/* ─── Products Panel ──────────────────────────────────────────── */
async function openProductsPanel() {
  document.getElementById('cms-products-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'cms-products-panel';
  panel.className = 'cms-panel';
  panel.innerHTML = `
    <div class="cms-panel__header">
      <h2 class="cms-panel__title">Products</h2>
      <button class="cms-panel__close" id="cms-products-close">✕</button>
    </div>
    <div class="cms-panel__tabs" id="cms-product-tabs">
      <button class="cms-tab ${_activeTab==='all'?'active':''}" data-cat="all">All</button>
      <button class="cms-tab ${_activeTab==='featured'?'active':''}" data-cat="featured">⭐ Featured</button>
      ${CATEGORIES.map(c => `<button class="cms-tab ${_activeTab===c?'active':''}" data-cat="${c}">${c[0].toUpperCase()+c.slice(1)}</button>`).join('')}
    </div>
    <div class="cms-panel__body">
      <button class="cms-panel__add-btn" id="cms-add-product-btn">+ Add New Product</button>
      <div id="cms-products-list"><p class="cms-loading">Loading…</p></div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#cms-products-close').onclick = () => panel.remove();
  panel.querySelector('#cms-add-product-btn').onclick = () => openProductModal(null);
  panel.querySelector('#cms-product-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.cms-tab');
    if (!btn) return;
    panel.querySelectorAll('.cms-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _activeTab = btn.dataset.cat;
    loadProductsList(_activeTab);
  });

  await loadProductsList(_activeTab);
}

async function loadProductsList(catFilter = 'all') {
  const listEl = document.getElementById('cms-products-list');
  if (!listEl) return;
  listEl.innerHTML = '<p class="cms-loading">Loading…</p>';
  try {
    const snap = await getDocs(collection(db, 'products'));
    let products = [];
    snap.forEach(d => products.push({ id: d.id, ...d.data() }));

    if (catFilter === 'featured') products = products.filter(p => p.featured);
    else if (catFilter !== 'all') products = products.filter(p => p.category === catFilter);

    if (!products.length) {
      listEl.innerHTML = `<p class="cms-empty">No ${catFilter === 'all' ? '' : catFilter + ' '}products found.</p>`;
      return;
    }
    listEl.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'cms-product-card';
      card.innerHTML = `
        <img src="${p.images?.[0] || 'logo.png'}" alt="${p.name}" class="cms-product-card__img" />
        <div class="cms-product-card__info">
          <div class="cms-product-card__name">${p.name || 'Untitled'}</div>
          <div class="cms-product-card__meta">
            ${(p.category||'').charAt(0).toUpperCase()+(p.category||'—').slice(1)}
            · ₹${(p.prices?.IN||0).toLocaleString('en-IN')}
            ${p.featured ? ' · <span style="color:#c9a84c">⭐ Featured</span>' : ''}
          </div>
        </div>
        <div class="cms-product-card__actions">
          <button class="cms-pca cms-pca--feat ${p.featured?'on':''}" title="${p.featured?'Remove from Featured':'Add to Featured'}">${p.featured?'⭐':'☆'}</button>
          <button class="cms-pca cms-pca--edit">Edit</button>
          <button class="cms-pca cms-pca--del">Del</button>
        </div>
      `;
      card.querySelector('.cms-pca--feat').onclick = () => toggleFeatured(p.id, !p.featured);
      card.querySelector('.cms-pca--edit').onclick = () => openProductModal(p.id, p);
      card.querySelector('.cms-pca--del').onclick  = () => deleteProduct(p.id, p.name);
      listEl.appendChild(card);
    });
  } catch (e) {
    listEl.innerHTML = `<p style="color:red;font-size:.82rem">Error: ${e.message}</p>`;
  }
}

async function toggleFeatured(id, featured) {
  try {
    await updateDoc(doc(db, 'products', id), { featured });
    await loadProductsList(_activeTab);
    showNotification(featured ? '⭐ Added to Featured' : '☆ Removed from Featured', 'success');
  } catch (e) { showNotification('✗ ' + e.message, 'error'); }
}

/* ─── Product Modal ───────────────────────────────────────────── */
function openProductModal(id, data = {}) {
  document.getElementById('cms-product-modal')?.remove();
  const prices = data.prices || {};
  const images = data.images || [];

  const modal = document.createElement('div');
  modal.id = 'cms-product-modal';
  modal.className = 'cms-modal-overlay';
  modal.innerHTML = `
    <div class="cms-modal">
      <div class="cms-modal__header">
        <h3 class="cms-modal__title">${id ? 'Edit Product' : 'Add New Product'}</h3>
        <button class="cms-modal__close" id="cms-modal-close">✕</button>
      </div>
      <div class="cms-modal__body">
        <div class="cms-form-row">
          <div class="cms-form-field">
            <label>Product Name *</label>
            <input type="text" id="prd-name" value="${esc(data.name)}" placeholder="e.g. Solitaire Ring" />
          </div>
          <div class="cms-form-field">
            <label>Category *</label>
            <select id="prd-cat">
              ${CATEGORIES.map(c => `<option value="${c}" ${data.category===c?'selected':''}>${c[0].toUpperCase()+c.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="cms-form-row">
          <div class="cms-form-field">
            <label>Subtitle</label>
            <input type="text" id="prd-subtitle" value="${esc(data.subtitle)}" placeholder="e.g. Crafted in 18K gold" />
          </div>
          <div class="cms-form-field">
            <label>Badge</label>
            <input type="text" id="prd-badge" value="${esc(data.badge)||'new'}" placeholder="new / limited edition" />
          </div>
        </div>
        <div class="cms-form-field">
          <label>Description</label>
          <textarea id="prd-desc" rows="3">${esc(data.description)}</textarea>
        </div>
        <div class="cms-form-section-title">Homepage Featured Carousel</div>
        <label class="cms-featured-toggle">
          <input type="checkbox" id="prd-featured" ${data.featured?'checked':''} />
          <span>Show in homepage featured carousel</span>
        </label>
        <div class="cms-form-section-title">
          Images (URL) — Image 1 &amp; 2: shop card. Images 3–5: product detail gallery.
        </div>
        ${[0,1,2,3,4].map(i => `
          <div class="cms-form-field">
            <label>Image ${i+1}${i<2?' *':' (optional)'}</label>
            <input type="text" id="prd-img-${i}" value="${esc(images[i])}" placeholder="https://..." />
          </div>
        `).join('')}
        <div class="cms-form-row">
          <div class="cms-form-field">
            <label>Stock Status</label>
            <select id="prd-stock">
              <option value="in_stock"    ${(data.stock?.status||'in_stock')==='in_stock'?'selected':''}>In Stock</option>
              <option value="out_of_stock" ${data.stock?.status==='out_of_stock'?'selected':''}>Out of Stock</option>
              <option value="coming_soon"  ${data.stock?.status==='coming_soon'?'selected':''}>Coming Soon</option>
            </select>
          </div>
          <div class="cms-form-field">
            <label>Quantity</label>
            <input type="number" id="prd-qty" value="${data.stock?.qty ?? 50}" min="0" />
          </div>
        </div>
        <div class="cms-form-section-title">Pricing by Country</div>
        <div class="cms-prices-grid">
          ${COUNTRIES.map(c => `
            <div class="cms-price-row">
              <label>${c.label}</label>
              <div class="cms-price-input-wrap">
                <span class="cms-price-symbol">${c.symbol}</span>
                <input type="number" id="prd-price-${c.key}" value="${prices[c.key]||''}" placeholder="0" min="0" />
              </div>
            </div>
          `).join('')}
        </div>
        <div class="cms-form-section-title">Reviews</div>
        <div id="prd-reviews-list"></div>
        <button type="button" class="cms-panel__add-btn" id="add-review-btn" style="margin-top:.5rem">+ Add Review</button>
      </div>
      <div class="cms-modal__footer">
        <button class="cms-btn cms-btn--ghost" id="cms-modal-cancel">Cancel</button>
        <button class="cms-btn cms-btn--primary" id="cms-modal-save">${id ? 'Update Product' : 'Create Product'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  (data.reviews || []).forEach((r, i) => appendReviewRow(i, r));
  modal.querySelector('#cms-modal-close').onclick  = () => modal.remove();
  modal.querySelector('#cms-modal-cancel').onclick = () => modal.remove();
  modal.querySelector('#add-review-btn').onclick   = () => appendReviewRow(Date.now());

  modal.querySelector('#cms-modal-save').onclick = async () => {
    const btn  = modal.querySelector('#cms-modal-save');
    const name = document.getElementById('prd-name').value.trim();
    if (!name) { showNotification('Product name is required', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Saving…';

    const productData = {
      name,
      category:    document.getElementById('prd-cat').value,
      subtitle:    document.getElementById('prd-subtitle').value.trim(),
      badge:       document.getElementById('prd-badge').value.trim(),
      description: document.getElementById('prd-desc').value.trim(),
      featured:    document.getElementById('prd-featured').checked,
      images:      [0,1,2,3,4].map(i => (document.getElementById(`prd-img-${i}`)?.value||'').trim()).filter(Boolean),
      stock: {
        status: document.getElementById('prd-stock').value,
        qty:    parseInt(document.getElementById('prd-qty').value) || 0,
      },
      prices: Object.fromEntries(
        COUNTRIES.map(c => {
          const v = parseFloat(document.getElementById(`prd-price-${c.key}`)?.value);
          return [c.key, isNaN(v) ? null : v];
        }).filter(([, v]) => v !== null)
      ),
      reviews:   collectReviews(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (id) await setDoc(doc(db, 'products', id), productData, { merge: true });
      else { productData.createdAt = serverTimestamp(); await addDoc(collection(db, 'products'), productData); }
      modal.remove();
      await loadProductsList(_activeTab);
      showNotification('✓ Product saved!', 'success');
    } catch (e) {
      showNotification('✗ Error: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = id ? 'Update Product' : 'Create Product';
    }
  };
}

async function openProductModalById(productId) {
  try {
    const snap = await getDoc(doc(db, 'products', productId));
    if (snap.exists()) openProductModal(snap.id, snap.data());
    else showNotification('Product not found in Firestore', 'error');
  } catch (e) { showNotification('✗ ' + e.message, 'error'); }
}

/* ─── Reviews ─────────────────────────────────────────────────── */
function appendReviewRow(id, data = {}) {
  const list = document.getElementById('prd-reviews-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'cms-review-row';
  row.innerHTML = `
    <div class="cms-form-row" style="align-items:flex-end;gap:.5rem">
      <div class="cms-form-field" style="flex:2"><label>Name</label><input type="text" class="rv-name" value="${esc(data.name)}" placeholder="Ananya S." /></div>
      <div class="cms-form-field" style="flex:1"><label>Stars</label><input type="number" class="rv-stars" value="${data.stars||5}" min="1" max="5" /></div>
      <div class="cms-form-field" style="flex:1"><label>Verified</label><select class="rv-verified"><option value="true" ${data.verified!==false?'selected':''}>Yes</option><option value="false" ${data.verified===false?'selected':''}>No</option></select></div>
      <button type="button" class="cms-review-row__delete">✕</button>
    </div>
    <div class="cms-form-field"><label>Review Text</label><textarea class="rv-text" rows="2">${esc(data.text)}</textarea></div>
  `;
  row.querySelector('.cms-review-row__delete').onclick = () => row.remove();
  list.appendChild(row);
}

function collectReviews() {
  return Array.from(document.querySelectorAll('.cms-review-row')).map(row => ({
    name:     row.querySelector('.rv-name').value.trim(),
    stars:    parseInt(row.querySelector('.rv-stars').value) || 5,
    verified: row.querySelector('.rv-verified').value === 'true',
    text:     row.querySelector('.rv-text').value.trim(),
    date:     new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }),
  })).filter(r => r.name);
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    await loadProductsList(_activeTab);
    showNotification('✓ Product deleted.', 'success');
  } catch (e) { showNotification('✗ Error: ' + e.message, 'error'); }
}

/* ─── Seed default products ───────────────────────────────────── */
async function seedProductsIfEmpty() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (!snap.empty) return;
    showNotification('First login — seeding 6 default products…', 'info');
    for (const p of DEFAULT_PRODUCTS) {
      await addDoc(collection(db, 'products'), { ...p, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    showNotification('✓ 6 default products added!', 'success');
  } catch (e) { console.warn('[CMS] Seed failed:', e.message); }
}

/* ─── Login Modal ─────────────────────────────────────────────── */
function showLoginModal() {
  if (document.getElementById('cms-login-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'cms-login-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
  modal.innerHTML = `
    <div style="background:#fff;padding:2.5rem;border-radius:16px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;margin:0 0 .4rem;color:#111;text-align:center">Admin Login</h2>
      <p style="font-size:.76rem;color:#aaa;text-align:center;margin:0 0 1.5rem">Alfaaz Content Management</p>
      <p id="cms-login-err" style="color:#c0392b;font-size:.8rem;margin-bottom:1rem;display:none;background:#fef0ee;border-radius:8px;padding:.5rem .8rem"></p>
      <input type="email"    id="cms-email" placeholder="Admin email"
        style="width:100%;padding:.8rem 1rem;margin-bottom:.75rem;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;box-sizing:border-box" />
      <input type="password" id="cms-pass"  placeholder="Password"
        style="width:100%;padding:.8rem 1rem;margin-bottom:1.25rem;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;box-sizing:border-box" />
      <button id="cms-login-btn"
        style="width:100%;background:#111;color:#fff;padding:.9rem;border:none;border-radius:9999px;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer">
        Log In
      </button>
      <button id="cms-login-cancel"
        style="width:100%;background:none;border:none;color:#888;padding:.8rem;margin-top:.5rem;cursor:pointer;font-size:.82rem">
        Cancel
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  const errEl = modal.querySelector('#cms-login-err');
  modal.querySelector('#cms-login-btn').onclick = async () => {
    errEl.style.display = 'none';
    const btn = modal.querySelector('#cms-login-btn');
    btn.textContent = 'Logging in…'; btn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth,
        modal.querySelector('#cms-email').value.trim(),
        modal.querySelector('#cms-pass').value);
      modal.remove();
      // onAuthStateChanged fires → enableAdminMode()
    } catch (e) {
      errEl.textContent = 'Login failed. Check your email and password.';
      errEl.style.display = 'block';
      btn.textContent = 'Log In'; btn.disabled = false;
    }
  };
  modal.querySelector('#cms-login-cancel').onclick = () => {
    modal.remove();
    history.replaceState(null, '', location.pathname);
  };
  modal.querySelector('#cms-pass').onkeydown = e => {
    if (e.key === 'Enter') modal.querySelector('#cms-login-btn').click();
  };
}

/* ─── Notification toast ─────────────────────────────────────── */
function showNotification(msg, type = 'success') {
  const bg = { success:'#111', error:'#c0392b', info:'#1a73e8' }[type] || '#111';
  const n  = document.createElement('div');
  n.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:.75rem 1.5rem;border-radius:9999px;font-size:.82rem;font-weight:600;letter-spacing:.04em;z-index:999999;white-space:nowrap;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.2)`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

/* ─── CSS ─────────────────────────────────────────────────────── */
const style = document.createElement('style');
style.textContent = `
body.cms-admin { padding-bottom: 62px !important; }

/* Edit outlines */
body.cms-admin [data-ck]:not(img) { cursor:text; transition:outline .15s; }
body.cms-admin [data-ck]:not(img):hover { outline:2px solid rgba(201,168,76,0.8) !important; }
body.cms-admin [data-cms-social] { cursor:pointer; }

/* Admin Bar */
#cms-admin-bar {
  position:fixed; bottom:0; left:0; right:0; z-index:99999;
  background:#111; color:#fff;
  display:flex; align-items:center; justify-content:space-between;
  padding:.7rem 1.25rem; gap:.75rem;
  box-shadow:0 -4px 24px rgba(0,0,0,.35);
  font-family:Inter,sans-serif;
  height:54px; box-sizing:border-box;
}
.cms-bar__left  { display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
.cms-bar__center{ display:flex; align-items:center; gap:.4rem; }
.cms-bar__right { display:flex; align-items:center; gap:.4rem; flex-shrink:0; }
.cms-bar__dot   { width:8px; height:8px; border-radius:50%; background:#c9a84c; animation:cmsPulse 2s infinite; }
.cms-bar__label { font-size:.72rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#c9a84c; }
@keyframes cmsPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
.cms-bar__btn {
  background:rgba(255,255,255,.1); color:#fff;
  border:1px solid rgba(255,255,255,.2); padding:.45rem .9rem; border-radius:9999px;
  font-family:Inter,sans-serif; font-size:.72rem; font-weight:600; letter-spacing:.07em;
  text-transform:uppercase; cursor:pointer; text-decoration:none; transition:background .2s; white-space:nowrap;
}
.cms-bar__btn:hover { background:rgba(255,255,255,.2); color:#fff; }
.cms-bar__btn--save { background:#c9a84c; border-color:#c9a84c; color:#111; }
.cms-bar__btn--save:hover { background:#b8963e; }
.cms-bar__btn--exit { border-color:rgba(255,80,80,.4); color:#ff7070; }
.cms-bar__btn--exit:hover { background:rgba(255,80,80,.15); }

/* Products Panel */
.cms-panel {
  position:fixed; top:0; right:0; bottom:54px; width:500px; max-width:100vw;
  background:#fff; z-index:99998;
  box-shadow:-8px 0 40px rgba(0,0,0,.18);
  display:flex; flex-direction:column;
  animation:cmsPanelIn .3s cubic-bezier(.25,.46,.45,.94);
  font-family:Inter,sans-serif;
}
@keyframes cmsPanelIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
.cms-panel__header { display:flex; align-items:center; justify-content:space-between; padding:1.1rem 1.4rem; border-bottom:1px solid rgba(0,0,0,.08); flex-shrink:0; }
.cms-panel__title  { font-family:'Cormorant Garamond',serif; font-size:1.55rem; font-weight:400; color:#111; margin:0; }
.cms-panel__close  { background:none; border:none; font-size:1.1rem; cursor:pointer; color:#888; padding:.3rem; border-radius:50%; transition:background .2s; }
.cms-panel__close:hover { background:#f0efea; }

/* Category Tabs — wrap so nothing is cut off */
.cms-panel__tabs {
  display:flex; flex-wrap:wrap; gap:.3rem;
  padding:.75rem 1.4rem; border-bottom:1px solid rgba(0,0,0,.06); flex-shrink:0;
}
.cms-tab {
  background:#f7f5f0; border:none; border-radius:9999px;
  padding:.35rem .8rem; font-family:Inter,sans-serif;
  font-size:.72rem; font-weight:600; color:#777;
  cursor:pointer; white-space:nowrap; transition:all .2s;
}
.cms-tab.active,.cms-tab:hover { background:#111; color:#fff; }

.cms-panel__body    { flex:1; overflow-y:auto; padding:1.1rem 1.4rem; }
.cms-panel__add-btn {
  display:block; width:100%; padding:.75rem; background:#f7f5f0;
  border:1.5px dashed #ccc; border-radius:10px;
  font-size:.8rem; font-weight:600; font-family:Inter,sans-serif;
  color:#555; cursor:pointer; text-align:center; margin-bottom:1rem;
  transition:border-color .2s,color .2s;
}
.cms-panel__add-btn:hover { border-color:#111; color:#111; }

/* Product cards */
.cms-product-card { display:flex; align-items:center; gap:.75rem; padding:.8rem 0; border-bottom:1px solid rgba(0,0,0,.06); }
.cms-product-card__img  { width:52px; height:52px; border-radius:8px; object-fit:cover; background:#f0efea; flex-shrink:0; }
.cms-product-card__info { flex:1; min-width:0; }
.cms-product-card__name { font-size:.86rem; font-weight:600; color:#111; }
.cms-product-card__meta { font-size:.74rem; color:#888; margin-top:.15rem; }
.cms-product-card__actions { display:flex; gap:.35rem; flex-shrink:0; }
.cms-pca { padding:.32rem .65rem; border-radius:9999px; font-size:.7rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .2s; font-family:Inter,sans-serif; }
.cms-pca--feat { background:#f7f5f0; color:#888; border-color:#e8e4dc; }
.cms-pca--feat.on { background:#fff8e7; color:#c9a84c; border-color:#c9a84c; }
.cms-pca--feat:hover { border-color:#c9a84c; }
.cms-pca--edit { background:#111; color:#fff; }
.cms-pca--edit:hover { background:#333; }
.cms-pca--del  { background:#fef0ee; color:#c0392b; }
.cms-pca--del:hover { background:#fde0dd; }
.cms-loading { color:#aaa; font-size:.82rem; }
.cms-empty   { color:#aaa; font-size:.82rem; margin-top:.5rem; }

/* Product Modal */
.cms-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:999999; display:flex; align-items:center; justify-content:center; padding:1rem; font-family:Inter,sans-serif; }
.cms-modal { background:#fff; border-radius:16px; width:100%; max-width:640px; max-height:92vh; display:flex; flex-direction:column; box-shadow:0 24px 64px rgba(0,0,0,.28); }
.cms-modal__header { display:flex; align-items:center; justify-content:space-between; padding:1.2rem 1.5rem; border-bottom:1px solid rgba(0,0,0,.08); flex-shrink:0; }
.cms-modal__title  { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:400; color:#111; margin:0; }
.cms-modal__close  { background:none; border:none; font-size:1.1rem; cursor:pointer; color:#888; padding:.3rem; border-radius:50%; }
.cms-modal__body   { flex:1; overflow-y:auto; padding:1.4rem 1.5rem; display:flex; flex-direction:column; gap:.85rem; }
.cms-modal__footer { display:flex; gap:.75rem; justify-content:flex-end; padding:1.1rem 1.5rem; border-top:1px solid rgba(0,0,0,.08); flex-shrink:0; }

/* Forms */
.cms-form-row   { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
.cms-form-field { display:flex; flex-direction:column; gap:.3rem; }
.cms-form-field label { font-size:.7rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#888; }
.cms-form-field input,.cms-form-field select,.cms-form-field textarea {
  border:1.5px solid rgba(0,0,0,.14); border-radius:9px;
  padding:.6rem .9rem; font-size:.87rem; font-family:inherit; color:#111;
  background:#fafaf8; transition:border-color .2s; outline:none;
}
.cms-form-field input:focus,.cms-form-field select:focus,.cms-form-field textarea:focus { border-color:#111; background:#fff; }
.cms-form-field textarea { resize:vertical; }
.cms-form-section-title { font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#bbb; padding:.35rem 0; border-bottom:1px solid rgba(0,0,0,.06); }
.cms-featured-toggle { display:flex; align-items:center; gap:.6rem; cursor:pointer; font-size:.85rem; color:#444; padding:.35rem 0; }
.cms-featured-toggle input { width:16px; height:16px; cursor:pointer; accent-color:#c9a84c; }
.cms-prices-grid { display:grid; grid-template-columns:1fr 1fr; gap:.5rem; }
.cms-price-row   { display:flex; flex-direction:column; gap:.28rem; }
.cms-price-row label { font-size:.72rem; color:#666; }
.cms-price-input-wrap { display:flex; align-items:center; border:1.5px solid rgba(0,0,0,.14); border-radius:8px; overflow:hidden; background:#fafaf8; }
.cms-price-symbol { padding:.48rem .6rem; font-size:.8rem; color:#888; background:#f0efea; border-right:1px solid rgba(0,0,0,.1); flex-shrink:0; }
.cms-price-input-wrap input { border:none; border-radius:0; padding:.48rem .65rem; background:transparent; width:100%; font-size:.84rem; outline:none; }
.cms-review-row { background:#f7f5f0; border-radius:10px; padding:.75rem; margin-bottom:.45rem; position:relative; }
.cms-review-row__delete { position:absolute; top:.5rem; right:.5rem; background:none; border:none; color:#bbb; cursor:pointer; font-size:.85rem; }
.cms-review-row__delete:hover { color:#c0392b; }
.cms-btn { padding:.65rem 1.25rem; border-radius:9999px; font-size:.74rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; border:none; font-family:Inter,sans-serif; transition:background .2s; }
.cms-btn--primary { background:#111; color:#fff; }
.cms-btn--primary:hover { background:#333; }
.cms-btn--ghost { background:none; border:1.5px solid rgba(0,0,0,.14); color:#666; }
.cms-btn--ghost:hover { border-color:#111; color:#111; }

/* Influencer card overlay */
.cms-inf-overlay {
  position:absolute; inset:0;
  display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,.0); opacity:0;
  transition:opacity .25s, background .25s;
  cursor:pointer; z-index:10; border-radius:inherit;
}
body.cms-admin .influencer__card:hover .cms-inf-overlay {
  opacity:1; background:rgba(0,0,0,.4);
}
.cms-inf-overlay span {
  background:#111; color:#fff;
  padding:.45rem 1rem; border-radius:9999px;
  font-family:Inter,sans-serif; font-size:.72rem; font-weight:700; letter-spacing:.05em;
  pointer-events:none;
}
`;
document.head.appendChild(style);

/* ─── Start ───────────────────────────────────────────────────── */
boot();

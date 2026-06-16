/**
 * cms.js — Aalfaz CMS + Admin Mode Engine
 * -----------------------------------------
 * • Fetches /siteContent/main from Firestore and hydrates [data-cms-key] elements
 * • When #admin hash is present and user is authenticated → Admin Mode activates
 * • Admin mode: click any text to edit inline, click any image to set URL,
 *   click social icons to set links, manage products from a floating panel
 * • "Save Changes" writes back to Firestore → live for all visitors instantly
 */

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, collection, getDocs,
  addDoc, deleteDoc, serverTimestamp, query, where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── State ──────────────────────────────────────────────────────────
let cmsData   = {};
let isAdmin   = false;
let auth, db;

const ADMIN_EMAIL = 'website.aalfaz@gmail.com'; // change if needed

// ── Boot ───────────────────────────────────────────────────────────
function boot() {
  if (!window.firebaseAuth || !window.firebaseDb) {
    return setTimeout(boot, 80);
  }
  auth = window.firebaseAuth;
  db   = window.firebaseDb;
  fetchAndHydrate();

  onAuthStateChanged(auth, user => {
    if (window.location.hash === '#admin') {
      if (user) enableAdminMode();
      else showLoginModal();
    }
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      if (auth.currentUser) enableAdminMode();
      else showLoginModal();
    } else {
      disableAdminMode();
    }
  });

  if (window.location.hash === '#admin') {
    if (auth.currentUser) enableAdminMode();
    else showLoginModal();
  }
}

// ── Fetch + Hydrate DOM ────────────────────────────────────────────
async function fetchAndHydrate() {
  try {
    const snap = await getDoc(doc(db, 'siteContent', 'main'));
    if (snap.exists()) cmsData = snap.data();
    hydrateDOM();
    hydrateFooterSocial();
  } catch (e) {
    console.warn('[CMS] Could not fetch content:', e.message);
  }
}

function getVal(path) {
  return path.split('.').reduce((o, k) => o?.[k], cmsData);
}
function setVal(obj, path, val) {
  const parts = path.split('.');
  const last  = parts.pop();
  const node  = parts.reduce((o, k) => { if (!o[k]) o[k] = {}; return o[k]; }, obj);
  node[last]  = val;
}

function hydrateDOM() {
  document.querySelectorAll('[data-cms-key]').forEach(el => {
    const val = getVal(el.dataset.cmsKey);
    if (!val) return;
    if (el.tagName === 'IMG') {
      el.src = val;
    } else if (el.dataset.cmsType === 'href') {
      el.href = val;
    } else {
      el.innerHTML = val;
    }
  });
}

// Social links: data-cms-social="instagram" on <a> tags
function hydrateFooterSocial() {
  const social = cmsData.social || {};
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    const key = el.dataset.cmsSocial;
    if (social[key]) el.href = social[key];
  });
}

// ── Admin Mode ─────────────────────────────────────────────────────
function enableAdminMode() {
  if (isAdmin) return;
  isAdmin = true;
  document.body.classList.add('cms-admin');
  makeEditable();
  makeSocialEditable();
  injectAdminBar();
  // Show the footer admin link
  const adminLink = document.getElementById('manage-ecom-link');
  if (adminLink) adminLink.style.display = '';
}

function disableAdminMode() {
  if (!isAdmin) return;
  isAdmin = false;
  document.body.classList.remove('cms-admin');
  document.querySelectorAll('[data-cms-key]').forEach(el => {
    el.contentEditable = 'false';
    el.onclick = null;
  });
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    el.onclick = null;
  });
  document.getElementById('cms-admin-bar')?.remove();
  document.getElementById('cms-products-panel')?.remove();
}

// Make text & image elements editable
function makeEditable() {
  document.querySelectorAll('[data-cms-key]').forEach(el => {
    if (el.tagName === 'IMG') {
      el.style.outline = '2px dashed #c9a84c';
      el.style.cursor  = 'pointer';
      el.title = '📷 Click to change image';
      el.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        const url = prompt('Enter new image URL:', el.src);
        if (url && url.trim()) { el.src = url.trim(); }
      };
    } else {
      el.contentEditable = 'true';
      el.style.outline   = '1px dashed rgba(201,168,76,0.6)';
      el.title = '✏️ Click to edit';
    }
  });
}

// Social icons — click to set URL
function makeSocialEditable() {
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    el.style.outline = '2px dashed #c9a84c';
    const key = el.dataset.cmsSocial;
    const label = { call:'Phone number (tel:+91...)', whatsapp:'WhatsApp number (e.g. 919876543210)', instagram:'Instagram URL', email:'Email address', facebook:'Facebook URL' }[key] || key;
    el.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const cur = el.href !== '#' ? el.href : '';
      const val = prompt(`Set ${label}:`, cur);
      if (val === null) return;
      const trimmed = val.trim();
      if (key === 'call')      el.href = trimmed.startsWith('tel:') ? trimmed : 'tel:' + trimmed;
      else if (key === 'whatsapp') el.href = trimmed.startsWith('https://') ? trimmed : 'https://wa.me/' + trimmed.replace(/\D/g,'');
      else if (key === 'email') el.href = trimmed.startsWith('mailto:') ? trimmed : 'mailto:' + trimmed;
      else el.href = trimmed;
    };
  });
}

// ── Admin Bar ──────────────────────────────────────────────────────
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
      <button class="cms-bar__btn cms-bar__btn--ghost" id="cms-products-btn">🛍 Products</button>
      <button class="cms-bar__btn cms-bar__btn--ghost" id="cms-reviews-btn">⭐ Reviews</button>
      <a href="manage-ecommerce.html" target="_blank" class="cms-bar__btn cms-bar__btn--ghost">⚙️ Manage Ecommerce</a>
    </div>
    <div class="cms-bar__right">
      <button class="cms-bar__btn cms-bar__btn--save" id="cms-save-btn">Save Changes</button>
      <button class="cms-bar__btn cms-bar__btn--exit" id="cms-exit-btn">Exit Admin</button>
    </div>
  `;
  document.body.appendChild(bar);

  document.getElementById('cms-save-btn').onclick  = saveAll;
  document.getElementById('cms-exit-btn').onclick  = () => signOut(auth).then(() => { window.location.hash = ''; location.reload(); });
  document.getElementById('cms-products-btn').onclick = () => openProductsPanel();
  document.getElementById('cms-reviews-btn').onclick  = () => openReviewsPanel();
}

// ── Save All Changes ───────────────────────────────────────────────
async function saveAll() {
  const btn = document.getElementById('cms-save-btn');
  btn.textContent = 'Saving…';
  btn.disabled = true;

  // 1. Collect text/image edits
  const newData = JSON.parse(JSON.stringify(cmsData));
  document.querySelectorAll('[data-cms-key]').forEach(el => {
    const val = el.tagName === 'IMG' ? el.src : el.innerHTML.trim();
    setVal(newData, el.dataset.cmsKey, val);
  });

  // 2. Collect social link edits
  if (!newData.social) newData.social = {};
  document.querySelectorAll('[data-cms-social]').forEach(el => {
    newData.social[el.dataset.cmsSocial] = el.href;
  });

  try {
    await setDoc(doc(db, 'siteContent', 'main'), newData);
    cmsData = newData;
    showNotification('✓ Changes saved successfully!', 'success');
  } catch (e) {
    showNotification('✗ Save failed: ' + e.message, 'error');
  } finally {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
}

// ── Products Panel ─────────────────────────────────────────────────
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
    <div class="cms-panel__body">
      <button class="cms-panel__add-btn" id="cms-add-product-btn">+ Add New Product</button>
      <div id="cms-products-list"><p style="color:#888;font-size:.85rem;">Loading…</p></div>
    </div>
  `;
  document.body.appendChild(panel);
  document.getElementById('cms-products-close').onclick = () => panel.remove();
  document.getElementById('cms-add-product-btn').onclick = () => openProductModal(null);

  await loadProductsList();
}

async function loadProductsList() {
  const listEl = document.getElementById('cms-products-list');
  if (!listEl) return;
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) { listEl.innerHTML = '<p style="color:#888;font-size:.85rem;">No products yet. Add one above.</p>'; return; }
    listEl.innerHTML = '';
    snap.forEach(d => {
      const p = d.data();
      const card = document.createElement('div');
      card.className = 'cms-product-card';
      card.innerHTML = `
        <img src="${p.images?.[0] || 'logo.png'}" alt="${p.name}" class="cms-product-card__img" />
        <div class="cms-product-card__info">
          <div class="cms-product-card__name">${p.name || 'Untitled'}</div>
          <div class="cms-product-card__meta">${p.category || '—'} · ₹${(p.prices?.IN || 0).toLocaleString('en-IN')}</div>
        </div>
        <div class="cms-product-card__actions">
          <button class="cms-product-card__edit" data-id="${d.id}">Edit</button>
          <button class="cms-product-card__delete" data-id="${d.id}">Delete</button>
        </div>
      `;
      card.querySelector('.cms-product-card__edit').onclick   = () => openProductModal(d.id, p);
      card.querySelector('.cms-product-card__delete').onclick = () => deleteProduct(d.id, p.name);
      listEl.appendChild(card);
    });
  } catch (e) {
    listEl.innerHTML = `<p style="color:red;font-size:.85rem;">Error: ${e.message}</p>`;
  }
}

const COUNTRIES = [
  { key:'IN', label:'🇮🇳 India',       symbol:'₹',   code:'INR' },
  { key:'US', label:'🇺🇸 USA',          symbol:'$',   code:'USD' },
  { key:'GB', label:'🇬🇧 UK',           symbol:'£',   code:'GBP' },
  { key:'AE', label:'🇦🇪 UAE',          symbol:'د.إ', code:'AED' },
  { key:'SA', label:'🇸🇦 Saudi Arabia', symbol:'﷼',   code:'SAR' },
  { key:'AU', label:'🇦🇺 Australia',    symbol:'A$',  code:'AUD' },
  { key:'CA', label:'🇨🇦 Canada',       symbol:'CA$', code:'CAD' },
  { key:'EU', label:'🇪🇺 Europe',       symbol:'€',   code:'EUR' },
  { key:'SG', label:'🇸🇬 Singapore',    symbol:'S$',  code:'SGD' },
];

function openProductModal(id, data = {}) {
  document.getElementById('cms-product-modal')?.remove();
  const prices = data.prices || {};
  const images = data.images || ['','',''];
  const cats   = ['rings','pendants','earrings','bracelets','anklets','featured'];

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
            <label>Product Name</label>
            <input type="text" id="prd-name" value="${data.name || ''}" placeholder="e.g. Solitaire Ring" />
          </div>
          <div class="cms-form-field">
            <label>Category</label>
            <select id="prd-cat">
              ${cats.map(c => `<option value="${c}" ${data.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="cms-form-row">
          <div class="cms-form-field">
            <label>Badge (e.g. new, limited edition)</label>
            <input type="text" id="prd-badge" value="${data.badge || 'new'}" />
          </div>
          <div class="cms-form-field">
            <label>Subtitle</label>
            <input type="text" id="prd-subtitle" value="${data.subtitle || ''}" placeholder="e.g. Crafted in 18K gold" />
          </div>
        </div>
        <div class="cms-form-field">
          <label>Description</label>
          <textarea id="prd-desc" rows="3" placeholder="Product description...">${data.description || ''}</textarea>
        </div>
        <div class="cms-form-section-title">Images (URLs)</div>
        ${[0,1,2].map(i => `
          <div class="cms-form-field">
            <label>Image ${i+1} URL</label>
            <input type="text" id="prd-img-${i}" value="${images[i]||''}" placeholder="https://..." />
          </div>
        `).join('')}
        <div class="cms-form-row">
          <div class="cms-form-field">
            <label>Stock Status</label>
            <select id="prd-stock">
              <option value="in_stock" ${(data.stock?.status||'in_stock')==='in_stock'?'selected':''}>In Stock</option>
              <option value="out_of_stock" ${data.stock?.status==='out_of_stock'?'selected':''}>Out of Stock</option>
              <option value="coming_soon" ${data.stock?.status==='coming_soon'?'selected':''}>Coming Soon</option>
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
                <input type="number" id="prd-price-${c.key}" value="${prices[c.key] || ''}" placeholder="0" min="0" />
              </div>
            </div>
          `).join('')}
        </div>
        <div class="cms-form-section-title">Reviews</div>
        <div id="prd-reviews-area">
          <div id="prd-reviews-list"></div>
          <button type="button" class="cms-btn cms-btn--ghost" id="add-review-btn" style="margin-top:.5rem;">+ Add Review</button>
        </div>
      </div>
      <div class="cms-modal__footer">
        <button class="cms-btn cms-btn--ghost" id="cms-modal-cancel">Cancel</button>
        <button class="cms-btn cms-btn--primary" id="cms-modal-save">${id ? 'Update Product' : 'Create Product'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Populate existing reviews
  const reviews = data.reviews || [];
  reviews.forEach((r, i) => appendReviewRow(i, r));

  document.getElementById('cms-modal-close').onclick  = () => modal.remove();
  document.getElementById('cms-modal-cancel').onclick = () => modal.remove();
  document.getElementById('add-review-btn').onclick   = () => appendReviewRow(Date.now());

  document.getElementById('cms-modal-save').onclick = async () => {
    const btn = document.getElementById('cms-modal-save');
    btn.disabled = true; btn.textContent = 'Saving…';

    const productData = {
      name:        document.getElementById('prd-name').value.trim(),
      category:    document.getElementById('prd-cat').value,
      badge:       document.getElementById('prd-badge').value.trim(),
      subtitle:    document.getElementById('prd-subtitle').value.trim(),
      description: document.getElementById('prd-desc').value.trim(),
      images: [0,1,2].map(i => document.getElementById(`prd-img-${i}`).value.trim()).filter(Boolean),
      stock: {
        status: document.getElementById('prd-stock').value,
        qty:    parseInt(document.getElementById('prd-qty').value) || 0,
      },
      prices: Object.fromEntries(COUNTRIES.map(c => {
        const v = parseFloat(document.getElementById(`prd-price-${c.key}`).value);
        return [c.key, isNaN(v) ? null : v];
      }).filter(([,v]) => v !== null)),
      reviews: collectReviews(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (id) {
        await setDoc(doc(db, 'products', id), productData, { merge: true });
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
      }
      modal.remove();
      await loadProductsList();
      showNotification('✓ Product saved!', 'success');
    } catch (e) {
      showNotification('✗ Error: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = id ? 'Update Product' : 'Create Product';
    }
  };
}

function appendReviewRow(id, data = {}) {
  const list = document.getElementById('prd-reviews-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'cms-review-row';
  row.dataset.rid = id;
  row.innerHTML = `
    <div class="cms-form-row" style="align-items:flex-end;gap:.5rem;">
      <div class="cms-form-field" style="flex:2;">
        <label>Reviewer Name</label>
        <input type="text" class="rv-name" value="${data.name||''}" placeholder="Ananya S." />
      </div>
      <div class="cms-form-field" style="flex:1;">
        <label>Stars (1–5)</label>
        <input type="number" class="rv-stars" value="${data.stars||5}" min="1" max="5" />
      </div>
      <div class="cms-form-field" style="flex:1;">
        <label>Verified</label>
        <select class="rv-verified"><option value="true" ${data.verified!==false?'selected':''}>Yes</option><option value="false" ${data.verified===false?'selected':''}>No</option></select>
      </div>
      <button type="button" class="cms-review-row__delete" title="Remove">✕</button>
    </div>
    <div class="cms-form-field">
      <label>Review Text</label>
      <textarea class="rv-text" rows="2" placeholder="Review content...">${data.text||''}</textarea>
    </div>
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
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    await loadProductsList();
    showNotification('✓ Product deleted.', 'success');
  } catch (e) {
    showNotification('✗ Error: ' + e.message, 'error');
  }
}

// ── Reviews Panel (standalone, select product) ─────────────────────
async function openReviewsPanel() {
  document.getElementById('cms-reviews-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'cms-reviews-panel';
  panel.className = 'cms-panel';
  panel.innerHTML = `
    <div class="cms-panel__header">
      <h2 class="cms-panel__title">Reviews</h2>
      <button class="cms-panel__close" id="cms-reviews-close">✕</button>
    </div>
    <div class="cms-panel__body">
      <div class="cms-form-field">
        <label>Select Product</label>
        <select id="rv-product-select"><option value="">Loading…</option></select>
      </div>
      <div id="cms-reviews-content" style="margin-top:1rem;"></div>
    </div>
  `;
  document.body.appendChild(panel);
  document.getElementById('cms-reviews-close').onclick = () => panel.remove();

  // Populate product select
  const sel = document.getElementById('rv-product-select');
  const snap = await getDocs(collection(db, 'products'));
  sel.innerHTML = '<option value="">— Select a product —</option>';
  snap.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id; opt.textContent = d.data().name || d.id;
    sel.appendChild(opt);
  });

  sel.onchange = () => { if (sel.value) loadProductReviews(sel.value); };
}

async function loadProductReviews(productId) {
  const area = document.getElementById('cms-reviews-content');
  area.innerHTML = '<p style="color:#888;font-size:.85rem;">Loading…</p>';
  const snap = await getDoc(doc(db, 'products', productId));
  const reviews = snap.data()?.reviews || [];
  renderReviewsEditor(productId, reviews, area);
}

function renderReviewsEditor(productId, reviews, area) {
  area.innerHTML = `
    <button class="cms-panel__add-btn" id="rv-add-btn">+ Add Review</button>
    <div id="rv-list">${reviews.length === 0 ? '<p style="color:#aaa;font-size:.82rem;margin:.5rem 0;">No reviews yet.</p>' : ''}</div>
    <button class="cms-btn cms-btn--primary" id="rv-save-btn" style="margin-top:1rem;width:100%;">Save Reviews</button>
  `;
  reviews.forEach((r, i) => appendReviewRow(i, r));
  document.getElementById('rv-add-btn').onclick = () => appendReviewRow(Date.now());
  document.getElementById('rv-save-btn').onclick = async () => {
    const btn = document.getElementById('rv-save-btn');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await setDoc(doc(db, 'products', productId), { reviews: collectReviews() }, { merge: true });
      showNotification('✓ Reviews saved!', 'success');
    } catch (e) {
      showNotification('✗ ' + e.message, 'error');
    } finally { btn.disabled = false; btn.textContent = 'Save Reviews'; }
  };
}

// ── Login Modal ────────────────────────────────────────────────────
function showLoginModal() {
  if (document.getElementById('cms-login-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'cms-login-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
  modal.innerHTML = `
    <div style="background:#fff;padding:2.5rem;border-radius:16px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;margin:0 0 1.5rem;color:#111;text-align:center;">Admin Login</h2>
      <p id="cms-login-err" style="color:#c0392b;font-size:.8rem;margin-bottom:1rem;display:none;background:#fef0ee;border-radius:8px;padding:.5rem .8rem;"></p>
      <input type="email" id="cms-email" placeholder="Admin email" style="width:100%;padding:.8rem 1rem;margin-bottom:.75rem;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;box-sizing:border-box;" />
      <input type="password" id="cms-pass" placeholder="Password" style="width:100%;padding:.8rem 1rem;margin-bottom:1.25rem;border:1.5px solid #ddd;border-radius:10px;font-size:.9rem;box-sizing:border-box;" />
      <button id="cms-login-btn" style="width:100%;background:#111;color:#fff;padding:.9rem;border:none;border-radius:9999px;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;">Log In</button>
      <button id="cms-login-cancel" style="width:100%;background:none;border:none;color:#888;padding:.8rem;margin-top:.5rem;cursor:pointer;font-size:.82rem;">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  const errEl = modal.querySelector('#cms-login-err');
  document.getElementById('cms-login-btn').onclick = async () => {
    errEl.style.display = 'none';
    const btn = document.getElementById('cms-login-btn');
    btn.textContent = 'Logging in…'; btn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth,
        document.getElementById('cms-email').value.trim(),
        document.getElementById('cms-pass').value
      );
      modal.remove();
      // onAuthStateChanged will fire enableAdminMode()
    } catch (e) {
      errEl.textContent = 'Login failed. Check your email and password.';
      errEl.style.display = 'block';
      btn.textContent = 'Log In'; btn.disabled = false;
    }
  };
  document.getElementById('cms-login-cancel').onclick = () => { modal.remove(); window.location.hash = ''; };
  document.getElementById('cms-pass').onkeydown = e => { if (e.key === 'Enter') document.getElementById('cms-login-btn').click(); };
}

// ── Notification Toast ─────────────────────────────────────────────
function showNotification(msg, type = 'success') {
  const n = document.createElement('div');
  n.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${type==='success'?'#111':'#c0392b'};color:#fff;padding:.75rem 1.5rem;border-radius:9999px;font-size:.82rem;font-weight:600;letter-spacing:.05em;z-index:999999;animation:fadeInUp .3s ease;`;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

// ── CSS for Admin UI ───────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }

body.cms-admin [data-cms-key]:not(img) { cursor:text; }
body.cms-admin [data-cms-social] { position:relative; }

/* Admin Bar */
#cms-admin-bar {
  position:fixed; bottom:0; left:0; right:0; z-index:99999;
  background:#111; color:#fff; display:flex; align-items:center; justify-content:space-between;
  padding:.75rem 1.5rem; gap:1rem; box-shadow:0 -4px 20px rgba(0,0,0,.3);
  font-family:Inter,sans-serif;
}
.cms-bar__left { display:flex; align-items:center; gap:.6rem; flex-shrink:0; }
.cms-bar__dot  { width:8px; height:8px; border-radius:50%; background:#c9a84c; animation:pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
.cms-bar__label { font-size:.78rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#c9a84c; }
.cms-bar__center { display:flex; align-items:center; gap:.5rem; }
.cms-bar__right  { display:flex; align-items:center; gap:.5rem; flex-shrink:0; }
.cms-bar__btn {
  background:rgba(255,255,255,.1); color:#fff; border:1px solid rgba(255,255,255,.2);
  padding:.5rem 1rem; border-radius:9999px; font-size:.72rem; font-weight:600; letter-spacing:.08em;
  text-transform:uppercase; cursor:pointer; text-decoration:none; transition:background .2s;
}
.cms-bar__btn:hover { background:rgba(255,255,255,.2); }
.cms-bar__btn--save { background:#c9a84c; border-color:#c9a84c; color:#111; }
.cms-bar__btn--save:hover { background:#b8963e; }
.cms-bar__btn--exit { border-color:rgba(255,80,80,.5); color:#ff6b6b; }
.cms-bar__btn--exit:hover { background:rgba(255,80,80,.15); }

/* Products / Reviews Panel */
.cms-panel {
  position:fixed; top:0; right:0; bottom:60px; width:480px; max-width:100vw;
  background:#fff; z-index:99998; box-shadow:-8px 0 40px rgba(0,0,0,.15);
  display:flex; flex-direction:column; animation:slideInRight .35s cubic-bezier(.25,.46,.45,.94);
  font-family:Inter,sans-serif;
}
.cms-panel__header {
  display:flex; align-items:center; justify-content:space-between;
  padding:1.25rem 1.5rem; border-bottom:1px solid rgba(0,0,0,.08); flex-shrink:0;
}
.cms-panel__title { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:400; color:#111; margin:0; }
.cms-panel__close {
  background:none; border:none; font-size:1.1rem; cursor:pointer; color:#888; padding:.3rem;
  border-radius:50%; transition:background .2s;
}
.cms-panel__close:hover { background:#f0efea; }
.cms-panel__body { flex:1; overflow-y:auto; padding:1.25rem 1.5rem; }
.cms-panel__add-btn {
  display:block; width:100%; padding:.8rem 1rem; background:#f7f5f0; border:1.5px dashed #ccc;
  border-radius:10px; font-size:.8rem; font-weight:600; color:#555; cursor:pointer;
  text-align:center; margin-bottom:1rem; transition:border-color .2s, color .2s;
}
.cms-panel__add-btn:hover { border-color:#111; color:#111; }

/* Product card in panel */
.cms-product-card {
  display:flex; align-items:center; gap:.75rem; padding:.85rem 0;
  border-bottom:1px solid rgba(0,0,0,.06);
}
.cms-product-card__img { width:48px; height:48px; border-radius:8px; object-fit:cover; background:#f0efea; flex-shrink:0; }
.cms-product-card__info { flex:1; min-width:0; }
.cms-product-card__name { font-size:.88rem; font-weight:600; color:#111; }
.cms-product-card__meta { font-size:.75rem; color:#888; margin-top:.15rem; }
.cms-product-card__actions { display:flex; gap:.4rem; flex-shrink:0; }
.cms-product-card__edit, .cms-product-card__delete {
  padding:.35rem .75rem; border-radius:9999px; font-size:.72rem; font-weight:600; cursor:pointer; border:none;
}
.cms-product-card__edit   { background:#111; color:#fff; }
.cms-product-card__delete { background:#fef0ee; color:#c0392b; }

/* Modal */
.cms-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:999999;
  display:flex; align-items:center; justify-content:center; padding:1rem;
  font-family:Inter,sans-serif;
}
.cms-modal {
  background:#fff; border-radius:16px; width:100%; max-width:620px; max-height:90vh;
  display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.25);
}
.cms-modal__header {
  display:flex; align-items:center; justify-content:space-between;
  padding:1.25rem 1.5rem; border-bottom:1px solid rgba(0,0,0,.08); flex-shrink:0;
}
.cms-modal__title { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:400; color:#111; margin:0; }
.cms-modal__close {
  background:none; border:none; font-size:1.1rem; cursor:pointer; color:#888;
  padding:.3rem; border-radius:50%;
}
.cms-modal__body { flex:1; overflow-y:auto; padding:1.5rem; display:flex; flex-direction:column; gap:1rem; }
.cms-modal__footer {
  display:flex; gap:.75rem; justify-content:flex-end; padding:1.25rem 1.5rem;
  border-top:1px solid rgba(0,0,0,.08); flex-shrink:0;
}

/* Form elements */
.cms-form-row { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
.cms-form-field { display:flex; flex-direction:column; gap:.35rem; }
.cms-form-field label { font-size:.72rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#777; }
.cms-form-field input, .cms-form-field select, .cms-form-field textarea {
  border:1.5px solid rgba(0,0,0,.15); border-radius:10px; padding:.65rem .9rem;
  font-size:.88rem; font-family:inherit; color:#111; background:#fafaf8;
  transition:border-color .2s; outline:none;
}
.cms-form-field input:focus, .cms-form-field select:focus, .cms-form-field textarea:focus {
  border-color:#111; background:#fff;
}
.cms-form-field textarea { resize:vertical; }
.cms-form-section-title {
  font-size:.72rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:#aaa; padding:.5rem 0; border-bottom:1px solid rgba(0,0,0,.06); margin-bottom:.25rem;
}

/* Per-country prices grid */
.cms-prices-grid { display:grid; grid-template-columns:1fr 1fr; gap:.5rem; }
.cms-price-row { display:flex; flex-direction:column; gap:.3rem; }
.cms-price-row label { font-size:.75rem; color:#555; }
.cms-price-input-wrap { display:flex; align-items:center; border:1.5px solid rgba(0,0,0,.15); border-radius:8px; overflow:hidden; background:#fafaf8; }
.cms-price-symbol { padding:.5rem .6rem; font-size:.82rem; color:#888; background:#f0efea; border-right:1px solid rgba(0,0,0,.1); flex-shrink:0; }
.cms-price-input-wrap input { border:none; border-radius:0; padding:.5rem .7rem; background:transparent; width:100%; font-size:.85rem; outline:none; }

/* Reviews */
.cms-review-row { background:#f7f5f0; border-radius:10px; padding:.75rem; margin-bottom:.5rem; position:relative; }
.cms-review-row__delete {
  position:absolute; top:.5rem; right:.5rem; background:none; border:none;
  color:#aaa; cursor:pointer; font-size:.85rem; padding:.2rem;
}
.cms-review-row__delete:hover { color:#c0392b; }

/* Buttons */
.cms-btn { padding:.7rem 1.25rem; border-radius:9999px; font-size:.75rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; cursor:pointer; border:none; transition:background .2s; }
.cms-btn--primary { background:#111; color:#fff; }
.cms-btn--primary:hover { background:#333; }
.cms-btn--ghost { background:none; border:1.5px solid rgba(0,0,0,.15); color:#555; }
.cms-btn--ghost:hover { border-color:#111; color:#111; }
`;
document.head.appendChild(style);

// ── Start ──────────────────────────────────────────────────────────
boot();

/**
 * product-details.js
 * ------------------
 * Loads a product from Firestore using ?id= URL param.
 * Populates the entire product detail page dynamically.
 * Also loads related products from the same category.
 *
 * IMPORTANT: This script owns these DOM elements:
 *   #pdp-main-img, #pdp-thumbs, #pdp-name, #pdp-type, #pdp-subtitle,
 *   #pdp-price, #pdp-description, #pdp-reviews, #pdp-breadcrumb-name
 * cms.js is configured to NEVER touch these elements.
 */

import {
  doc, getDoc, collection, getDocs, query, where, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const SYMBOLS = { IN:'₹', US:'$', GB:'£', AE:'د.إ', SA:'﷼', AU:'A$', CA:'CA$', EU:'€', SG:'S$' };

let db;

/* ── Wait for Firebase then run ─────────────────────────────── */
function boot() {
  if (!window.firebaseDb) return setTimeout(boot, 60);
  db = window.firebaseDb;
  loadProduct();
  wireAccordion();
}

/* ── Load product from Firestore ────────────────────────────── */
async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  // DOM targets
  const mainImg        = document.getElementById('pdp-main-img');
  const thumbContainer = document.getElementById('pdp-thumbs');
  const breadcrumb     = document.getElementById('pdp-breadcrumb-name');
  const typeEl         = document.getElementById('pdp-type');
  const nameEl         = document.getElementById('pdp-name');
  const subtitleEl     = document.getElementById('pdp-subtitle');
  const reviewsEl      = document.getElementById('pdp-reviews');
  const priceEl        = document.getElementById('pdp-price');
  const descEl         = document.getElementById('pdp-description');

  let product = null;

  try {
    /* 1. Try loading by Firestore doc ID */
    if (id) {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) product = { id: snap.id, ...snap.data() };
    }

    /* 2. Fallback: first featured product */
    if (!product) {
      const q    = query(collection(db, 'products'), where('featured', '==', true), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) product = { id: snap.docs[0].id, ...snap.docs[0].data() };
    }

    /* 3. Nothing found */
    if (!product) {
      if (nameEl) nameEl.textContent = 'Product Not Found';
      return;
    }

    /* ── Compute price for current region ── */
    const regionCode = localStorage.getItem('alfaaz_region') || 'IN';
    const priceNum   = (product.prices && (product.prices[regionCode] || product.prices['IN'])) || 0;
    const sym        = SYMBOLS[regionCode] || '₹';
    const priceStr   = sym + priceNum.toLocaleString('en-IN');

    /* Attach price/id to product so cart works */
    product.priceNum = priceNum;
    product.price    = priceStr;

    /* ── Populate page ── */
    document.title = (product.name || 'Product') + ' — Aalfaz';
    if (breadcrumb) breadcrumb.textContent = product.name || '';
    if (typeEl)     typeEl.textContent = capitalize(product.category || 'Jewelry');
    if (nameEl)     nameEl.textContent = product.name || '';
    if (subtitleEl) subtitleEl.textContent = product.subtitle || '';
    if (priceEl)    priceEl.textContent = priceStr;
    if (descEl)     descEl.textContent = product.description || '';

    /* Reviews count */
    if (reviewsEl) {
      const rc = Array.isArray(product.reviews) ? product.reviews.length : 0;
      reviewsEl.textContent = '(' + rc + ')';
    }

    /* ── Gallery ── */
    const imgs = (product.images || []).filter(Boolean);
    if (mainImg) {
      mainImg.src = imgs[0] || 'logo.png';
      mainImg.alt = product.name || 'Product';
    }
    if (thumbContainer) {
      thumbContainer.innerHTML = '';
      imgs.forEach((src, idx) => {
        const div = document.createElement('div');
        div.className = 'pdp-gallery__thumb' + (idx === 0 ? ' is-active' : '');
        const img = document.createElement('img');
        img.src = src; img.alt = (product.name || '') + ' view ' + (idx + 1);
        div.appendChild(img);
        div.addEventListener('click', () => {
          if (mainImg) {
            mainImg.style.opacity = '0';
            setTimeout(() => { mainImg.src = src; mainImg.style.opacity = '1'; }, 200);
          }
          thumbContainer.querySelectorAll('.pdp-gallery__thumb').forEach(t => t.classList.remove('is-active'));
          div.classList.add('is-active');
        });
        thumbContainer.appendChild(div);
      });
    }

    /* ── Cart actions ── */
    wireCartActions(product);

    /* ── Related products ── */
    loadRelated(product.id, product.category);

  } catch (e) {
    console.error('[PDP] Error:', e);
    if (nameEl) nameEl.textContent = 'Error loading product';
  }
}

/* ── Wire quantity + Add to Cart + Buy Now ─────────────────── */
function wireCartActions(product) {
  let qty = 1;
  const qtyEl    = document.getElementById('pdp-qty-num');
  const minusBtn = document.getElementById('pdp-qty-minus');
  const plusBtn  = document.getElementById('pdp-qty-plus');
  const addBtn   = document.getElementById('pdp-add-to-cart');
  const buyBtn   = document.getElementById('pdp-buy-now');

  if (minusBtn) minusBtn.addEventListener('click', () => {
    if (qty > 1) { qty--; if (qtyEl) qtyEl.textContent = qty; }
  });
  if (plusBtn) plusBtn.addEventListener('click', () => {
    qty++; if (qtyEl) qtyEl.textContent = qty;
  });
  if (addBtn) addBtn.addEventListener('click', () => {
    if (window.AlfaazCart) window.AlfaazCart.add(product, qty);
  });
  if (buyBtn) buyBtn.addEventListener('click', () => {
    if (window.AlfaazCart) { window.AlfaazCart.add(product, qty); window.AlfaazCart.openCheckout(); }
  });
}

/* ── Load related products ──────────────────────────────────── */
async function loadRelated(currentId, category) {
  const grid = document.getElementById('pdp-related-grid');
  if (!grid) return;
  try {
    let q;
    if (category) q = query(collection(db, 'products'), where('category', '==', category), limit(5));
    else          q = query(collection(db, 'products'), limit(5));
    const snap     = await getDocs(q);
    const related  = [];
    snap.forEach(d => { if (d.id !== currentId) related.push({ id: d.id, ...d.data() }); });
    const toShow   = related.slice(0, 4);

    if (!toShow.length) {
      grid.innerHTML = '<p style="color:#888;font-size:.9rem">No related products found.</p>';
      return;
    }

    const regionCode = localStorage.getItem('alfaaz_region') || 'IN';
    const sym        = SYMBOLS[regionCode] || '₹';

    grid.innerHTML = toShow.map(p => {
      const img0     = (p.images && p.images[0]) || '';
      const img1     = (p.images && p.images[1]) || img0;
      const pNum     = (p.prices && (p.prices[regionCode] || p.prices['IN'])) || 0;
      const pStr     = sym + pNum.toLocaleString('en-IN');
      const badge    = p.badge ? `<span class="product-card__badge">${p.badge}</span>` : '';
      const type     = p.type || capitalize(p.category || '');
      const reviews  = Array.isArray(p.reviews) ? p.reviews : [];
      const rc       = p.reviewCount || reviews.length || 0;
      const avgStars = reviews.length
        ? Math.round(reviews.reduce((s,r) => s+(r.stars||5), 0) / reviews.length)
        : 5;
      const stars    = '★'.repeat(avgStars) + '☆'.repeat(5 - avgStars);

      return `<a href="product-details.html?id=${p.id}" class="product-card group">
        ${badge}
        <div class="product-card__base-img"><img src="${img0}" alt="${p.name||''}" loading="lazy" /></div>
        <div class="product-card__hover-img" style="background-image:url('${img1}')">
          <div class="product-card__hover-gradient"></div>
        </div>
        <div class="product-card__topbar">
          <h2 class="product-card__type">${type}</h2>
        </div>
        <div class="product-card__bottom-info">
          <div class="product-card__stars"><span>${stars}</span><span class="product-card__reviews">(${rc})</span></div>
          <div class="product-card__meta">
            <div>
              <h3 class="product-card__title">${p.name||''}</h3>
              <p class="product-card__subtitle">${p.subtitle||''}</p>
            </div>
            <span class="product-card__price">${pStr}</span>
          </div>
        </div>
        <div class="product-card__hover-cta"><button class="product-card__cta-btn">VIEW PIECE</button></div>
      </a>`;
    }).join('');
  } catch (e) {
    console.error('[PDP] Related products error:', e);
  }
}

/* ── Accordion ──────────────────────────────────────────────── */
function wireAccordion() {
  document.querySelectorAll('.pdp-details__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.getAttribute('data-target'));
      const isOpen = btn.classList.contains('is-open');
      btn.classList.toggle('is-open', !isOpen);
      if (target) target.classList.toggle('is-open', !isOpen);
    });
  });
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

boot();

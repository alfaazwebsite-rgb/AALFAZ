/**
 * product-details.js
 * ------------------
 * Loads a product from Firestore using the ?id= URL param.
 * Populates the entire product detail page dynamically.
 * Loads ALL related products from the same category (no artificial cap).
 * Shows a "Shop All [Category]" CTA after the related grid.
 */

import {
  doc, getDoc, collection, getDocs, query, where, limit, orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const SYMBOLS = { IN:'₹', US:'$', GB:'£', AE:'د.إ', SA:'﷼', AU:'A$', CA:'CA$', EU:'€', SG:'S$' };

let db;

/* ── Wait for Firebase then run ─────────────────────────────── */
function boot() {
  if (!window.firebaseDb) return setTimeout(boot, 60);
  db = window.firebaseDb;
  loadProduct();
}

/* ── Load product from Firestore ────────────────────────────── */
async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  /* DOM targets */
  const mainImg        = document.getElementById('pdp-main-img');
  const thumbContainer = document.getElementById('pdp-thumbs');
  const breadcrumb     = document.getElementById('pdp-breadcrumb-name');
  const typeEl         = document.getElementById('pdp-type');
  const nameEl         = document.getElementById('pdp-name');
  const subtitleEl     = document.getElementById('pdp-subtitle');
  const reviewsEl      = document.getElementById('pdp-reviews');
  const starsEl        = document.getElementById('pdp-stars');
  const priceEl        = document.getElementById('pdp-price');
  const descEl         = document.getElementById('pdp-description');

  let product = null;

  try {
    /* 1. Load by Firestore doc ID */
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

    if (!product) {
      if (nameEl) nameEl.textContent = 'Product Not Found';
      return;
    }

    /* ── Price for current region ─────────────────────────── */
    const regionCode = localStorage.getItem('alfaaz_region') || 'IN';
    const priceNum   = (product.prices && (product.prices[regionCode] || product.prices['IN'])) || 0;
    const sym        = SYMBOLS[regionCode] || '₹';
    const priceStr   = sym + priceNum.toLocaleString('en-IN');
    product.priceNum = priceNum;
    product.price    = priceStr;

    /* ── Populate page ────────────────────────────────────── */
    document.title = (product.name || 'Product') + ' — Aalfaz';
    if (breadcrumb) breadcrumb.textContent = product.name || '';

    /* Category label — always use category field, properly capitalised */
    const catLabel = capitalize(product.category || 'Jewelry');
    if (typeEl) typeEl.textContent = catLabel;

    if (nameEl)     nameEl.textContent     = product.name || '';
    if (subtitleEl) subtitleEl.textContent = product.subtitle || '';
    if (priceEl)    priceEl.textContent    = priceStr;
    if (descEl)     descEl.textContent     = product.description || '';

    /* Stars + review count
     * Priority: stored avgStars / reviewCount fields (set from admin panel)
     * Fallback: calculate from reviews array (legacy data) */
    const reviewArr = Array.isArray(product.reviews) ? product.reviews : [];
    const rc = product.reviewCount != null
      ? product.reviewCount
      : reviewArr.length;
    const avgS = product.avgStars != null
      ? Math.min(5, Math.max(1, Math.round(product.avgStars)))
      : (reviewArr.length
          ? Math.round(reviewArr.reduce((s, r) => s + (r.stars || 5), 0) / reviewArr.length)
          : 5);

    if (starsEl)   starsEl.textContent   = '★'.repeat(avgS) + '☆'.repeat(5 - avgS);
    if (reviewsEl) reviewsEl.textContent = '(' + rc.toLocaleString('en-IN') + ')';

    /* ── Gallery ──────────────────────────────────────────── */
    const imgs = (product.images || []).filter(Boolean);
    if (mainImg) {
      mainImg.src = imgs[0] || 'logo.png';
      mainImg.alt = product.name || '';
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
          thumbContainer.querySelectorAll('.pdp-gallery__thumb')
            .forEach(t => t.classList.remove('is-active'));
          div.classList.add('is-active');
        });
        thumbContainer.appendChild(div);
      });
    }

    /* ── Cart actions ─────────────────────────────────────── */
    wireCartActions(product);

    /* ── Accordion ────────────────────────────────────────── */
    wireAccordion();

    /* ── Related products ─────────────────────────────────── */
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
    if (window.AlfaazCart) {
      window.AlfaazCart.add(product, qty);
      window.AlfaazCart.openCheckout();
    }
  });
}

/* ── Load ALL related products from same category ──────────── */
async function loadRelated(currentId, category) {
  const grid      = document.getElementById('pdp-related-grid');
  const shopWrap  = document.getElementById('pdp-shop-category-wrap');
  const shopBtn   = document.getElementById('pdp-shop-category-btn');
  const shopLabel = document.getElementById('pdp-shop-category-label');
  if (!grid) return;

  const catLabel = capitalize(category || '');

  /* Always set up the Shop button (even if no related products exist yet) */
  if (shopWrap && shopBtn && category) {
    shopBtn.href = 'shop.html?cat=' + encodeURIComponent(category);
    if (shopLabel) shopLabel.textContent = catLabel;
    shopWrap.style.display = '';
  }

  try {
    /* Fetch ALL products in this category (up to 20 to be safe) */
    let products = [];
    if (category) {
      const q    = query(collection(db, 'products'), where('category', '==', category), limit(20));
      const snap = await getDocs(q);
      snap.forEach(d => {
        if (d.id !== currentId) products.push({ id: d.id, ...d.data() });
      });
    }

    /* Fallback: if no category or 0 results, grab any products */
    if (!products.length) {
      const q    = query(collection(db, 'products'), limit(8));
      const snap = await getDocs(q);
      snap.forEach(d => {
        if (d.id !== currentId) products.push({ id: d.id, ...d.data() });
      });
    }

    if (!products.length) {
      grid.innerHTML = '<p style="color:#888;font-size:.9rem">More pieces coming soon.</p>';
      return;
    }

    const regionCode = localStorage.getItem('alfaaz_region') || 'IN';
    const sym        = SYMBOLS[regionCode] || '₹';

    grid.innerHTML = products.map(p => buildRelatedCard(p, regionCode, sym)).join('');

  } catch (e) {
    console.error('[PDP] Related products error:', e);
  }
}

/* ── Build a related product card ──────────────────────────── */
function buildRelatedCard(p, regionCode, sym) {
  const img0    = (p.images && p.images[0]) || '';
  const img1    = (p.images && p.images[1]) || img0;
  const pNum    = (p.prices && (p.prices[regionCode] || p.prices['IN'])) || 0;
  const pStr    = sym + pNum.toLocaleString('en-IN');
  const badge   = p.badge ? `<span class="product-card__badge">${p.badge}</span>` : '';

  /* Category label — always use category field */
  const catDisplay = capitalize(p.category || '');

  /* Stars — prefer stored avgStars, fallback to reviews array */
  const reviewArr = Array.isArray(p.reviews) ? p.reviews : [];
  const rc  = p.reviewCount != null ? p.reviewCount : reviewArr.length;
  const avg = p.avgStars    != null
    ? Math.min(5, Math.max(1, Math.round(p.avgStars)))
    : (reviewArr.length
        ? Math.round(reviewArr.reduce((s, r) => s + (r.stars || 5), 0) / reviewArr.length)
        : 5);
  const stars = '★'.repeat(avg) + '☆'.repeat(5 - avg);

  return `<a href="product-details.html?id=${p.id}" class="product-card group">
    ${badge}
    <div class="product-card__base-img"><img src="${img0}" alt="${p.name || ''}" loading="lazy" /></div>
    <div class="product-card__hover-img" style="background-image:url('${img1}')">
      <div class="product-card__hover-gradient"></div>
    </div>
    <div class="product-card__topbar">
      <h2 class="product-card__type">${catDisplay}</h2>
    </div>
    <div class="product-card__bottom-info">
      <div class="product-card__stars">
        <span>${stars}</span>
        <span class="product-card__reviews">(${rc.toLocaleString('en-IN')})</span>
      </div>
      <div class="product-card__meta">
        <div>
          <h3 class="product-card__title">${p.name || ''}</h3>
          <p class="product-card__subtitle">${p.subtitle || ''}</p>
        </div>
        <span class="product-card__price">${pStr}</span>
      </div>
    </div>
    <div class="product-card__hover-cta">
      <button class="product-card__cta-btn">VIEW PIECE</button>
    </div>
  </a>`;
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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

boot();

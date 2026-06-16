/**
 * shop.js — Category tabs, product rendering, Firestore-backed
 * • Loads products from /products collection in Firestore
 * • Falls back to hardcoded data if Firestore unavailable
 * • Reads per-country prices from region.js via window.AalfazRegion
 * • Empty categories show "Coming Soon" — auto-clears when products added
 */
(function () {
  'use strict';

  /* ── Hardcoded fallback products (used if Firestore fails) ── */
  var FALLBACK = {
    featured: [
      { id:'ring-solitaire', name:'SOLITAIRE RING', category:'rings', type:'ring', subtitle:'Crafted in 18K gold', prices:{IN:45000}, badge:'new', reviews:[{stars:5}], reviewCount:41, images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842384/file_00000000e4b4722f8e2c578c5734a676_jadeog.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_0000000091d4722f99050295d4df3d55_rfvxmr.png'] },
      { id:'bangles-set', name:'THE BANGLE SET', category:'featured', type:'bangles', subtitle:'Set of three', prices:{IN:125000}, badge:'new', reviewCount:41, images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_000000005dc8722f80fdcd06c66d08a0_qmpmmj.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842389/file_00000000e0f8722f8134cab7a06e7b14_dokbto.png'] },
      { id:'pendant-pearl', name:'PEARL PENDANT', category:'pendants', type:'pendant', subtitle:'Limited edition piece', prices:{IN:32000}, badge:'limited edition', reviewCount:277, images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000008d20722f930db39bd306a08c_djuj0y.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000001534722f8c47bcee05a10c49_qyvafp.png'] },
      { id:'chain-cuban', name:'CUBAN CHAIN', category:'featured', type:'chain', subtitle:'22K gold finish', prices:{IN:58000}, badge:'new', reviewCount:89, images:['https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842387/file_00000000bf88722fab83a9a5152dbd3b_osqjva.png','https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842381/file_000000003d14722fabc2369201f40f39_pc4riq.png'] },
      { id:'earring-drop', name:'DROP EARRINGS', category:'earrings', type:'earring', subtitle:'Diamond studded', prices:{IN:28000}, badge:'new', reviewCount:204, images:['https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80'] },
      { id:'bracelet-tennis', name:'TENNIS BRACELET', category:'bracelets', type:'bracelet', subtitle:'Lab-grown diamonds', prices:{IN:75000}, badge:'limited edition', reviewCount:1042, images:['https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80'] }
    ],
    earrings: [
      { id:'earring-drop', name:'DROP EARRINGS', category:'earrings', type:'earring', subtitle:'Diamond studded', prices:{IN:28000}, badge:'new', reviewCount:204, images:['https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80'] },
      { id:'earring-hoop', name:'HOOP EARRINGS', category:'earrings', type:'earring', subtitle:'Gold plated', prices:{IN:18500}, badge:'new', reviewCount:132, images:['https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80'] },
      { id:'earring-stud', name:'STUD EARRINGS', category:'earrings', type:'earring', subtitle:'Pearl accent', prices:{IN:12000}, badge:'', reviewCount:87, images:['https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80'] }
    ],
    pendants: [
      { id:'pendant-pearl', name:'PEARL PENDANT', category:'pendants', type:'pendant', subtitle:'Limited edition', prices:{IN:32000}, badge:'limited edition', reviewCount:277, images:['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1515562141589-67f0d999e5f6?auto=format&fit=crop&w=800&q=80'] },
      { id:'pendant-diamond', name:'DIAMOND PENDANT', category:'pendants', type:'pendant', subtitle:'Solitaire cut', prices:{IN:68000}, badge:'new', reviewCount:92, images:['https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80'] }
    ],
    rings:      [],
    bracelets:  [],
    anklets:    [],
    accessories:[]
  };

  /* ── DOM refs ──────────────────────────────────────────────── */
  var grid     = document.getElementById('shop-grid');
  var coming   = document.getElementById('shop-coming-soon');
  var countEl  = document.getElementById('shop-count');
  var tabsWrap = document.getElementById('shop-tabs');
  if (!grid || !tabsWrap) return;

  var tabs       = tabsWrap.querySelectorAll('.shop__tab');
  var allProducts = {}; // populated from Firestore or fallback
  var currentCat  = 'featured';

  /* ── Currency helper ───────────────────────────────────────── */
  function formatPrice(product) {
    var region = window.AalfazRegion || { country:'IN', symbol:'₹', rate:1 };
    var cc     = region.country || 'IN';
    var prices = product.prices || {};

    // Use country-specific price if set, else convert INR
    var raw;
    if (prices[cc] != null) {
      raw = prices[cc];
    } else {
      var inr = prices['IN'] || 0;
      raw     = inr * (region.rate || 1);
    }

    var sym = region.symbol || '₹';
    if (cc === 'IN') {
      return sym + raw.toLocaleString('en-IN');
    }
    return sym + raw.toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
  }

  /* ── Build card HTML ───────────────────────────────────────── */
  function buildCard(p) {
    var id       = p.id || (p.name || '').toLowerCase().replace(/\s+/g,'-');
    var href     = 'product-details.html?id=' + id;
    var img0     = (p.images || [])[0] || '';
    var img1     = (p.images || [])[1] || img0;
    var badge    = p.badge ? '<span class="product-card__badge">' + p.badge + '</span>' : '';
    var reviews  = p.reviews || [];
    var rc       = p.reviewCount || reviews.length || 0;
    var avgStars = reviews.length
      ? Math.round(reviews.reduce(function(s,r){ return s+(r.stars||5); }, 0) / reviews.length)
      : 5;
    var stars    = '★'.repeat(avgStars) + '☆'.repeat(5 - avgStars);
    var priceStr = formatPrice(p);
    var type     = p.type || (p.category || '').replace(/s$/,'');

    return (
      '<a href="' + href + '" class="product-card group">' +
        '<div class="product-card__base-img">' +
          '<img src="' + img0 + '" alt="' + p.name + '" loading="lazy" />' +
        '</div>' +
        '<div class="product-card__hover-img" style="background-image:url(\'' + img1 + '\');">' +
          '<div class="product-card__hover-gradient"></div>' +
        '</div>' +
        '<div class="product-card__topbar">' +
          '<h2 class="product-card__type">' + type + '</h2>' +
          badge +
        '</div>' +
        '<div class="product-card__bottom-info">' +
          '<div class="product-card__stars">' +
            '<span>' + stars + '</span>' +
            '<span class="product-card__reviews">(' + rc.toLocaleString('en-IN') + ')</span>' +
          '</div>' +
          '<div class="product-card__meta">' +
            '<div>' +
              '<h3 class="product-card__title">' + p.name + '</h3>' +
              '<p class="product-card__subtitle">' + (p.subtitle||'') + '</p>' +
            '</div>' +
            '<span class="product-card__price">' + priceStr + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="product-card__hover-cta">' +
          '<button class="product-card__cta-btn">BUY ' + p.name + ' — ' + priceStr + '</button>' +
        '</div>' +
      '</a>'
    );
  }

  /* ── Render category ───────────────────────────────────────── */
  function renderCategory(key) {
    currentCat = key;
    var items  = allProducts[key] || [];

    if (items.length === 0) {
      grid.style.display   = 'none';
      coming.style.display = 'flex';
      if (countEl) countEl.textContent = '0 products';
      return;
    }

    coming.style.display = 'none';
    grid.style.display   = '';

    var html = '';
    for (var i = 0; i < items.length; i++) html += buildCard(items[i]);
    grid.innerHTML = html;
    if (countEl) countEl.textContent = items.length + ' product' + (items.length !== 1 ? 's' : '');
  }

  /* ── Tab clicks ────────────────────────────────────────────── */
  tabsWrap.addEventListener('click', function (e) {
    var btn = e.target.closest('.shop__tab');
    if (!btn) return;
    tabs.forEach(function(t){ t.classList.remove('shop__tab--active'); });
    btn.classList.add('shop__tab--active');
    renderCategory(btn.getAttribute('data-category'));
  });

  /* ── Load from Firestore ───────────────────────────────────── */
  function loadFromFirestore() {
    function waitForFirestore(tries) {
      tries = tries || 0;
      if (!window.firebaseDb) {
        if (tries < 20) setTimeout(function(){ waitForFirestore(tries+1); }, 250);
        else useFallback();
        return;
      }
      // Dynamically import Firestore functions
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
        .then(function(fb) {
          return fb.getDocs(fb.collection(window.firebaseDb, 'products'));
        })
        .then(function(snap) {
          if (snap.empty) { useFallback(); return; }
          // Build allProducts map by category
          var map = { featured:[], earrings:[], pendants:[], rings:[], bracelets:[], anklets:[], accessories:[] };
          snap.forEach(function(d) {
            var p = Object.assign({ id: d.id }, d.data());
            if (!p.name) return;
            // Add to its category
            var cat = (p.category || 'featured').toLowerCase();
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
            // Also add to featured if it's the featured category or has a 'featured' flag
            if (cat !== 'featured' && p.featured) map.featured.push(p);
          });
          // If featured is empty, populate from first items of other cats
          if (map.featured.length === 0) {
            var all = [];
            Object.keys(map).forEach(function(k) { if(k!=='featured') all = all.concat(map[k]); });
            map.featured = all.slice(0,6);
          }
          allProducts = map;
          renderCategory(currentCat);
        })
        .catch(function(e) {
          console.warn('[Shop] Firestore load failed:', e.message);
          useFallback();
        });
    }
    waitForFirestore();
  }

  function useFallback() {
    allProducts = FALLBACK;
    renderCategory(currentCat);
  }

  /* ── Initial load ──────────────────────────────────────────── */
  // Set initial category from URL param
  var urlCat   = new URLSearchParams(window.location.search).get('cat') || 'featured';
  var validCats= ['featured','earrings','pendants','rings','bracelets','anklets','accessories'];
  currentCat   = validCats.indexOf(urlCat) !== -1 ? urlCat : 'featured';

  tabs.forEach(function(t) {
    t.classList.toggle('shop__tab--active', t.getAttribute('data-category') === currentCat);
  });

  // Show fallback immediately, then update from Firestore
  useFallback();
  loadFromFirestore();

  // Re-render if region changes (currency switch)
  window.addEventListener('aalfaz:regionChange', function() {
    renderCategory(currentCat);
  });

})();

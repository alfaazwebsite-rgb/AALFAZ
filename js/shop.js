/**
 * shop.js — Category tabs, product rendering, count display
 */
(function () {
  'use strict';

  /* ── Product Data ─────────────────────────────────────────── */
  var products = {
    featured: [
      { name: 'SOLITAIRE RING', type: 'ring', subtitle: 'Crafted in 18K gold', price: '₹45,000', badge: 'new', reviews: '(41)', image: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842384/file_00000000e4b4722f8e2c578c5734a676_jadeog.png', hover: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_0000000091d4722f99050295d4df3d55_rfvxmr.png' },
      { name: 'THE BANGLE SET', type: 'bangles', subtitle: 'Set of three', price: '₹1,25,000', badge: 'new', reviews: '(41)', image: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842386/file_000000005dc8722f80fdcd06c66d08a0_qmpmmj.png', hover: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842389/file_00000000e0f8722f8134cab7a06e7b14_dokbto.png' },
      { name: 'PEARL PENDANT', type: 'pendant', subtitle: 'Limited edition piece', price: '₹32,000', badge: 'limited edition', reviews: '(16,277)', image: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000008d20722f930db39bd306a08c_djuj0y.png', hover: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842383/file_000000001534722f8c47bcee05a10c49_qyvafp.png' },
      { name: 'CUBAN CHAIN', type: 'chain', subtitle: '22K gold finish', price: '₹58,000', badge: 'new', reviews: '(89)', image: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842387/file_00000000bf88722fab83a9a5152dbd3b_osqjva.png', hover: 'https://res.cloudinary.com/dwchxvpln/image/upload/q_auto/f_auto/v1778842381/file_000000003d14722fabc2369201f40f39_pc4riq.png' },
      { name: 'DROP EARRINGS', type: 'earring', subtitle: 'Diamond studded', price: '₹28,000', badge: 'new', reviews: '(204)', image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80' },
      { name: 'TENNIS BRACELET', type: 'bracelet', subtitle: 'Lab-grown diamonds', price: '₹75,000', badge: 'limited edition', reviews: '(1,042)', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80' }
    ],
    earrings: [
      { name: 'DROP EARRINGS', type: 'earring', subtitle: 'Diamond studded', price: '₹28,000', badge: 'new', reviews: '(204)', image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80' },
      { name: 'HOOP EARRINGS', type: 'earring', subtitle: 'Gold plated', price: '₹18,500', badge: 'new', reviews: '(132)', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80' },
      { name: 'STUD EARRINGS', type: 'earring', subtitle: 'Pearl accent', price: '₹12,000', badge: '', reviews: '(87)', image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHANDELIER EARRINGS', type: 'earring', subtitle: 'Crystal finish', price: '₹42,000', badge: 'limited edition', reviews: '(56)', image: 'https://images.unsplash.com/photo-1515562141589-67f0d999e5f6?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80' },
      { name: 'HUGGIE EARRINGS', type: 'earring', subtitle: '18K gold', price: '₹22,000', badge: 'new', reviews: '(315)', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80' },
      { name: 'JHUMKA EARRINGS', type: 'earring', subtitle: 'Traditional design', price: '₹35,000', badge: '', reviews: '(178)', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80' }
    ],
    pendants: [
      { name: 'PEARL PENDANT', type: 'pendant', subtitle: 'Limited edition', price: '₹32,000', badge: 'limited edition', reviews: '(16,277)', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1515562141589-67f0d999e5f6?auto=format&fit=crop&w=800&q=80' },
      { name: 'DIAMOND PENDANT', type: 'pendant', subtitle: 'Solitaire cut', price: '₹68,000', badge: 'new', reviews: '(92)', image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80' },
      { name: 'HEART PENDANT', type: 'pendant', subtitle: 'Rose gold', price: '₹24,000', badge: 'new', reviews: '(445)', image: 'https://images.unsplash.com/photo-1576022162028-5e3c14e40b58?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1599459183200-59c3fd3f2da1?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHARM PENDANT', type: 'pendant', subtitle: 'Sterling silver', price: '₹15,500', badge: '', reviews: '(203)', image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1596704017254-9b121068fb21?auto=format&fit=crop&w=800&q=80' },
      { name: 'LOCKET PENDANT', type: 'pendant', subtitle: 'Vintage inspired', price: '₹28,500', badge: 'limited edition', reviews: '(67)', image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb21?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHAIN PENDANT', type: 'pendant', subtitle: 'Minimalist design', price: '₹19,000', badge: 'new', reviews: '(156)', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80', hover: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80' }
    ],
    anklets: [],
    rings: [],
    bracelets: [],
    accessories: []
  };

  /* ── DOM refs ──────────────────────────────────────────────── */
  var grid       = document.getElementById('shop-grid');
  var coming     = document.getElementById('shop-coming-soon');
  var countEl    = document.getElementById('shop-count');
  var tabsWrap   = document.getElementById('shop-tabs');
  if (!grid || !tabsWrap) return;

  var tabs = tabsWrap.querySelectorAll('.shop__tab');

  /* ── Render helpers ───────────────────────────────────────── */
  function buildCard(p) {
    var badgeHtml = p.badge
      ? '<span class="product-card__badge">' + p.badge + '</span>'
      : '';

    var productIds = {
      'SOLITAIRE RING': 'ring-solitaire',
      'THE BANGLE SET': 'bangles-set',
      'PEARL PENDANT': 'pendant-pearl',
      'CUBAN CHAIN': 'chain-cuban',
      'DROP EARRINGS': 'earring-drop',
      'TENNIS BRACELET': 'bracelet-tennis'
    };
    var pid = productIds[p.name] || '';
    var href = pid ? 'product-details.html?id=' + pid : '#';

    return (
      '<a href="' + href + '" class="product-card group">' +
        '<div class="product-card__base-img">' +
          '<img src="' + p.image + '" alt="' + p.name + '" />' +
        '</div>' +
        '<div class="product-card__hover-img" style="background-image:url(\'' + p.hover + '\');">' +
          '<div class="product-card__hover-gradient"></div>' +
        '</div>' +
        '<div class="product-card__topbar">' +
          '<h2 class="product-card__type">' + p.type + '</h2>' +
          badgeHtml +
        '</div>' +
        '<div class="product-card__bottom-info">' +
          '<div class="product-card__stars">' +
            '<span>★★★★★</span>' +
            '<span class="product-card__reviews">' + p.reviews + '</span>' +
          '</div>' +
          '<div class="product-card__meta">' +
            '<div>' +
              '<h3 class="product-card__title">' + p.name + '</h3>' +
              '<p class="product-card__subtitle">' + p.subtitle + '</p>' +
            '</div>' +
            '<span class="product-card__price">' + p.price + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="product-card__hover-cta">' +
          '<button class="product-card__cta-btn">BUY ' + p.name + ' — ' + p.price + '</button>' +
        '</div>' +
      '</a>'
    );
  }

  function renderCategory(key) {
    var items = products[key] || [];

    if (items.length === 0) {
      grid.style.display = 'none';
      coming.style.display = 'flex';
      countEl.textContent = '0 products';
      return;
    }

    coming.style.display = 'none';
    grid.style.display = '';

    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += buildCard(items[i]);
    }
    grid.innerHTML = html;
    countEl.textContent = items.length + ' product' + (items.length !== 1 ? 's' : '');
  }

  /* ── Tab clicks ───────────────────────────────────────────── */
  function setActiveTab(btn) {
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('shop__tab--active');
    }
    btn.classList.add('shop__tab--active');
  }

  tabsWrap.addEventListener('click', function (e) {
    var btn = e.target.closest('.shop__tab');
    if (!btn) return;
    setActiveTab(btn);
    renderCategory(btn.getAttribute('data-category'));
  });

  /* ── Initial render — check URL ?cat= param ──────────────── */
  var urlCat = new URLSearchParams(window.location.search).get('cat') || 'featured';
  var validCats = Object.keys(products);
  var startCat = validCats.indexOf(urlCat) !== -1 ? urlCat : 'featured';

  // Activate correct tab visually
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute('data-category') === startCat) {
      tabs[i].classList.add('shop__tab--active');
    } else {
      tabs[i].classList.remove('shop__tab--active');
    }
  }
  renderCategory(startCat);
})();

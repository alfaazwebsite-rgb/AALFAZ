/**
 * shop-dropdown.js — Rhode-style mega-menu on Shop hover (homepage only)
 * Data mirrors shop.js products. Hover-only interaction.
 */
(function () {
  'use strict';

  var shopLink = document.getElementById('shop-hover-trigger');
  var megaMenu = document.getElementById('mega-menu');
  var navbar   = document.getElementById('navbar');
  if (!shopLink || !megaMenu || !navbar) return;

  /* ── Product data (mirrors shop.js) ─────────────────────── */
  var products = {
    featured: [
      { name: 'SOLITAIRE RING', subtitle: 'Crafted in 18K gold', badge: 'new', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80' },
      { name: 'THE BANGLE SET', subtitle: 'Set of three', badge: 'new', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80' },
      { name: 'PEARL PENDANT', subtitle: 'Limited edition piece', badge: 'limited edition', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80' },
      { name: 'CUBAN CHAIN', subtitle: '22K gold finish', badge: 'new', image: 'https://images.unsplash.com/photo-1599459183200-59c3fd3f2da1?auto=format&fit=crop&w=800&q=80' },
      { name: 'DROP EARRINGS', subtitle: 'Diamond studded', badge: 'new', image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80' },
      { name: 'TENNIS BRACELET', subtitle: 'Lab-grown diamonds', badge: 'limited edition', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80' }
    ],
    earrings: [
      { name: 'DROP EARRINGS', subtitle: 'Diamond studded', badge: 'new', image: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80' },
      { name: 'HOOP EARRINGS', subtitle: 'Gold plated', badge: 'new', image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=800&q=80' },
      { name: 'STUD EARRINGS', subtitle: 'Pearl accent', badge: '', image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHANDELIER EARRINGS', subtitle: 'Crystal finish', badge: 'limited edition', image: 'https://images.unsplash.com/photo-1515562141589-67f0d999e5f6?auto=format&fit=crop&w=800&q=80' },
      { name: 'HUGGIE EARRINGS', subtitle: '18K gold', badge: 'new', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80' },
      { name: 'JHUMKA EARRINGS', subtitle: 'Traditional design', badge: '', image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80' }
    ],
    pendants: [
      { name: 'PEARL PENDANT', subtitle: 'Limited edition', badge: 'limited edition', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80' },
      { name: 'DIAMOND PENDANT', subtitle: 'Solitaire cut', badge: 'new', image: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=800&q=80' },
      { name: 'HEART PENDANT', subtitle: 'Rose gold', badge: 'new', image: 'https://images.unsplash.com/photo-1576022162028-5e3c14e40b58?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHARM PENDANT', subtitle: 'Sterling silver', badge: '', image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?auto=format&fit=crop&w=800&q=80' },
      { name: 'LOCKET PENDANT', subtitle: 'Vintage inspired', badge: 'limited edition', image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb21?auto=format&fit=crop&w=800&q=80' },
      { name: 'CHAIN PENDANT', subtitle: 'Minimalist design', badge: 'new', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80' }
    ],
    anklets: [],
    rings: [],
    bracelets: [],
    accessories: []
  };

  /* ── DOM refs ───────────────────────────────────────────── */
  var tabsWrap    = document.getElementById('mega-tabs');
  var cardsWrap   = document.getElementById('mega-cards');
  var comingSoon  = document.getElementById('mega-coming-soon');
  var ctaBtn      = document.getElementById('mega-cta');
  var arrowLeft   = document.getElementById('mega-arrow-left');
  var arrowRight  = document.getElementById('mega-arrow-right');
  var carouselBox = document.getElementById('mega-carousel');
  var tabs        = tabsWrap ? tabsWrap.querySelectorAll('.mega-menu__tab') : [];

  var activeCategory = 'featured';
  var scrollIndex = 0;

  /* ── Card rendering ─────────────────────────────────────── */
  function buildCard(p) {
    var badgeHtml = p.badge
      ? '<span class="mega-card__badge">' + p.badge + '</span>'
      : '';
    return (
      '<div class="mega-card">' +
        badgeHtml +
        '<div class="mega-card__img-wrap">' +
          '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" />' +
        '</div>' +
        '<h3 class="mega-card__name">' + p.name + '</h3>' +
        '<p class="mega-card__subtitle">' + p.subtitle + '</p>' +
      '</div>'
    );
  }

  function renderCategory(key) {
    activeCategory = key;
    scrollIndex = 0;
    var items = products[key] || [];

    // Update CTA text
    var label = key.charAt(0).toUpperCase() + key.slice(1);
    ctaBtn.textContent = 'SHOP ' + label.toUpperCase();
    ctaBtn.href = 'shop.html';

    if (items.length === 0) {
      carouselBox.style.display = 'none';
      comingSoon.style.display = 'flex';
      return;
    }

    comingSoon.style.display = 'none';
    carouselBox.style.display = '';

    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += buildCard(items[i]);
    }
    cardsWrap.innerHTML = html;
    cardsWrap.scrollLeft = 0;
    updateArrows();
  }

  /* ── Arrow navigation ───────────────────────────────────── */
  function getCardWidth() {
    var firstCard = cardsWrap.querySelector('.mega-card');
    if (!firstCard) return 250;
    var style = window.getComputedStyle(cardsWrap);
    var gap = parseFloat(style.gap) || 20;
    return firstCard.offsetWidth + gap;
  }

  function updateArrows() {
    if (!arrowLeft || !arrowRight) return;
    arrowLeft.style.opacity = cardsWrap.scrollLeft > 10 ? '1' : '0.3';
    arrowLeft.style.pointerEvents = cardsWrap.scrollLeft > 10 ? 'auto' : 'none';
    var maxScroll = cardsWrap.scrollWidth - cardsWrap.clientWidth;
    arrowRight.style.opacity = cardsWrap.scrollLeft < maxScroll - 10 ? '1' : '0.3';
    arrowRight.style.pointerEvents = cardsWrap.scrollLeft < maxScroll - 10 ? 'auto' : 'none';
  }

  if (arrowLeft) {
    arrowLeft.addEventListener('click', function (e) {
      e.stopPropagation();
      cardsWrap.scrollBy({ left: -getCardWidth(), behavior: 'smooth' });
      setTimeout(updateArrows, 350);
    });
  }

  if (arrowRight) {
    arrowRight.addEventListener('click', function (e) {
      e.stopPropagation();
      cardsWrap.scrollBy({ left: getCardWidth(), behavior: 'smooth' });
      setTimeout(updateArrows, 350);
    });
  }

  if (cardsWrap) {
    cardsWrap.addEventListener('scroll', function () {
      requestAnimationFrame(updateArrows);
    }, { passive: true });
  }

  /* ── Tab hover switching ────────────────────────────────── */
  function setActiveTab(btn) {
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('mega-menu__tab--active');
    }
    btn.classList.add('mega-menu__tab--active');
  }

  if (tabsWrap) {
    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('mouseenter', function () {
          setActiveTab(tab);
          renderCategory(tab.getAttribute('data-category'));
        });
      })(tabs[i]);
    }
  }

  /* ── Show / Hide mega-menu ──────────────────────────────── */
  var hideTimeout = null;

  function openMenu() {
    clearTimeout(hideTimeout);
    megaMenu.classList.add('is-open');
    navbar.classList.add('navbar--mega-open');
    if (!cardsWrap.hasChildNodes()) {
      renderCategory('featured');
    }
  }

  function closeMenu() {
    hideTimeout = setTimeout(function () {
      megaMenu.classList.remove('is-open');
      navbar.classList.remove('navbar--mega-open');
      // Reset to featured
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('mega-menu__tab--active');
      }
      if (tabs[0]) tabs[0].classList.add('mega-menu__tab--active');
      renderCategory('featured');
    }, 120);
  }

  // Hover on "Shop" link opens
  shopLink.addEventListener('mouseenter', openMenu);
  shopLink.addEventListener('mouseleave', closeMenu);

  // Hovering mega-menu keeps it open
  megaMenu.addEventListener('mouseenter', function () {
    clearTimeout(hideTimeout);
  });
  megaMenu.addEventListener('mouseleave', closeMenu);

  // Keep open when hovering between shop link and menu
  navbar.addEventListener('mouseleave', closeMenu);
  navbar.addEventListener('mouseenter', function () {
    if (megaMenu.classList.contains('is-open')) {
      clearTimeout(hideTimeout);
    }
  });

  // Initial render
  renderCategory('featured');
})();

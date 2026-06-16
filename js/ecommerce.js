/**
 * ecommerce.js — Alfaaz Cart & Checkout Logic
 * Works purely with localStorage for now.
 * Firebase integration will be wired in when credentials are available.
 */

(function () {
  'use strict';
  var BACKEND_URL = 'https://aalfaz-backend.netlify.app';

  /* ─── Cart State ────────────────────────────────────────────── */
  function getCart() {
    try { return JSON.parse(localStorage.getItem('alfaaz_cart')) || []; }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem('alfaaz_cart', JSON.stringify(cart));
    updateAllCartIcons();
    window.dispatchEvent(new CustomEvent('alfaaz:cartUpdated', { detail: { cart } }));
  }

  function addToCart(product, qty) {
    qty = qty || 1;
    var cart = getCart();
    var idx = cart.findIndex(function (i) { return i.id === product.id; });
    if (idx > -1) {
      cart[idx].quantity += qty;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        priceNum: product.priceNum,
        image: product.image,
        quantity: qty
      });
    }
    saveCart(cart);
    showToast('Added to cart — ' + product.name);
  }

  function removeFromCart(id) {
    var cart = getCart().filter(function (i) { return i.id !== id; });
    saveCart(cart);
  }

  function updateQty(id, qty) {
    var cart = getCart();
    var idx = cart.findIndex(function (i) { return i.id === id; });
    if (idx > -1) {
      if (qty < 1) { cart.splice(idx, 1); }
      else { cart[idx].quantity = qty; }
    }
    saveCart(cart);
  }

  function getCartTotal() {
    return getCart().reduce(function (sum, item) {
      return sum + (item.priceNum * item.quantity);
    }, 0);
  }

  function getCartCount() {
    return getCart().reduce(function (sum, item) { return sum + item.quantity; }, 0);
  }

  /* ─── Cart Icon Update ──────────────────────────────────────── */
  function updateAllCartIcons() {
    var count = getCartCount();
    var label = count > 0 ? 'Cart (' + count + ')' : 'Cart';

    // Text links like "Cart (0)"
    document.querySelectorAll('.cart-count-text').forEach(function (el) {
      el.textContent = label;
    });

    // Badge bubbles
    document.querySelectorAll('.cart-badge').forEach(function (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /* ─── Toast Notification ────────────────────────────────────── */
  function showToast(message) {
    var container = document.getElementById('alfaaz-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'alfaaz-toast-container';
      container.style.cssText = [
        'position:fixed',
        'bottom:2rem',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:9999',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'gap:0.5rem',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.style.cssText = [
      'background:#111111',
      'color:#ffffff',
      'font-family:\'Inter\',sans-serif',
      'font-size:0.78rem',
      'font-weight:500',
      'letter-spacing:0.04em',
      'padding:0.8rem 1.6rem',
      'border-radius:9999px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.18)',
      'opacity:0',
      'transform:translateY(12px)',
      'transition:opacity 0.3s ease,transform 0.3s ease',
      'white-space:nowrap'
    ].join(';');
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(function () { toast.remove(); }, 350);
    }, 2800);
  }

  /* ─── Checkout Modal ─────────────────────────────────────────── */
  var checkoutState = { method: null, details: {} };

  function openCheckout() {
    var cart = getCart();
    if (cart.length === 0) { showToast('Your cart is empty'); return; }
    var modal = document.getElementById('alfaaz-checkout-modal');
    if (!modal) { buildCheckoutModal(); modal = document.getElementById('alfaaz-checkout-modal'); }
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    showCheckoutStep(1);
    renderCheckoutSummary(cart);
  }

  function closeCheckout() {
    var modal = document.getElementById('alfaaz-checkout-modal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
    checkoutState = { method: null, details: {} };
  }

  function showCheckoutStep(step) {
    [1, 2, 3].forEach(function (n) {
      var el = document.getElementById('checkout-step-' + n);
      if (el) el.style.display = n === step ? 'block' : 'none';
    });
  }

  function renderCheckoutSummary(cart) {
    var el = document.getElementById('checkout-order-summary');
    if (!el) return;
    var total = getCartTotal();
    var html = cart.map(function (item) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:0.6rem 0;border-bottom:1px solid rgba(0,0,0,0.07)">' +
        '<div style="display:flex;align-items:center;gap:0.75rem">' +
        '<img src="' + item.image + '" alt="' + item.name + '" style="width:48px;height:48px;object-fit:cover;border-radius:0.5rem;background:#f7f7f7">' +
        '<div><div style="font-size:0.78rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase">' + item.name + '</div>' +
        '<div style="font-size:0.72rem;color:#888;margin-top:2px">Qty: ' + item.quantity + '</div></div>' +
        '</div>' +
        '<div style="font-size:0.82rem;font-weight:500;white-space:nowrap">₹' + (item.priceNum * item.quantity).toLocaleString('en-IN') + '</div>' +
        '</div>';
    }).join('');
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 0 0;font-weight:600;font-size:0.9rem">' +
      '<span>Total</span><span>₹' + total.toLocaleString('en-IN') + '</span></div>';
    el.innerHTML = html;
  }

  function buildCheckoutModal() {
    var overlay = document.createElement('div');
    overlay.id = 'alfaaz-checkout-modal';
    overlay.innerHTML = [
      '<div class="checkout-modal__backdrop" id="checkout-backdrop"></div>',
      '<div class="checkout-modal__panel">',

        /* Header */
        '<div class="checkout-modal__header">',
          '<span class="checkout-modal__title">Checkout</span>',
          '<button class="checkout-modal__close" id="checkout-close-btn" aria-label="Close">',
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
          '</button>',
        '</div>',

        /* Order Summary */
        '<div class="checkout-modal__summary" id="checkout-order-summary"></div>',

        /* Step 1 — Method */
        '<div id="checkout-step-1">',
          '<p class="checkout-modal__step-label">Select Payment Method</p>',
          '<div class="checkout-modal__methods" style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">',
            '<button class="checkout-method-btn" id="method-cod">',
              '<div class="checkout-method-btn__icon">',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
              '</div>',
              '<div>',
                '<div class="checkout-method-btn__title">Cash on Delivery</div>',
                '<div class="checkout-method-btn__sub">Pay when you receive your order</div>',
              '</div>',
            '</button>',
            '<button class="checkout-method-btn" id="method-razorpay">',
              '<div class="checkout-method-btn__icon">',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
              '</div>',
              '<div>',
                '<div class="checkout-method-btn__title">Cards / UPI (Razorpay)</div>',
                '<div class="checkout-method-btn__sub">Domestic Payments</div>',
              '</div>',
            '</button>',
            '<button class="checkout-method-btn" id="method-phonepe">',
              '<div class="checkout-method-btn__icon">',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
              '</div>',
              '<div>',
                '<div class="checkout-method-btn__title">PhonePe</div>',
                '<div class="checkout-method-btn__sub">Zero Fee UPI / Wallets</div>',
              '</div>',
            '</button>',
            '<button class="checkout-method-btn" id="method-stripe">',
              '<div class="checkout-method-btn__icon">',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
              '</div>',
              '<div>',
                '<div class="checkout-method-btn__title">Stripe (International)</div>',
                '<div class="checkout-method-btn__sub">Apple Pay / Google Pay / Cards</div>',
              '</div>',
            '</button>',
            '<button class="checkout-method-btn" id="method-paypal">',
              '<div class="checkout-method-btn__icon">',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V7a5 5 0 0 1 10 0v4"/><path d="M5.5 11h13a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18.5 22h-13A1.5 1.5 0 0 1 4 20.5v-8A1.5 1.5 0 0 1 5.5 11z"/></svg>',
              '</div>',
              '<div>',
                '<div class="checkout-method-btn__title">PayPal</div>',
                '<div class="checkout-method-btn__sub">USD / EUR Global Payments</div>',
              '</div>',
            '</button>',
          '</div>',
        '</div>',

        /* Step 2 — Details Form */
        '<div id="checkout-step-2" style="display:none">',
          '<p class="checkout-modal__step-label">Shipping Details</p>',
          '<form id="checkout-details-form" class="checkout-form">',
            '<div class="checkout-form__group">',
              '<label class="checkout-form__label">Full Name *</label>',
              '<input class="checkout-form__input" id="cust-name" type="text" required placeholder="Your full name" autocomplete="name">',
            '</div>',
            '<div class="checkout-form__group">',
              '<label class="checkout-form__label">Phone Number *</label>',
              '<input class="checkout-form__input" id="cust-phone" type="tel" required placeholder="+91 XXXXX XXXXX" autocomplete="tel">',
            '</div>',
            '<div class="checkout-form__group">',
              '<label class="checkout-form__label">Alternate Phone (Optional)</label>',
              '<input class="checkout-form__input" id="cust-alt-phone" type="tel" placeholder="+91 XXXXX XXXXX">',
            '</div>',
            '<div class="checkout-form__group">',
              '<label class="checkout-form__label">Full Delivery Address *</label>',
              '<textarea class="checkout-form__input checkout-form__textarea" id="cust-address" rows="3" required placeholder="House no., Street, City, State, PIN" autocomplete="street-address"></textarea>',
            '</div>',
            '<div class="checkout-form__actions">',
              '<button type="button" class="checkout-form__back" id="checkout-back-btn">← Back</button>',
              '<button type="submit" class="checkout-form__submit" id="checkout-submit-btn">Place Order</button>',
            '</div>',
          '</form>',
        '</div>',

        /* Step 3 — Success */
        '<div id="checkout-step-3" style="display:none;text-align:center;padding:2rem 0">',
          '<div class="checkout-success__icon" id="checkout-success-icon">',
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
          '</div>',
          '<h3 class="checkout-success__title">Order Placed!</h3>',
          '<p class="checkout-success__subtitle">Thank you for shopping with Alfaaz</p>',
          '<p class="checkout-success__order-id">Order ID: <strong id="success-order-id">—</strong></p>',
          '<button id="whatsapp-btn" class="checkout-success__whatsapp">',
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>',
            'Send Order on WhatsApp',
          '</button>',
          '<button class="checkout-success__continue" id="checkout-continue-btn">Continue Shopping</button>',
        '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(overlay);

    /* Inject checkout modal CSS */
    if (!document.getElementById('alfaaz-checkout-css')) {
      var style = document.createElement('style');
      style.id = 'alfaaz-checkout-css';
      style.textContent = [
        '#alfaaz-checkout-modal{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.35s ease}',
        '#alfaaz-checkout-modal.is-open{opacity:1;pointer-events:auto}',
        '@media(min-width:600px){#alfaaz-checkout-modal{align-items:center}}',
        '.checkout-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px)}',
        '.checkout-modal__panel{position:relative;z-index:1;background:#fff;width:100%;max-width:520px;border-radius:1.25rem 1.25rem 0 0;padding:0;overflow:hidden;max-height:92svh;overflow-y:auto;transform:translateY(30px);transition:transform 0.35s cubic-bezier(0.4,0,0.2,1)}',
        '@media(min-width:600px){.checkout-modal__panel{border-radius:1.25rem;transform:scale(0.96)}}',
        '#alfaaz-checkout-modal.is-open .checkout-modal__panel{transform:translateY(0) scale(1)}',
        '.checkout-modal__header{display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.75rem 1rem;border-bottom:1px solid rgba(0,0,0,0.08);position:sticky;top:0;background:#fff;z-index:2}',
        '.checkout-modal__title{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:1.4rem;font-weight:400;letter-spacing:0.02em;color:#111}',
        '.checkout-modal__close{background:none;border:none;cursor:pointer;color:#555;padding:4px;border-radius:50%;transition:background 0.2s ease;display:flex;align-items:center;justify-content:center}',
        '.checkout-modal__close:hover{background:rgba(0,0,0,0.06)}',
        '.checkout-modal__summary{padding:1.25rem 1.75rem;background:#f7f5f0;border-bottom:1px solid rgba(0,0,0,0.08)}',
        '.checkout-modal__step-label{font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888;padding:1.25rem 1.75rem 0.75rem;margin:0}',
        '.checkout-modal__methods{display:flex;flex-direction:column;gap:0.75rem;padding:0 1.75rem 1.5rem}',
        '.checkout-method-btn{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.25rem;border:1.5px solid rgba(0,0,0,0.12);border-radius:0.75rem;background:#fff;cursor:pointer;text-align:left;transition:border-color 0.2s ease,background 0.2s ease;width:100%;font-family:\'Inter\',sans-serif}',
        '.checkout-method-btn:hover{border-color:#111;background:#f7f5f0}',
        '.checkout-method-btn__icon{width:40px;height:40px;border-radius:0.5rem;background:#f7f5f0;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#555}',
        '.checkout-method-btn__title{font-size:0.85rem;font-weight:600;color:#111;letter-spacing:0.02em}',
        '.checkout-method-btn__sub{font-size:0.75rem;color:#888;margin-top:2px}',
        '.checkout-form{padding:0 1.75rem 1.5rem;display:flex;flex-direction:column;gap:1rem}',
        '.checkout-form__group{display:flex;flex-direction:column;gap:0.4rem}',
        '.checkout-form__label{font-size:0.72rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#555}',
        '.checkout-form__input{width:100%;padding:0.75rem 1rem;border:1.5px solid rgba(0,0,0,0.12);border-radius:0.5rem;font-family:\'Inter\',sans-serif;font-size:0.88rem;color:#111;background:#fff;outline:none;transition:border-color 0.2s ease}',
        '.checkout-form__input:focus{border-color:#111}',
        '.checkout-form__textarea{resize:vertical;min-height:80px}',
        '.checkout-form__actions{display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem}',
        '.checkout-form__back{background:none;border:none;font-family:\'Inter\',sans-serif;font-size:0.8rem;color:#888;cursor:pointer;text-decoration:underline;padding:0}',
        '.checkout-form__submit{background:#111;color:#fff;border:none;border-radius:9999px;padding:0.85rem 2.5rem;font-family:\'Inter\',sans-serif;font-size:0.78rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:background 0.25s ease,transform 0.15s ease}',
        '.checkout-form__submit:hover{background:#333;transform:translateY(-1px)}',
        '.checkout-form__submit:disabled{opacity:0.6;cursor:not-allowed;transform:none}',
        '.checkout-success__icon{width:72px;height:72px;border-radius:50%;background:#f7f5f0;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;color:#111}',
        '.checkout-success__title{font-family:\'Cormorant Garamond\',Georgia,serif;font-size:1.6rem;font-weight:400;color:#111;margin:0 0 0.5rem}',
        '.checkout-success__subtitle{font-size:0.85rem;color:#888;margin:0 0 0.75rem}',
        '.checkout-success__order-id{font-size:0.8rem;color:#555;margin:0 0 1.5rem}',
        '.checkout-success__whatsapp{display:flex;align-items:center;gap:0.5rem;justify-content:center;margin:0 auto 0.75rem;padding:0.85rem 2rem;background:#25D366;color:#fff;border:none;border-radius:9999px;font-family:\'Inter\',sans-serif;font-size:0.8rem;font-weight:600;letter-spacing:0.05em;cursor:pointer;transition:background 0.2s ease}',
        '.checkout-success__whatsapp:hover{background:#1ebe59}',
        '.checkout-success__continue{display:block;width:100%;margin-top:0;padding:0.75rem;background:none;border:1.5px solid rgba(0,0,0,0.12);border-radius:9999px;font-family:\'Inter\',sans-serif;font-size:0.78rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#555;cursor:pointer;transition:border-color 0.2s ease,color 0.2s ease}',
        '.checkout-success__continue:hover{border-color:#111;color:#111}'
      ].join('\n');
      document.head.appendChild(style);
    }

    /* Events */
    document.getElementById('checkout-backdrop').addEventListener('click', closeCheckout);
    document.getElementById('checkout-close-btn').addEventListener('click', closeCheckout);

    document.getElementById('method-cod').addEventListener('click', function () {
      checkoutState.method = 'COD';
      showCheckoutStep(2);
    });

    document.getElementById('method-razorpay').addEventListener('click', function () {
      checkoutState.method = 'RAZORPAY';
      showCheckoutStep(2);
    });

    document.getElementById('method-phonepe').addEventListener('click', function () {
      checkoutState.method = 'PHONEPE';
      showCheckoutStep(2);
    });

    document.getElementById('method-stripe').addEventListener('click', function () {
      checkoutState.method = 'STRIPE';
      showCheckoutStep(2);
    });

    document.getElementById('method-paypal').addEventListener('click', function () {
      checkoutState.method = 'PAYPAL';
      showCheckoutStep(2);
    });

    document.getElementById('checkout-back-btn').addEventListener('click', function () {
      showCheckoutStep(1);
    });

    document.getElementById('checkout-details-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('checkout-submit-btn');
      btn.textContent = 'Processing…';
      btn.disabled = true;

      checkoutState.details = {
        name: document.getElementById('cust-name').value.trim(),
        phone: document.getElementById('cust-phone').value.trim(),
        altPhone: document.getElementById('cust-alt-phone').value.trim(),
        address: document.getElementById('cust-address').value.trim()
      };

      if (checkoutState.method === 'COD') {
        processCOD(btn);
      } else if (checkoutState.method === 'RAZORPAY') {
        processOnlinePayment(btn);
      } else if (checkoutState.method === 'STRIPE') {
        processStripePayment(btn);
      } else if (checkoutState.method === 'PAYPAL') {
        processPayPalPayment(btn);
      } else if (checkoutState.method === 'PHONEPE') {
        processPhonePePayment(btn);
      }
    }); /* ← closes checkout-details-form submit listener */

    document.getElementById('checkout-continue-btn').addEventListener('click', function () {
      closeCheckout();
      window.location.href = 'shop.html';
    });
  }

  /* ─── COD Flow ────────────────────────────────────────────── */
  function processCOD(btn) {
    var orderId = 'ALF-' + Date.now().toString(36).toUpperCase();
    /* Save order in localStorage (will sync to Firebase later) */
    var order = {
      id: orderId,
      type: 'COD',
      items: getCart(),
      total: getCartTotal(),
      customer: checkoutState.details,
      date: new Date().toISOString(),
      status: 'Processing'
    };
    var orders = JSON.parse(localStorage.getItem('alfaaz_orders') || '[]');
    orders.push(order);
    localStorage.setItem('alfaaz_orders', JSON.stringify(orders));

    /* Clear cart */
    saveCart([]);

    showCheckoutStep(3);
    document.getElementById('success-order-id').textContent = orderId;

    /* WhatsApp button */
    var cart = order.items;
    var itemsList = cart.map(function (i) {
      return i.name + ' x' + i.quantity + ' — ₹' + (i.priceNum * i.quantity).toLocaleString('en-IN');
    }).join('\n');
    var msg = encodeURIComponent(
      '🛍️ *New Order — Alfaaz*\n\n' +
      '*Order ID:* ' + orderId + '\n' +
      '*Customer:* ' + order.customer.name + '\n' +
      '*Phone:* ' + order.customer.phone + '\n' +
      '*Address:* ' + order.customer.address + '\n\n' +
      '*Items:*\n' + itemsList + '\n\n' +
      '*Total: ₹' + order.total.toLocaleString('en-IN') + '*\n' +
      '*Payment: Cash on Delivery*'
    );
    document.getElementById('whatsapp-btn').onclick = function () {
      window.open('https://wa.me/918131949105?text=' + msg, '_blank');
    };

    if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
  }

  /* ─── Online Payment (Razorpay Integration) ───────────────── */
  function loadRazorpayScript() {
    return new Promise(function(resolve) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = function() { resolve(true); };
      script.onerror = function() { resolve(false); };
      document.body.appendChild(script);
    });
  }

  async function processOnlinePayment(btn) {
    var isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      showToast('Failed to load payment gateway. Please check your connection.');
      if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
      return;
    }

    var totalAmount = getCartTotal();
    var shipping = totalAmount >= 50000 ? 0 : 999;
    var finalAmount = totalAmount + shipping;

    try {
      // 1. Call Netlify Function — it creates the order AND returns the public key_id
      var res = await fetch(BACKEND_URL + '/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount })
      });

      var orderData = await res.json();

      // Handle not_configured gracefully
      if (res.status === 503) {
        showToast('Razorpay is not yet set up. Please contact support.');
        if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
        return;
      }
      if (!res.ok) throw new Error(orderData.error || 'Failed to initialize payment');

      // 2. Open Razorpay Widget — key_id comes from backend response (never hardcoded)
      var custName = (document.getElementById('cust-name') || {}).value || '';
      var custPhone = (document.getElementById('cust-phone') || {}).value || '';

      var options = {
        key: orderData.key_id,  /* public key returned safely from backend */
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Alfaaz',
        description: 'Jewelry Purchase',
        image: 'https://aalfaz-4244d.web.app/logo.png',
        order_id: orderData.id,
        handler: async function (response) {
          showToast('Verifying payment…');
          try {
            var verifyRes = await fetch(BACKEND_URL + '/.netlify/functions/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            var verifyData = await verifyRes.json();
            if (verifyData.status === 'success') {
              showToast('Payment Successful! Thank you.');
              cart = [];
              saveCart(cart);
              updateAllCartIcons();
              /* Show success step — correct IDs */
              showCheckoutStep(3);
              document.getElementById('whatsapp-btn').style.display = 'none';
              /* Set order ID on success screen */
              var oidEl = document.getElementById('success-order-id');
              if (oidEl) oidEl.textContent = orderData.receipt || orderData.id;
            } else {
              showToast('Payment verification failed. Contact support.');
            }
          } catch (e) {
            showToast('Verification error. Please screenshot and contact support.');
          }
        },
        prefill: {
          name: custName,
          contact: custPhone
        },
        theme: { color: '#111111' },
        modal: { ondismiss: function () {
          if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
        }}
      };

      var rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        showToast('Payment failed. Please try again or use a different method.');
        if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
      });
      rzp.open();

    } catch (err) {
      console.error('Razorpay error:', err);
      showToast('Error connecting to payment server. Please try again.');
    } finally {
      if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
    }
  }

  /* ─── Stripe Payment ───────────────────────────────────────── */
  async function processStripePayment(btn) {
    showToast('Connecting to Stripe…');
    try {
      var res = await fetch(BACKEND_URL + '/.netlify/functions/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          success_url: window.location.origin + '/cart.html?payment=success',
          cancel_url: window.location.origin + '/cart.html?payment=cancelled'
        })
      });
      var data = await res.json();
      if (res.status === 503) {
        showToast('Stripe (International) is not yet set up. Please contact support.');
        if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
        return;
      }
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.message || data.error || 'Failed to connect to Stripe');
      }
    } catch (err) {
      console.error('Stripe error:', err);
      showToast('Stripe checkout failed. Please try another method.');
      if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
    }
  }

  /* ─── PayPal Payment ───────────────────────────────────────── */
  async function processPayPalPayment(btn) {
    showToast('Connecting to PayPal…');
    try {
      var totalAmount = getCartTotal();
      var shipping = totalAmount >= 50000 ? 0 : 999;
      var res = await fetch(BACKEND_URL + '/.netlify/functions/paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount + shipping })
      });
      var data = await res.json();
      if (res.status === 503) {
        showToast('PayPal is not yet set up. Please contact support.');
        if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
        return;
      }
      if (res.ok && data.links) {
        var approvalLink = data.links.find(function(l) { return l.rel === 'approve'; });
        if (approvalLink) { window.location.href = approvalLink.href; }
        else throw new Error('No approval link from PayPal');
      } else {
        throw new Error(data.message || data.error || 'Failed to connect to PayPal');
      }
    } catch (err) {
      console.error('PayPal error:', err);
      showToast('PayPal checkout failed. Please try another method.');
      if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
    }
  }

  /* ─── PhonePe Payment ──────────────────────────────────────── */
  async function processPhonePePayment(btn) {
    showToast('Connecting to PhonePe…');
    try {
      var totalAmount = getCartTotal();
      var shipping = totalAmount >= 50000 ? 0 : 999;
      var res = await fetch(BACKEND_URL + '/.netlify/functions/phonepe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount + shipping,
          transactionId: 'ALF-' + Date.now().toString(36).toUpperCase()
        })
      });
      var data = await res.json();
      if (res.status === 503) {
        showToast('PhonePe is not yet set up. Please contact support.');
        if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
        return;
      }
      if (res.ok && data.data && data.data.instrumentResponse && data.data.instrumentResponse.redirectInfo) {
        window.location.href = data.data.instrumentResponse.redirectInfo.url;
      } else {
        throw new Error(data.message || data.error || 'Failed to connect to PhonePe');
      }
    } catch (err) {
      console.error('PhonePe error:', err);
      showToast('PhonePe checkout failed. Please try another method.');
      if (btn) { btn.textContent = 'Place Order'; btn.disabled = false; }
    }
  }

  /* ─── Expose Globals ─────────────────────────────────────── */
  window.AlfaazCart = {
    get: getCart,
    add: addToCart,
    remove: removeFromCart,
    updateQty: updateQty,
    getTotal: getCartTotal,
    getCount: getCartCount,
    openCheckout: openCheckout,
    showToast: showToast
  };

  /* ─── Init on DOM ready ──────────────────────────────────── */
  function init() {
    updateAllCartIcons();

    /* Wire up any "Add to Cart" buttons already in DOM */
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.preventDefault();
        var product = JSON.parse(addBtn.getAttribute('data-add-to-cart'));
        addToCart(product);
      }

      var buyBtn = e.target.closest('[data-buy-now]');
      if (buyBtn) {
        e.preventDefault();
        var p = JSON.parse(buyBtn.getAttribute('data-buy-now'));
        addToCart(p);
        openCheckout();
      }

      var checkoutBtn = e.target.closest('[data-open-checkout]');
      if (checkoutBtn) {
        e.preventDefault();
        openCheckout();
      }
    });

    /* Keep cart icon live across tab changes */
    window.addEventListener('alfaaz:cartUpdated', updateAllCartIcons);
    window.addEventListener('storage', function (e) {
      if (e.key === 'alfaaz_cart') updateAllCartIcons();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

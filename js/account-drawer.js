/**
 * account-drawer.js
 * Manages the slide-in Account drawer:
 *  - Logged out: Sign In / Sign Up tabs + Google Sign-In
 *  - Logged in: Profile, Cart, Orders tabs
 * Depends on: auth.js, region.js, ecommerce.js (for cart data)
 */
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  resetPassword,
  getUserProfile,
  onAuthChange,
  getAuthErrorMessage
} from './auth.js';

(function () {
  'use strict';

  // ── Build drawer HTML ──────────────────────────────────────────────
  function buildDrawer() {
    const overlay = document.createElement('div');
    overlay.className = 'account-overlay';
    overlay.id = 'account-overlay';

    const drawer = document.createElement('div');
    drawer.className = 'account-drawer';
    drawer.id = 'account-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Account');
    drawer.innerHTML = `
      <div class="account-drawer__header">
        <span class="account-drawer__title" id="drawer-title">Account</span>
        <button class="account-drawer__close" id="drawer-close" aria-label="Close account drawer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="account-drawer__body" id="drawer-body">
        <!-- Logged-out view -->
        <div id="auth-view">
          <div class="auth-tabs">
            <button class="auth-tab is-active" data-auth-tab="signin">Sign In</button>
            <button class="auth-tab" data-auth-tab="signup">Create Account</button>
          </div>

          <!-- Sign In Form -->
          <form class="auth-form" id="signin-form" novalidate>
            <div class="auth-error" id="signin-error"></div>
            <div class="auth-field">
              <label for="si-email">Email</label>
              <input type="email" id="si-email" placeholder="you@example.com" required />
            </div>
            <div class="auth-field">
              <label for="si-password">Password</label>
              <input type="password" id="si-password" placeholder="••••••••" required />
            </div>
            <button type="submit" class="auth-btn" id="signin-btn">Sign In</button>
            <button type="button" class="auth-forgot" id="forgot-btn">Forgot password?</button>
            <div class="auth-success" id="forgot-success">Reset link sent! Check your inbox.</div>
            <div class="auth-divider">or</div>
            <button type="button" class="google-btn" id="google-signin-btn">
              <svg viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.14z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.47-1.39-.74-2.88-.74-4.59s.27-3.2.74-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.55 10.78l7.98-6.19z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.55 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
              Continue with Google
            </button>
          </form>

          <!-- Sign Up Form -->
          <form class="auth-form auth-form--hidden" id="signup-form" novalidate>
            <div class="auth-error" id="signup-error"></div>
            <div class="auth-field-row">
              <div class="auth-field">
                <label for="su-fname">First Name</label>
                <input type="text" id="su-fname" placeholder="Priya" required />
              </div>
              <div class="auth-field">
                <label for="su-lname">Last Name</label>
                <input type="text" id="su-lname" placeholder="Sharma" />
              </div>
            </div>
            <div class="auth-field">
              <label for="su-email">Email</label>
              <input type="email" id="su-email" placeholder="you@example.com" required />
            </div>
            <div class="auth-field">
              <label for="su-phone">Phone (optional)</label>
              <input type="tel" id="su-phone" placeholder="+91 98765 43210" />
            </div>
            <div class="auth-field">
              <label for="su-country">Country</label>
              <select id="su-country">
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AE">UAE</option>
                <option value="SA">Saudi Arabia</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada</option>
                <option value="EU">Europe</option>
                <option value="SG">Singapore</option>
              </select>
            </div>
            <div class="auth-field">
              <label for="su-password">Password</label>
              <input type="password" id="su-password" placeholder="Min. 6 characters" required />
            </div>
            <div class="auth-field">
              <label for="su-confirm">Confirm Password</label>
              <input type="password" id="su-confirm" placeholder="Repeat password" required />
            </div>
            <button type="submit" class="auth-btn" id="signup-btn">Create Account</button>
            <div class="auth-divider">or</div>
            <button type="button" class="google-btn" id="google-signup-btn">
              <svg viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.14z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.47-1.39-.74-2.88-.74-4.59s.27-3.2.74-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.55 10.78l7.98-6.19z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.55 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
              Continue with Google
            </button>
          </form>
        </div>

        <!-- Logged-in view -->
        <div id="account-view" style="display:none; flex-direction:column; flex:1;">
          <div class="acct-profile-bar" id="acct-profile-bar">
            <div class="acct-avatar" id="acct-avatar">A</div>
            <div>
              <div class="acct-name" id="acct-name">Welcome</div>
              <div class="acct-email" id="acct-email"></div>
            </div>
          </div>

          <div class="acct-tabs">
            <button class="acct-tab is-active" data-acct-tab="profile">Profile</button>
            <button class="acct-tab" data-acct-tab="cart">My Cart</button>
            <button class="acct-tab" data-acct-tab="orders">Orders</button>
          </div>

          <!-- Profile Panel -->
          <div class="acct-panel is-active" id="acct-panel-profile">
            <div id="profile-rows"></div>
          </div>

          <!-- Cart Panel -->
          <div class="acct-panel" id="acct-panel-cart">
            <div id="acct-cart-list"></div>
          </div>

          <!-- Orders Panel -->
          <div class="acct-panel" id="acct-panel-orders">
            <div id="acct-orders-list"></div>
          </div>

          <button class="acct-signout-btn" id="signout-btn" style="margin-top:1.5rem;">Sign Out</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    return { overlay, drawer };
  }

  // ── Open / Close drawer ────────────────────────────────────────────
  function openDrawer() {
    document.getElementById('account-overlay').classList.add('is-open');
    document.getElementById('account-drawer').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    document.getElementById('account-overlay').classList.remove('is-open');
    document.getElementById('account-drawer').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // ── Show error/success in a form ───────────────────────────────────
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
  }
  function clearError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('is-visible');
  }
  function showSuccess(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
  }

  // ── Render logged-in account view ──────────────────────────────────
  async function renderAccountView(user) {
    document.getElementById('auth-view').style.display = 'none';
    const av = document.getElementById('account-view');
    av.style.display = 'flex';

    // Profile bar
    const name = user.displayName || user.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    document.getElementById('acct-name').textContent = name;
    document.getElementById('acct-email').textContent = user.email;

    const avatarEl = document.getElementById('acct-avatar');
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${name}" />`;
    } else {
      avatarEl.textContent = initial;
    }

    document.getElementById('drawer-title').textContent = 'My Account';

    // Fetch Firestore profile
    let profile = null;
    try {
      profile = await getUserProfile(user.uid);
    } catch (e) { /* silent */ }

    // ── Profile tab ──
    const profileRows = document.getElementById('profile-rows');
    const countryMap = {IN:'India',US:'United States',GB:'United Kingdom',AE:'UAE',SA:'Saudi Arabia',AU:'Australia',CA:'Canada',EU:'Europe',SG:'Singapore'};
    profileRows.innerHTML = `
      <div class="acct-info-row"><span class="acct-info-label">Name</span><span class="acct-info-value">${profile?.name || name}</span></div>
      <div class="acct-info-row"><span class="acct-info-label">Email</span><span class="acct-info-value">${user.email}</span></div>
      <div class="acct-info-row"><span class="acct-info-label">Phone</span><span class="acct-info-value">${profile?.phone || '—'}</span></div>
      <div class="acct-info-row"><span class="acct-info-label">Country</span><span class="acct-info-value">${countryMap[profile?.country] || '—'}</span></div>
      <div class="acct-info-row"><span class="acct-info-label">Member since</span><span class="acct-info-value">${profile?.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString('en-IN', {year:'numeric',month:'long'}) : '—'}</span></div>
    `;

    // ── Cart tab ──
    renderCartPanel();

    // ── Orders tab ──
    renderOrdersPanel(profile?.orders || []);
  }

  function renderCartPanel() {
    const container = document.getElementById('acct-cart-list');
    const cart = window.AlfaazCart ? window.AlfaazCart.get() : JSON.parse(localStorage.getItem('alfaaz_cart') || '[]');
    if (!cart.length) {
      container.innerHTML = '<p class="acct-cart-empty">Your cart is empty.</p>';
      return;
    }
    let total = 0;
    const items = cart.map(item => {
      const lineTotal = (item.price || 0) * (item.qty || 1);
      total += lineTotal;
      const priceStr = window.AalfazRegion ? window.AalfazRegion.formatPrice(lineTotal) : '₹' + lineTotal.toLocaleString('en-IN');
      return `
        <div class="acct-cart-item">
          <img class="acct-cart-img" src="${item.image || 'logo.png'}" alt="${item.name || 'Product'}" />
          <div class="acct-cart-info">
            <div class="acct-cart-name">${item.name || 'Product'}</div>
            <div class="acct-cart-meta">Qty: ${item.qty || 1}${item.variant ? ' · ' + item.variant : ''}</div>
          </div>
          <div class="acct-cart-price">${priceStr}</div>
        </div>
      `;
    }).join('');
    const totalStr = window.AalfazRegion ? window.AalfazRegion.formatPrice(total) : '₹' + total.toLocaleString('en-IN');
    container.innerHTML = items + `
      <div class="acct-cart-total-row"><span>Total</span><span>${totalStr}</span></div>
      <a href="cart.html" class="acct-go-cart-btn">Go to Cart &rarr;</a>
    `;
  }

  function renderOrdersPanel(orderIds) {
    const container = document.getElementById('acct-orders-list');
    if (!orderIds || !orderIds.length) {
      container.innerHTML = '<p class="acct-orders-empty">No orders yet. <a href="shop.html" style="color:#111;text-decoration:underline;">Start shopping →</a></p>';
      return;
    }

    // Fetch orders from Firestore
    (async () => {
      try {
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const db = window.firebaseDb;
        const q = query(collection(db, 'orders'), where('userId', '==', window.firebaseAuth.currentUser.uid));
        const snap = await getDocs(q);
        if (snap.empty) {
          container.innerHTML = '<p class="acct-orders-empty">No orders yet.</p>';
          return;
        }
        const statusClass = { processing: 'processing', shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled' };
        let html = '';
        snap.forEach(doc => {
          const o = doc.data();
          const status = o.status || 'processing';
          const date = o.createdAt ? new Date(o.createdAt.toDate()).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
          const total = window.AalfazRegion ? window.AalfazRegion.formatPrice(o.totalAmount || 0) : '₹' + (o.totalAmount || 0).toLocaleString('en-IN');
          const itemsList = (o.items || []).map(i => i.name).join(', ') || 'Items';
          html += `
            <div class="acct-order-card">
              <div class="acct-order-card__top">
                <div>
                  <div class="acct-order-id">Order #${doc.id.slice(-8).toUpperCase()}</div>
                  <div style="font-size:0.75rem;color:#aaa;margin-top:0.2rem;">${date}</div>
                </div>
                <span class="acct-order-status acct-order-status--${statusClass[status] || 'processing'}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>
              </div>
              <div class="acct-order-items">${itemsList}</div>
              <div class="acct-order-total">${total}</div>
            </div>
          `;
        });
        container.innerHTML = html;
      } catch (e) {
        container.innerHTML = '<p class="acct-orders-empty">Could not load orders.</p>';
      }
    })();
  }

  // ── Render logged-out view ─────────────────────────────────────────
  function renderAuthView() {
    document.getElementById('account-view').style.display = 'none';
    document.getElementById('auth-view').style.display = 'block';
    document.getElementById('drawer-title').textContent = 'Account';
    // Reset to sign-in tab
    switchAuthTab('signin');
  }

  // ── Switch auth tabs ───────────────────────────────────────────────
  function switchAuthTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.authTab === tab));
    document.getElementById('signin-form').classList.toggle('auth-form--hidden', tab !== 'signin');
    document.getElementById('signup-form').classList.toggle('auth-form--hidden', tab !== 'signup');
  }

  // ── Bind all interactions ──────────────────────────────────────────
  function bindEvents() {
    // Close
    document.getElementById('drawer-close').addEventListener('click', closeDrawer);
    document.getElementById('account-overlay').addEventListener('click', closeDrawer);

    // Auth tabs
    document.querySelectorAll('[data-auth-tab]').forEach(btn => {
      btn.addEventListener('click', () => { clearError('signin-error'); clearError('signup-error'); switchAuthTab(btn.dataset.authTab); });
    });

    // Account tabs (profile / cart / orders)
    document.querySelectorAll('[data-acct-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-acct-tab]').forEach(b => b.classList.remove('is-active'));
        document.querySelectorAll('.acct-panel').forEach(p => p.classList.remove('is-active'));
        btn.classList.add('is-active');
        document.getElementById('acct-panel-' + btn.dataset.acctTab).classList.add('is-active');
        if (btn.dataset.acctTab === 'cart') renderCartPanel();
      });
    });

    // Sign In form
    document.getElementById('signin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('signin-error');
      const btn = document.getElementById('signin-btn');
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      try {
        await signInWithEmail(
          document.getElementById('si-email').value.trim(),
          document.getElementById('si-password').value
        );
        // onAuthChange will handle UI update
      } catch (err) {
        showError('signin-error', getAuthErrorMessage(err.code));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });

    // Forgot password
    document.getElementById('forgot-btn').addEventListener('click', async () => {
      const email = document.getElementById('si-email').value.trim();
      if (!email) { showError('signin-error', 'Enter your email above first.'); return; }
      try {
        await resetPassword(email);
        showSuccess('forgot-success', 'Reset link sent! Check your inbox.');
      } catch (err) {
        showError('signin-error', getAuthErrorMessage(err.code));
      }
    });

    // Sign Up form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError('signup-error');
      const pass = document.getElementById('su-password').value;
      const confirm = document.getElementById('su-confirm').value;
      if (pass !== confirm) { showError('signup-error', 'Passwords do not match.'); return; }
      const btn = document.getElementById('signup-btn');
      btn.disabled = true;
      btn.textContent = 'Creating account…';
      try {
        await signUpWithEmail(
          document.getElementById('su-fname').value.trim(),
          document.getElementById('su-lname').value.trim(),
          document.getElementById('su-email').value.trim(),
          pass,
          document.getElementById('su-phone').value.trim(),
          document.getElementById('su-country').value
        );
      } catch (err) {
        showError('signup-error', getAuthErrorMessage(err.code));
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });

    // Google sign-in (both forms)
    [document.getElementById('google-signin-btn'), document.getElementById('google-signup-btn')].forEach(btn => {
      btn?.addEventListener('click', async () => {
        try {
          await signInWithGoogle();
        } catch (err) {
          const target = document.getElementById('signin-form').classList.contains('auth-form--hidden') ? 'signup-error' : 'signin-error';
          showError(target, getAuthErrorMessage(err.code));
        }
      });
    });

    // Sign out
    document.getElementById('signout-btn').addEventListener('click', async () => {
      await signOutUser();
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  // ── Update navbar Account button text based on auth state ──────────
  function updateNavAccountText(user) {
    document.querySelectorAll('.nav-account-trigger').forEach(el => {
      el.textContent = user ? (user.displayName?.split(' ')[0] || 'Account') : 'Account';
    });
    // Mobile menu link
    document.querySelectorAll('.mobile-menu__link[data-account]').forEach(el => {
      el.textContent = user ? (user.displayName?.split(' ')[0] || 'Account') : 'Account';
    });
  }

  // ── Expose open for checkout gate ─────────────────────────────────
  window.AalfazAccount = {
    open: openDrawer,
    close: closeDrawer,
    showSignIn: () => { openDrawer(); switchAuthTab('signin'); }
  };

  // ── Initialise ─────────────────────────────────────────────────────
  function init() {
    buildDrawer();
    bindEvents();

    // Bind all Account trigger buttons/links in navbar & mobile menu
    document.querySelectorAll('.nav-account-trigger, [data-account]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); });
    });

    // Listen for auth state
    onAuthChange((user) => {
      updateNavAccountText(user);
      if (user) {
        renderAccountView(user);
      } else {
        renderAuthView();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

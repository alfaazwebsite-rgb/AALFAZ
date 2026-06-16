/**
 * region.js — IP-based country/currency detection
 * Uses ipapi.co (free, no API key, 1000 req/day)
 * Caches result in sessionStorage so it only fires once per browser session.
 */
(function () {
  'use strict';

  // ── Supported currencies ──────────────────────────────────────────
  const CURRENCIES = {
    IN:  { code: 'INR', symbol: '₹',   rate: 1,       label: 'India (INR)' },
    US:  { code: 'USD', symbol: '$',   rate: 0.012,   label: 'United States (USD)' },
    GB:  { code: 'GBP', symbol: '£',   rate: 0.0095,  label: 'United Kingdom (GBP)' },
    AE:  { code: 'AED', symbol: 'د.إ', rate: 0.044,   label: 'UAE (AED)' },
    SA:  { code: 'SAR', symbol: '﷼',   rate: 0.045,   label: 'Saudi Arabia (SAR)' },
    AU:  { code: 'AUD', symbol: 'A$',  rate: 0.018,   label: 'Australia (AUD)' },
    CA:  { code: 'CAD', symbol: 'CA$', rate: 0.016,   label: 'Canada (CAD)' },
    EU:  { code: 'EUR', symbol: '€',   rate: 0.011,   label: 'Europe (EUR)' },
    SG:  { code: 'SGD', symbol: 'S$',  rate: 0.016,   label: 'Singapore (SGD)' },
  };

  // EU country codes — map them all to 'EU' entry
  const EU_COUNTRIES = new Set(['DE','FR','IT','ES','NL','BE','AT','PT','PL','SE','DK','FI','GR','IE','HU','CZ','RO','BG','HR','SK','SI','LT','LV','EE','LU','MT','CY']);

  let activeCurrency = CURRENCIES['IN']; // Default: INR

  // ── Expose globally ───────────────────────────────────────────────
  window.AalfazRegion = {
    getCurrency: () => activeCurrency,
    formatPrice: formatPrice,
    applyToPage: applyToPage,
    setCurrencyByCountry: setCurrencyByCountry,
  };

  // ── Format a price number (INR base) → display string ────────────
  function formatPrice(inrAmount) {
    const c = activeCurrency;
    const converted = inrAmount * c.rate;
    if (c.code === 'INR') {
      return c.symbol + Math.round(inrAmount).toLocaleString('en-IN');
    }
    return c.symbol + converted.toFixed(2);
  }

  // ── Set currency by country code ─────────────────────────────────
  function setCurrencyByCountry(countryCode) {
    let key = countryCode;
    if (EU_COUNTRIES.has(countryCode)) key = 'EU';
    activeCurrency = CURRENCIES[key] || CURRENCIES['IN'];
    applyToPage();
    syncFooterSelector();
  }

  // ── Update all price elements on the page ────────────────────────
  function applyToPage() {
    document.querySelectorAll('[data-price-inr]').forEach(el => {
      const inr = parseFloat(el.dataset.priceInr);
      if (!isNaN(inr)) el.textContent = formatPrice(inr);
    });
  }

  // ── Sync the footer region selector ──────────────────────────────
  function syncFooterSelector() {
    const sel = document.getElementById('country-selector');
    if (!sel) return;
    // Find matching option by currency code
    for (const opt of sel.options) {
      if (opt.value === activeCurrency.code || opt.value === Object.keys(CURRENCIES).find(k => CURRENCIES[k].code === activeCurrency.code)) {
        sel.value = opt.value;
        break;
      }
    }
  }

  // ── Footer selector → manual override ────────────────────────────
  function bindFooterSelector() {
    const sel = document.getElementById('country-selector');
    if (!sel) return;
    sel.addEventListener('change', function () {
      const countryKey = this.value;
      activeCurrency = CURRENCIES[countryKey] || CURRENCIES['IN'];
      sessionStorage.setItem('aalfaz_currency_key', countryKey);
      applyToPage();
    });
  }

  // ── Boot: detect country via IP ───────────────────────────────────
  async function boot() {
    // 1. Check sessionStorage first (avoid re-fetching on navigation)
    const cached = sessionStorage.getItem('aalfaz_currency_key');
    if (cached && CURRENCIES[cached]) {
      activeCurrency = CURRENCIES[cached];
      applyToPage();
      bindFooterSelector();
      syncFooterSelector();
      return;
    }

    // 2. Fetch from ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('ipapi failed');
      const data = await res.json();
      const countryCode = data.country_code || 'IN';
      let key = EU_COUNTRIES.has(countryCode) ? 'EU' : countryCode;
      if (!CURRENCIES[key]) key = 'IN'; // fallback
      sessionStorage.setItem('aalfaz_currency_key', key);
      activeCurrency = CURRENCIES[key];
    } catch (e) {
      // Silently fallback to INR on any error
      sessionStorage.setItem('aalfaz_currency_key', 'IN');
    }

    applyToPage();
    bindFooterSelector();
    syncFooterSelector();
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

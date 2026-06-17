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
  let activeCountryKey = 'IN';

  // ── Expose globally ───────────────────────────────────────────────
  function updateGlobal() {
    window.AalfazRegion = {
      country:  activeCountryKey,
      symbol:   activeCurrency.symbol,
      code:     activeCurrency.code,
      rate:     activeCurrency.rate,
      getCurrency: () => activeCurrency,
      formatPrice: formatPrice,
      applyToPage: applyToPage,
      setCurrencyByCountry: setCurrencyByCountry,
    };
  }
  updateGlobal();

  /**
   * formatPrice(inrAmountOrProduct, pricesObj?)
   *
   * Two call signatures:
   *   formatPrice(3000)              — convert INR amount using exchange rate
   *   formatPrice(3000, {IN:3000, US:36, GB:28, ...})  — use exact country price if set,
   *                                     else fall back to INR conversion
   */
  function formatPrice(inrAmount, pricesObj) {
    const c   = activeCurrency;
    const key = activeCountryKey;
    const sym = c.symbol;

    // If a per-country prices map is provided, use the exact price when available
    if (pricesObj && typeof pricesObj === 'object') {
      if (pricesObj[key] != null) {
        const exact = pricesObj[key];
        return key === 'IN'
          ? sym + Math.round(exact).toLocaleString('en-IN')
          : sym + Number(exact).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
      }
      // No exact price for this country — use INR base with exchange rate
      const inrBase = pricesObj['IN'] || inrAmount || 0;
      const converted = inrBase * c.rate;
      return sym + converted.toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
    }

    // Simple INR amount → convert
    const converted = inrAmount * c.rate;
    if (key === 'IN') {
      return sym + Math.round(inrAmount).toLocaleString('en-IN');
    }
    return sym + converted.toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 });
  }

  // ── Set currency by country code ─────────────────────────────────
  function setCurrencyByCountry(countryCode) {
    let key = countryCode;
    if (key === 'UK') key = 'GB'; // footer selector uses UK, map to GB
    if (EU_COUNTRIES.has(key)) key = 'EU';
    if (!CURRENCIES[key]) key = 'IN';
    activeCountryKey = key;
    activeCurrency   = CURRENCIES[key];
    updateGlobal();
    applyToPage();
    syncFooterSelector();
    window.dispatchEvent(new CustomEvent('aalfaz:regionChange', { detail: window.AalfazRegion }));
  }

  // ── Update all price elements on the page ────────────────────────
  function applyToPage() {
    // data-price-inr: simple INR base price, convert with exchange rate
    document.querySelectorAll('[data-price-inr]').forEach(el => {
      const inr = parseFloat(el.dataset.priceInr);
      if (!isNaN(inr)) {
        // Also check if element has a per-country prices map
        let prices = null;
        try { prices = el.dataset.prices ? JSON.parse(el.dataset.prices) : null; } catch(_) {}
        el.textContent = formatPrice(inr, prices);
      }
    });
  }

  // ── Sync the footer region selector ──────────────────────────────
  function syncFooterSelector() {
    const sel = document.getElementById('country-selector');
    if (!sel) return;
    // Options use country keys (IN, US, UK, EU, CA)
    // activeCountryKey uses GB for UK, so handle alias
    const target = activeCountryKey === 'GB' ? ['GB','UK'] : [activeCountryKey];
    for (const opt of sel.options) {
      if (target.includes(opt.value)) { sel.value = opt.value; break; }
    }
  }

  // ── Footer selector → manual override ────────────────────────────
  function bindFooterSelector() {
    const sel = document.getElementById('country-selector');
    if (!sel) return;
    sel.addEventListener('change', function () {
      sessionStorage.setItem('aalfaz_currency_key', this.value);
      setCurrencyByCountry(this.value);
    });
  }

  // ── Boot: detect country via IP ───────────────────────────────────
  async function boot() {
    // 1. Check sessionStorage first (avoid re-fetching on navigation)
    const cached = sessionStorage.getItem('aalfaz_currency_key');
    if (cached && CURRENCIES[cached]) {
      activeCountryKey = cached;          // ← was missing, caused wrong price lookup
      activeCurrency   = CURRENCIES[cached];
      updateGlobal();
      applyToPage();
      bindFooterSelector();
      syncFooterSelector();
      window.dispatchEvent(new CustomEvent('aalfaz:regionChange', { detail: window.AalfazRegion }));
      return;
    }

    // 2. Fetch from ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('ipapi failed');
      const data = await res.json();
      const countryCode = data.country_code || 'IN';
      let key = EU_COUNTRIES.has(countryCode) ? 'EU' : countryCode;
      if (!CURRENCIES[key]) key = 'IN';
      sessionStorage.setItem('aalfaz_currency_key', key);
      activeCountryKey = key;
      activeCurrency   = CURRENCIES[key];
      updateGlobal();
    } catch (e) {
      sessionStorage.setItem('aalfaz_currency_key', 'IN');
    }

    applyToPage();
    bindFooterSelector();
    syncFooterSelector();
    window.dispatchEvent(new CustomEvent('aalfaz:regionChange', { detail: window.AalfazRegion }));
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

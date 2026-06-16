# Aalfaz Admin Panel — Payment & Logistics Configuration Vision

## Overview
When the Admin Panel is built, it must include a dedicated **Ecommerce Settings** section where the store owner can enter API credentials for all payment gateways and logistics partners directly from the UI — without ever touching code or environment variables manually.

These credentials will be saved securely to Firebase Firestore under a protected admin-only document.

---

## Section: Payment Gateways

### 1. Razorpay (Domestic — Cards, UPI, Netbanking)
> Supports Indian customers. Accepts UPI, Debit/Credit Cards, Netbanking.

| Field | Description | Required |
|---|---|---|
| Key ID | Starts with `rzp_live_...` or `rzp_test_...` | Yes |
| Key Secret | Secret key from Razorpay dashboard | Yes |

**Testing Available?** YES — Create a free Razorpay account and switch to "Test Mode" in the dashboard to get `rzp_test_...` keys. Use card number `4111 1111 1111 1111` to simulate payments.

**Razorpay Dashboard:** https://dashboard.razorpay.com/app/keys

---

### 2. PhonePe (Domestic — UPI / Wallets)
> Zero transaction fee UPI gateway. Ideal for Indian customers preferring PhonePe app.

| Field | Description | Required |
|---|---|---|
| Merchant ID | Provided by PhonePe after merchant registration | Yes |
| Salt Key | Cryptographic key for X-VERIFY header | Yes |
| Salt Index | Numeric index (usually `1`) | Yes |
| Environment | Dropdown: `UAT (Testing)` or `Production` | Yes |

**Testing Available?** YES — PhonePe provides a public Sandbox environment.
- Test Merchant ID: `PGTESTPAYUAT`
- Test Salt Key: `099eb0cd-02cf-4e2a-8aca-3e6c6aff0399`
- Test Salt Index: `1`
- Enter these in the admin panel and set Environment to `UAT (Testing)` to test.

**PhonePe Business:** https://business.phonepe.com/

---

### 3. Stripe (International — Apple Pay, Google Pay, Cards)
> Best for international customers. Accepts all major credit cards worldwide, Apple Pay, Google Pay.

| Field | Description | Required |
|---|---|---|
| Secret Key | Starts with `sk_live_...` or `sk_test_...` | Yes |
| Publishable Key | Starts with `pk_live_...` or `pk_test_...` | Optional (for future embedded widget) |
| Webhook Secret | For verifying Stripe webhook events | Optional |

**Testing Available?** YES — Create a free Stripe account. Test keys are instantly available with no business verification.
- Test Secret Key: Available in Stripe Dashboard under Developers > API Keys (toggle to Test Mode)
- Test Card: `4242 4242 4242 4242`, any future expiry, any CVC

**Stripe Dashboard:** https://dashboard.stripe.com/test/apikeys

---

### 4. PayPal (International — USD/EUR Global)
> Allows international customers to pay from their PayPal balance or any card. Trusted globally.

| Field | Description | Required |
|---|---|---|
| Client ID | From PayPal Developer App | Yes |
| Client Secret | From PayPal Developer App | Yes |
| Environment | Dropdown: `Sandbox (Testing)` or `Live` | Yes |

**Testing Available?** YES — PayPal has a full Sandbox system.
- Go to https://developer.paypal.com/dashboard/applications/sandbox
- Create a Sandbox App to get test Client ID and Secret
- Set Environment to `Sandbox (Testing)` in admin panel

**PayPal Developer:** https://developer.paypal.com/dashboard/

---

## Section: Logistics

### 5. Shiprocket (National & International Shipping Aggregator)
> Single integration that gives access to 25+ courier partners (BlueDart, Delhivery, Xpressbees, DHL, Aramex etc.)

| Field | Description | Required |
|---|---|---|
| Email | Email used to log into Shiprocket dashboard | Yes |
| Password | Shiprocket account password | Yes |
| Pickup Location Name | The label for your pickup warehouse in Shiprocket (e.g. "Primary") | Yes |

**Testing Available?** YES — Shiprocket has a test environment.
- Use test credentials at: https://apiv2.shiprocket.in (sandbox docs on request)

**Shiprocket Dashboard:** https://app.shiprocket.in/

---

## Section: Admin Panel UI Requirements

### Payment Gateway Status Cards
Each gateway should show as a card with:
- Gateway Logo
- Status badge: 🟢 `Active` / 🔴 `Not Configured` / 🟡 `Test Mode`
- Input fields (masked like passwords) for credentials
- Toggle switch: `Enable / Disable` this gateway
- A `Test Connection` button that sends a dummy request to verify the keys work
- A `Test Mode` checkbox — when checked, automatically uses sandbox/UAT endpoints

### General Rules
- All fields should be **password-masked** in the UI (show/hide toggle)
- Credentials must be **stored in Firestore** under `/admin/settings/paymentGateways` (admin-only read rules)
- The Netlify backend functions should **read from Firestore** (or fall back to env variables) to get the keys at runtime
- Show a clear warning when any gateway is in Test Mode so the admin doesn't forget to switch to live

---

## Section: Order Flow (What happens when a customer pays)

```
Customer selects payment method
         ↓
Frontend calls Netlify Function
         ↓
Netlify Function reads credentials from Firestore (or env)
         ↓
Netlify Function calls Payment Gateway API
         ↓
Payment Gateway returns Order ID / Redirect URL
         ↓
Customer completes payment
         ↓
Netlify Function verifies payment signature (cryptographic check)
         ↓
Order saved to Firestore (/orders collection)
         ↓
Shiprocket auto-sync triggered (Netlify Function)
         ↓
Shiprocket generates shipping label + assigns courier
         ↓
[Future] WhatsApp notification sent to customer with tracking link
```

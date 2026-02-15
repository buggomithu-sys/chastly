# Payment Gateway Integration Guide

## Overview
Chastly supports 7 premium payment gateways across different regions, providing comprehensive payment options for India, USA, Europe, and global markets.

## Supported Payment Gateways

### India 🇮🇳
1. **Razorpay** - UPI, Cards, Wallets, Net Banking
2. **Cashfree** - UPI, Cards, Pay Later
3. **PayU** - Local Cards, UPI, Wallets

### USA & Europe 🌍
4. **Stripe** - Multi-currency, Global Cards, Digital Wallets
5. **PayPal** - Global Payments, PayPal Balance
6. **Adyen** - Enterprise Multi-currency, Cards, Local Payment Methods

### Europe (BNPL) 🇪🇺
7. **Klarna** - Buy Now Pay Later, Installments

---

## Quick Start

### 1. Configure Payment Gateway Credentials

Add your payment gateway credentials to `.env`:

```env
# Razorpay (India)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cashfree (India)
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_ENV=sandbox # or production

# PayU (India)
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt
PAYU_ENV=test # or production

# Stripe (Global)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (Global)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENV=sandbox # or production

# Adyen (Global)
ADYEN_API_KEY=your_api_key
ADYEN_MERCHANT_ACCOUNT=your_merchant_account
ADYEN_ENV=test # or live

# Klarna (Europe BNPL)
KLARNA_USERNAME=your_username
KLARNA_PASSWORD=your_password
KLARNA_ENV=playground # or production
```

### 2. Create Payment Link

**API Endpoint:** `POST /api/payments/links`

**Request:**
```json
{
  "amount": 99.99,
  "currency": "INR",
  "description": "Premium Plan - Monthly",
  "provider": "razorpay",
  "contactId": "cnt_abc123",
  "campaignId": "cmp_xyz789",
  "successUrl": "https://yoursite.com/payment/success",
  "cancelUrl": "https://yoursite.com/payment/cancel",
  "metadata": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+919876543210"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_abc123",
    "paymentUrl": "https://razorpay.com/payment-link/xyz",
    "expiresAt": "2026-02-16T12:00:00Z"
  }
}
```

### 3. Check Payment Status

**API Endpoint:** `GET /api/payments/:paymentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pay_abc123",
    "userId": "user_123",
    "amount": 99.99,
    "currency": "INR",
    "status": "completed",
    "provider": "razorpay",
    "externalId": "link_xyz",
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

---

## Payment Gateway Details

### 1. Razorpay (India)

**Features:**
- ✅ UPI (BHIM, PhonePe, Google Pay, Paytm)
- ✅ Debit/Credit Cards (Visa, Mastercard, RuPay, Amex)
- ✅ Net Banking (All major banks)
- ✅ Wallets (Paytm, PhonePe, Mobikwik)
- ✅ EMI Options
- ✅ SMS/Email Notifications

**Currency:** INR only

**Setup:**
1. Sign up at https://razorpay.com
2. Get API Key ID and Secret from Dashboard
3. Configure webhook URL: `https://yourapp.com/webhooks/razorpay`

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1999,
    "currency": "INR",
    "description": "Premium Plan",
    "provider": "razorpay",
    "metadata": {
      "customerName": "Rahul Kumar",
      "customerEmail": "rahul@example.com",
      "customerPhone": "+919876543210"
    }
  }'
```

---

### 2. Cashfree (India)

**Features:**
- ✅ UPI
- ✅ Cards (All major cards)
- ✅ Net Banking
- ✅ Pay Later (Simpl, LazyPay)
- ✅ 24-hour payment link validity

**Currency:** INR only

**Setup:**
1. Sign up at https://cashfree.com
2. Get App ID and Secret Key
3. Configure webhook URL: `https://yourapp.com/webhooks/cashfree`

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2499,
    "currency": "INR",
    "description": "Pro Plan",
    "provider": "cashfree",
    "metadata": {
      "customerName": "Priya Sharma",
      "customerEmail": "priya@example.com",
      "customerPhone": "+919988776655"
    }
  }'
```

---

### 3. PayU (India)

**Features:**
- ✅ Local Cards (Rupay, Visa, Mastercard)
- ✅ UPI
- ✅ Wallets
- ✅ EMI Options
- ✅ Form-based payment flow

**Currency:** INR only

**Setup:**
1. Sign up at https://payu.in
2. Get Merchant Key and Salt
3. Configure success/failure URLs

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 999,
    "currency": "INR",
    "description": "Starter Plan",
    "provider": "payu",
    "metadata": {
      "customerName": "Amit Patel",
      "customerEmail": "amit@example.com",
      "customerPhone": "+919123456780"
    }
  }'
```

---

### 4. Stripe (Global)

**Features:**
- ✅ Multi-currency (135+ currencies)
- ✅ Global Cards (Visa, Mastercard, Amex)
- ✅ Apple Pay, Google Pay
- ✅ Bank Transfers (ACH, SEPA)
- ✅ Payment Links with QR Codes

**Currency:** USD, EUR, GBP, INR, and 130+ others

**Setup:**
1. Sign up at https://stripe.com
2. Get Secret Key and Publishable Key
3. Configure webhook endpoint: `https://yourapp.com/webhooks/stripe`

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "description": "Premium Plan - Annual",
    "provider": "stripe",
    "metadata": {
      "customerName": "John Smith",
      "customerEmail": "john@example.com"
    }
  }'
```

---

### 5. PayPal (Global)

**Features:**
- ✅ PayPal Balance
- ✅ Credit/Debit Cards
- ✅ Bank Account
- ✅ Pay in 4 (BNPL)
- ✅ Multi-currency

**Currency:** USD, EUR, GBP, and 100+ currencies

**Setup:**
1. Sign up at https://developer.paypal.com
2. Create REST API app
3. Get Client ID and Secret
4. Configure webhook: `https://yourapp.com/webhooks/paypal`

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 149.99,
    "currency": "USD",
    "description": "Enterprise Plan",
    "provider": "paypal",
    "successUrl": "https://yourapp.com/payment/success",
    "cancelUrl": "https://yourapp.com/payment/cancel"
  }'
```

---

### 6. Adyen (Global)

**Features:**
- ✅ Multi-currency
- ✅ 250+ Local Payment Methods
- ✅ Enterprise-grade security
- ✅ Smart routing
- ✅ Risk management

**Currency:** 150+ currencies

**Setup:**
1. Sign up at https://adyen.com
2. Get API Key and Merchant Account
3. Configure webhook: `https://yourapp.com/webhooks/adyen`

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 199.99,
    "currency": "EUR",
    "description": "Business Plan",
    "provider": "adyen",
    "metadata": {
      "customerName": "Hans Mueller",
      "customerEmail": "hans@example.com"
    }
  }'
```

---

### 7. Klarna (Europe BNPL)

**Features:**
- ✅ Buy Now Pay Later
- ✅ Pay in 3 installments
- ✅ Pay in 30 days
- ✅ Financing options
- ✅ Popular in Sweden, Germany, UK

**Currency:** EUR, GBP, SEK, NOK, DKK

**Setup:**
1. Sign up at https://klarna.com/us/business
2. Get API credentials
3. Configure confirmation URL

**Example:**
```bash
curl -X POST http://localhost:3001/api/payments/links \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 299.99,
    "currency": "EUR",
    "description": "Premium Subscription",
    "provider": "klarna",
    "metadata": {
      "country": "SE",
      "locale": "en-SE",
      "customerName": "Anna Andersson",
      "customerEmail": "anna@example.com"
    }
  }'
```

---

## Webhook Configuration

All payment gateways send webhook notifications when payment status changes. Configure these webhooks in your payment provider dashboard:

### Webhook URLs:
```
Razorpay:  https://yourapp.com/webhooks/razorpay
Cashfree:  https://yourapp.com/webhooks/cashfree
PayU:      https://yourapp.com/webhooks/payu
Stripe:    https://yourapp.com/webhooks/stripe
PayPal:    https://yourapp.com/webhooks/paypal
Adyen:     https://yourapp.com/webhooks/adyen
Klarna:    https://yourapp.com/webhooks/klarna
```

### Webhook Events Handled:
- ✅ Payment Successful
- ✅ Payment Failed
- ✅ Payment Pending
- ✅ Refund Processed

When a payment is completed:
1. Payment status updated to `completed`
2. Campaign revenue incremented
3. Conversion count incremented

---

## Revenue Attribution

Payments are automatically attributed to campaigns when `campaignId` is provided:

```typescript
{
  "campaignId": "cmp_xyz789",
  "amount": 99.99,
  // ...
}
```

Campaign statistics updated:
- `revenue` += payment amount
- `conversionCount` += 1

---

## Testing

### Sandbox/Test Credentials

**Razorpay Test:**
- Use test mode keys from Dashboard
- Test card: 4111 1111 1111 1111

**Cashfree Test:**
- Set `CASHFREE_ENV=sandbox`
- Use sandbox credentials

**PayU Test:**
- Set `PAYU_ENV=test`
- Test card: 5123 4567 8901 2346

**Stripe Test:**
- Use test mode keys (sk_test_...)
- Test card: 4242 4242 4242 4242

**PayPal Test:**
- Set `PAYPAL_ENV=sandbox`
- Create sandbox accounts

**Adyen Test:**
- Set `ADYEN_ENV=test`
- Use test cards from docs

**Klarna Test:**
- Set `KLARNA_ENV=playground`
- Use test credentials

---

## Best Practices

1. **Always use HTTPS** in production
2. **Verify webhook signatures** before processing
3. **Handle async payment confirmations**
4. **Store transaction IDs** for reconciliation
5. **Implement retry logic** for failed webhooks
6. **Log all payment events** for debugging
7. **Use idempotency keys** for payment creation
8. **Test thoroughly** in sandbox before production

---

## Error Handling

All payment methods return standardized errors:

```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_LINK_CREATE_FAILED",
    "message": "Razorpay error: Invalid API key"
  }
}
```

Common errors:
- `PAYMENT_LINK_CREATE_FAILED` - Failed to create payment link
- `PAYMENT_NOT_FOUND` - Payment ID not found
- `PROVIDER_CONFIG_MISSING` - Payment gateway not configured

---

## Support

For payment gateway specific issues:
- **Razorpay:** https://razorpay.com/support
- **Cashfree:** https://cashfree.com/support
- **PayU:** https://payu.in/support
- **Stripe:** https://support.stripe.com
- **PayPal:** https://developer.paypal.com/support
- **Adyen:** https://help.adyen.com
- **Klarna:** https://docs.klarna.com

---

## License
MIT

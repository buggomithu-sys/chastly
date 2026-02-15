import { prisma } from '../../lib/prisma';
import axios from 'axios';

// Payment provider types
export type PaymentProvider = 
  | 'stripe' 
  | 'razorpay' 
  | 'cashfree' 
  | 'payu' 
  | 'paypal' 
  | 'adyen' 
  | 'klarna';

export interface PaymentLinkRequest {
  userId: string;
  contactId?: string;
  campaignId?: string;
  amount: number;
  currency: string;
  description: string;
  provider: PaymentProvider;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentLinkResponse {
  paymentId: string;
  paymentUrl: string;
  expiresAt?: Date;
}

export class PaymentService {
  // RAZORPAY (India) - UPI, Cards, Wallets
  async createRazorpayLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://api.razorpay.com/v1/payment_links',
        {
          amount: Math.round(request.amount * 100),
          currency: request.currency.toUpperCase(),
          description: request.description,
          customer: {
            name: request.metadata?.customerName || 'Customer',
            email: request.metadata?.customerEmail,
            contact: request.metadata?.customerPhone,
          },
          notify: { sms: true, email: true },
          reminder_enable: true,
          callback_url: request.successUrl,
          callback_method: 'get',
        },
        {
          auth: { username: keyId, password: keySecret },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'razorpay',
          externalId: response.data.id,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      return {
        paymentId: transaction.id,
        paymentUrl: response.data.short_url,
        expiresAt: response.data.expire_by ? new Date(response.data.expire_by * 1000) : undefined,
      };
    } catch (error: any) {
      throw new Error(`Razorpay error: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  // CASHFREE (India) - UPI, Cards
  async createCashfreeLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const apiUrl = process.env.CASHFREE_ENV === 'production'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com';

    if (!appId || !secretKey) {
      throw new Error('Cashfree credentials not configured');
    }

    try {
      const orderId = `order_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

      const response = await axios.post(
        `${apiUrl}/pg/links`,
        {
          link_id: orderId,
          link_amount: request.amount,
          link_currency: request.currency.toUpperCase(),
          link_purpose: request.description,
          customer_details: {
            customer_name: request.metadata?.customerName || 'Customer',
            customer_email: request.metadata?.customerEmail,
            customer_phone: request.metadata?.customerPhone,
          },
          link_notify: { send_sms: true, send_email: true },
          link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          link_meta: { return_url: request.successUrl },
        },
        {
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'cashfree',
          externalId: response.data.link_id,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      return {
        paymentId: transaction.id,
        paymentUrl: response.data.link_url,
        expiresAt: new Date(response.data.link_expiry_time),
      };
    } catch (error: any) {
      throw new Error(`Cashfree error: ${error.response?.data?.message || error.message}`);
    }
  }

  // PAYU (India) - Local Cards, UPI
  async createPayULink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const merchantKey = process.env.PAYU_MERCHANT_KEY;
    const merchantSalt = process.env.PAYU_MERCHANT_SALT;
    const apiUrl = process.env.PAYU_ENV === 'production'
      ? 'https://secure.payu.in'
      : 'https://test.payu.in';

    if (!merchantKey || !merchantSalt) {
      throw new Error('PayU credentials not configured');
    }

    try {
      const crypto = require('crypto');
      const txnid = `txn_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
      
      const hashString = `${merchantKey}|${txnid}|${request.amount}|${request.description}|${request.metadata?.customerName || 'Customer'}|${request.metadata?.customerEmail}|||||||||||${merchantSalt}`;
      const hash = crypto.createHash('sha512').update(hashString).digest('hex');

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'payu',
          externalId: txnid,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      const paymentUrl = `${apiUrl}/_payment`;
      const formData = {
        key: merchantKey,
        txnid: txnid,
        amount: request.amount,
        productinfo: request.description,
        firstname: request.metadata?.customerName || 'Customer',
        email: request.metadata?.customerEmail || 'customer@example.com',
        phone: request.metadata?.customerPhone,
        surl: request.successUrl || `${process.env.APP_URL}/payment/success`,
        furl: request.cancelUrl || `${process.env.APP_URL}/payment/failure`,
        hash: hash,
        service_provider: 'payu_paisa',
      };

      return {
        paymentId: transaction.id,
        paymentUrl: `${paymentUrl}?${new URLSearchParams(formData as any).toString()}`,
      };
    } catch (error: any) {
      throw new Error(`PayU error: ${error.message}`);
    }
  }

  // STRIPE (Global) - Multi-currency, Cards
  async createStripeLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Stripe credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://api.stripe.com/v1/payment_links',
        new URLSearchParams({
          'line_items[0][price_data][currency]': request.currency.toLowerCase(),
          'line_items[0][price_data][product_data][name]': request.description,
          'line_items[0][price_data][unit_amount]': Math.round(request.amount * 100).toString(),
          'line_items[0][quantity]': '1',
          'after_completion[type]': 'redirect',
          'after_completion[redirect][url]': request.successUrl || `${process.env.APP_URL}/payment/success`,
        } as any),
        {
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'stripe',
          externalId: response.data.id,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      return {
        paymentId: transaction.id,
        paymentUrl: response.data.url,
      };
    } catch (error: any) {
      throw new Error(`Stripe error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // PAYPAL (Global) - Global Payments
  async createPayPalLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const apiUrl = process.env.PAYPAL_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    try {
      const authResponse = await axios.post(
        `${apiUrl}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: clientId, password: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const accessToken = authResponse.data.access_token;

      const orderResponse = await axios.post(
        `${apiUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: request.currency.toUpperCase(),
              value: request.amount.toFixed(2),
            },
            description: request.description,
          }],
          application_context: {
            return_url: request.successUrl || `${process.env.APP_URL}/payment/success`,
            cancel_url: request.cancelUrl || `${process.env.APP_URL}/payment/cancel`,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'paypal',
          externalId: orderResponse.data.id,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      const approveLink = orderResponse.data.links.find((link: any) => link.rel === 'approve');

      return {
        paymentId: transaction.id,
        paymentUrl: approveLink.href,
      };
    } catch (error: any) {
      throw new Error(`PayPal error: ${error.response?.data?.message || error.message}`);
    }
  }

  // ADYEN (Global) - Multi-currency, Cards
  async createAdyenLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const apiKey = process.env.ADYEN_API_KEY;
    const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT;
    const apiUrl = process.env.ADYEN_ENV === 'production'
      ? 'https://checkout-live.adyen.com/v70'
      : 'https://checkout-test.adyen.com/v70';

    if (!apiKey || !merchantAccount) {
      throw new Error('Adyen credentials not configured');
    }

    try {
      const reference = `ref_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;

      const response = await axios.post(
        `${apiUrl}/paymentLinks`,
        {
          merchantAccount,
          reference,
          amount: {
            value: Math.round(request.amount * 100),
            currency: request.currency.toUpperCase(),
          },
          description: request.description,
          returnUrl: request.successUrl || `${process.env.APP_URL}/payment/success`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'adyen',
          externalId: response.data.reference,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      return {
        paymentId: transaction.id,
        paymentUrl: response.data.url,
        expiresAt: new Date(response.data.expiresAt),
      };
    } catch (error: any) {
      throw new Error(`Adyen error: ${error.response?.data?.message || error.message}`);
    }
  }

  // KLARNA (Europe) - Buy Now Pay Later
  async createKlarnaLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    const username = process.env.KLARNA_USERNAME;
    const password = process.env.KLARNA_PASSWORD;
    const apiUrl = process.env.KLARNA_ENV === 'production'
      ? 'https://api.klarna.com'
      : 'https://api.playground.klarna.com';

    if (!username || !password) {
      throw new Error('Klarna credentials not configured');
    }

    try {
      const response = await axios.post(
        `${apiUrl}/checkout/v3/orders`,
        {
          purchase_country: request.metadata?.country || 'SE',
          purchase_currency: request.currency.toUpperCase(),
          locale: request.metadata?.locale || 'en-SE',
          order_amount: Math.round(request.amount * 100),
          order_tax_amount: 0,
          order_lines: [{
            type: 'digital',
            name: request.description,
            quantity: 1,
            unit_price: Math.round(request.amount * 100),
            tax_rate: 0,
            total_amount: Math.round(request.amount * 100),
            total_tax_amount: 0,
          }],
          merchant_urls: {
            confirmation: request.successUrl || `${process.env.APP_URL}/payment/success`,
            terms: `${process.env.APP_URL}/terms`,
          },
        },
        {
          auth: { username, password },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const transaction = await prisma.paymentTransaction.create({
        data: {
          userId: request.userId,
          contactId: request.contactId,
          campaignId: request.campaignId,
          amount: request.amount,
          currency: request.currency,
          status: 'pending',
          provider: 'klarna',
          externalId: response.data.order_id,
          metadata: JSON.stringify(request.metadata || {}),
        },
      });

      return {
        paymentId: transaction.id,
        paymentUrl: response.data.checkout_url || response.data.html_snippet,
      };
    } catch (error: any) {
      throw new Error(`Klarna error: ${error.response?.data?.error_messages?.[0] || error.message}`);
    }
  }

  // Unified create payment link
  async createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
    switch (request.provider) {
      case 'razorpay':
        return this.createRazorpayLink(request);
      case 'cashfree':
        return this.createCashfreeLink(request);
      case 'payu':
        return this.createPayULink(request);
      case 'stripe':
        return this.createStripeLink(request);
      case 'paypal':
        return this.createPayPalLink(request);
      case 'adyen':
        return this.createAdyenLink(request);
      case 'klarna':
        return this.createKlarnaLink(request);
      default:
        throw new Error(`Unsupported payment provider: ${request.provider}`);
    }
  }

  async getPaymentStatus(paymentId: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
    });

    if (!transaction) {
      throw new Error('Payment not found');
    }

    return transaction;
  }

  async updatePaymentStatus(externalId: string, provider: string, status: string, metadata?: any) {
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { externalId, provider },
    });

    if (!transaction) {
      throw new Error('Payment transaction not found');
    }

    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status,
        metadata: metadata ? JSON.stringify(metadata) : transaction.metadata,
      },
    });

    if (status === 'completed' && transaction.campaignId) {
      await prisma.campaign.update({
        where: { id: transaction.campaignId },
        data: {
          revenue: { increment: transaction.amount },
          conversionCount: { increment: 1 },
        },
      });
    }

    return updatedTransaction;
  }

  async listPayments(userId: string, filters?: {
    status?: string;
    provider?: string;
    campaignId?: string;
    limit?: number;
  }) {
    const where: any = { userId };

    if (filters?.status) where.status = filters.status;
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.campaignId) where.campaignId = filters.campaignId;

    const payments = await prisma.paymentTransaction.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }
}

export const paymentService = new PaymentService();

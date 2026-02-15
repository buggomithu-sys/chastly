import { FastifyPluginAsync } from 'fastify';
import { paymentService } from './payments.service';

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  // Create payment link
  fastify.post('/payments/links', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const user = request.user;
      const body = request.body as any;

      try {
        const paymentLink = await paymentService.createPaymentLink({
          userId: user.id,
          contactId: body.contactId,
          campaignId: body.campaignId,
          amount: parseFloat(body.amount),
          currency: body.currency || 'USD',
          description: body.description,
          provider: body.provider,
          successUrl: body.successUrl,
          cancelUrl: body.cancelUrl,
          metadata: body.metadata || {},
        });

        return reply.send({
          success: true,
          data: paymentLink,
        });
      } catch (error: any) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'PAYMENT_LINK_CREATE_FAILED',
            message: error.message,
          },
        });
      }
    },
  });

  // Get payment status
  fastify.get('/payments/:id', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const payment = await paymentService.getPaymentStatus(id);

        return reply.send({
          success: true,
          data: payment,
        });
      } catch (error: any) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: error.message,
          },
        });
      }
    },
  });

  // List payments
  fastify.get('/payments', {
    preHandler: fastify.auth([fastify.verifySession]),
    handler: async (request, reply) => {
      const user = request.user;
      const query = request.query as any;

      const payments = await paymentService.listPayments(user.id, {
        status: query.status,
        provider: query.provider,
        campaignId: query.campaignId,
        limit: query.limit ? parseInt(query.limit) : 50,
      });

      return reply.send({
        success: true,
        data: payments,
      });
    },
  });

  // Webhook handlers for payment gateways
  
  // Razorpay webhook
  fastify.post('/webhooks/razorpay', async (request, reply) => {
    const body = request.body as any;
    const signature = request.headers['x-razorpay-signature'] as string;

    // TODO: PRODUCTION - Enable webhook signature verification
    // const crypto = require('crypto');
    // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    //   .update(JSON.stringify(body))
    //   .digest('hex');
    
    // if (signature !== expectedSignature) {
    //   return reply.status(400).send({ error: 'Invalid signature' });
    // }

    // WARNING: Webhook signature verification is DISABLED for development
    // MUST be enabled before production deployment to prevent unauthorized access

    try {
      if (body.event === 'payment_link.paid') {
        await paymentService.updatePaymentStatus(
          body.payload.payment_link.entity.id,
          'razorpay',
          'completed',
          body.payload
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[Razorpay Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Cashfree webhook
  fastify.post('/webhooks/cashfree', async (request, reply) => {
    const body = request.body as any;

    try {
      if (body.type === 'PAYMENT_SUCCESS_WEBHOOK') {
        await paymentService.updatePaymentStatus(
          body.data.order.order_id,
          'cashfree',
          'completed',
          body.data
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[Cashfree Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // PayU webhook
  fastify.post('/webhooks/payu', async (request, reply) => {
    const body = request.body as any;

    try {
      if (body.status === 'success') {
        await paymentService.updatePaymentStatus(
          body.txnid,
          'payu',
          'completed',
          body
        );
      } else if (body.status === 'failure') {
        await paymentService.updatePaymentStatus(
          body.txnid,
          'payu',
          'failed',
          body
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[PayU Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Stripe webhook
  fastify.post('/webhooks/stripe', async (request, reply) => {
    const body = request.body as any;
    const signature = request.headers['stripe-signature'] as string;

    // TODO: PRODUCTION - Enable webhook signature verification
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // try {
    //   const event = stripe.webhooks.constructEvent(
    //     request.rawBody,
    //     signature,
    //     process.env.STRIPE_WEBHOOK_SECRET
    //   );
    // } catch (err) {
    //   return reply.status(400).send({ error: 'Invalid signature' });
    // }

    // WARNING: Webhook signature verification is DISABLED for development
    // MUST be enabled before production deployment to prevent fraud

    try {
      if (body.type === 'checkout.session.completed') {
        await paymentService.updatePaymentStatus(
          body.data.object.payment_link,
          'stripe',
          'completed',
          body.data.object
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[Stripe Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // PayPal webhook
  fastify.post('/webhooks/paypal', async (request, reply) => {
    const body = request.body as any;

    try {
      if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
        await paymentService.updatePaymentStatus(
          body.resource.id,
          'paypal',
          'completed',
          body.resource
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[PayPal Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Adyen webhook
  fastify.post('/webhooks/adyen', async (request, reply) => {
    const body = request.body as any;

    try {
      if (body.eventCode === 'AUTHORISATION' && body.success === 'true') {
        await paymentService.updatePaymentStatus(
          body.merchantReference,
          'adyen',
          'completed',
          body
        );
      }

      return reply.send({ notificationResponse: '[accepted]' });
    } catch (error: any) {
      console.error('[Adyen Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Klarna webhook
  fastify.post('/webhooks/klarna', async (request, reply) => {
    const body = request.body as any;

    try {
      if (body.event_type === 'ORDER_COMPLETED') {
        await paymentService.updatePaymentStatus(
          body.order_id,
          'klarna',
          'completed',
          body
        );
      }

      return reply.send({ status: 'ok' });
    } catch (error: any) {
      console.error('[Klarna Webhook] Error:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

export default paymentsRoutes;

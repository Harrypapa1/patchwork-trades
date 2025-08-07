// netlify/functions/stripe-webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify the webhook signature (if webhook secret is configured)
    if (endpointSecret) {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    } else {
      // Parse without verification (for development)
      stripeEvent = JSON.parse(event.body);
      console.log('⚠️ Webhook signature verification skipped - no STRIPE_WEBHOOK_SECRET');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', stripeEvent.data.object.id);
        console.log('Metadata:', stripeEvent.data.object.metadata);
        // TODO: Update database when firebase-admin is added
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', stripeEvent.data.object.id);
        console.log('Failure reason:', stripeEvent.data.object.last_payment_error?.message);
        // TODO: Update database when firebase-admin is added
        break;
      
      case 'payment_intent.canceled':
        console.log('🚫 Payment canceled:', stripeEvent.data.object.id);
        // TODO: Update database when firebase-admin is added
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        received: true,
        event_type: stripeEvent.type,
        message: 'Event logged successfully'
      }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// netlify/functions/stripe-webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin (server-side)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

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
    // Verify the webhook signature
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
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
        await handlePaymentSuccess(stripeEvent.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(stripeEvent.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Handle successful payment
async function handlePaymentSuccess(paymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);
  
  const { quote_request_id, customer_id, tradesman_id } = paymentIntent.metadata;
  
  if (!quote_request_id) {
    console.error('No quote_request_id in payment metadata');
    return;
  }

  try {
    // Get the quote request
    const quoteDoc = await db.collection('quote_requests').doc(quote_request_id).get();
    
    if (!quoteDoc.exists) {
      console.error('Quote request not found:', quote_request_id);
      return;
    }

    const quoteData = quoteDoc.data();

    // Create active job
    const activeJobData = {
      customer_id: customer_id,
      tradesman_id: tradesman_id,
      quote_request_id: quote_request_id,
      job_title: quoteData.job_title,
      job_description: quoteData.job_description,
      job_category: quoteData.job_category,
      agreed_price: paymentIntent.amount / 100, // Convert from cents
      job_date: quoteData.preferred_date,
      job_time: quoteData.preferred_time,
      location: quoteData.location,
      status: 'accepted',
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      tradesman_name: quoteData.tradesman_name,
      customer_name: quoteData.customer_name,
      customer_email: quoteData.customer_email,
      tradesman_email: quoteData.tradesman_email,
      images: quoteData.images || [],
      platform_fee: (paymentIntent.amount / 100) * 0.05, // 5% platform fee
      tradesman_payout: (paymentIntent.amount / 100) * 0.95, // 95% to tradesman
    };

    // Add to active_jobs collection
    await db.collection('active_jobs').add(activeJobData);

    // Update quote request status
    await db.collection('quote_requests').doc(quote_request_id).update({
      status: 'accepted_and_paid',
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Successfully created active job for payment:', paymentIntent.id);

    // TODO: Send confirmation emails to customer and tradesman
    // You can add email sending logic here using your preferred service

  } catch (error) {
    console.error('Error creating active job:', error);
    throw error;
  }
}

// Handle failed payment
async function handlePaymentFailure(paymentIntent) {
  console.log('Payment failed:', paymentIntent.id);
  
  const { quote_request_id } = paymentIntent.metadata;
  
  if (!quote_request_id) {
    console.error('No quote_request_id in payment metadata');
    return;
  }

  try {
    // Update quote request to reflect payment failure
    await db.collection('quote_requests').doc(quote_request_id).update({
      payment_status: 'failed',
      payment_failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Updated quote request with payment failure:', quote_request_id);

    // TODO: Send failure notification email to customer
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}

// Handle canceled payment
async function handlePaymentCanceled(paymentIntent) {
  console.log('Payment canceled:', paymentIntent.id);
  
  const { quote_request_id } = paymentIntent.metadata;
  
  if (!quote_request_id) {
    console.error('No quote_request_id in payment metadata');
    return;
  }

  try {
    // Update quote request to reflect cancellation
    await db.collection('quote_requests').doc(quote_request_id).update({
      payment_status: 'canceled',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Updated quote request with payment cancellation:', quote_request_id);
    
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
    throw error;
  }
}

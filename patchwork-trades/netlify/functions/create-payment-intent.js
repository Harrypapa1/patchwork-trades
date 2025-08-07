const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const { amount, currency = 'gbp', quoteId, customerId } = JSON.parse(event.body);
    
    // Validate required fields
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid amount is required' }),
      };
    }
    
    if (!quoteId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Quote ID is required' }),
      };
    }
    
    // Fetch quote data from Firebase
    console.log('Fetching quote data for ID:', quoteId);
    const quoteDoc = await db.collection('quote_requests').doc(quoteId).get();
    
    if (!quoteDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Quote request not found' }),
      };
    }
    
    const quoteData = quoteDoc.data();
    console.log('Quote data retrieved:', quoteData);
    
    // Create payment intent with complete metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert pounds to pence
      currency: currency.toLowerCase(),
      metadata: {
        quote_request_id: quoteId,
        customer_id: customerId || quoteData.customer_id,
        tradesman_id: quoteData.tradesman_id,
        tradesman_name: quoteData.tradesman_name,
        customer_name: quoteData.customer_name,
        tradesman_email: quoteData.tradesman_email,
        customer_email: quoteData.customer_email,
        job_description: quoteData.job_title || quoteData.job_description || 'Job',
        final_price: `£${amount}`,
        platform: 'patchwork-trades',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log('Payment intent created with metadata:', paymentIntent.metadata);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
    };
    
  } catch (error) {
    console.error('Payment intent creation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Payment intent creation failed',
        message: error.message,
      }),
    };
  }
};

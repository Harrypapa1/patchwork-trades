const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const { 
      amount, 
      currency = 'gbp', 
      quoteId, 
      customerId,
      tradesmanId,
      tradesmanName,
      customerName,
      tradesmanEmail,
      customerEmail,
      jobDescription
    } = JSON.parse(event.body);
    
    // Validate required fields
    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid amount is required' }),
      };
    }
    
    if (!quoteId || !customerId || !tradesmanId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Quote ID, customer ID, and tradesman ID are required' }),
      };
    }
    
    // Create payment intent with minimal metadata for webhook
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert pounds to pence
      currency: currency.toLowerCase(),
      metadata: {
        quote_request_id: quoteId,
        customer_id: customerId,
        tradesman_id: tradesmanId,
        tradesman_name: tradesmanName || '',
        customer_name: customerName || '',
        tradesman_email: tradesmanEmail || '',
        customer_email: customerEmail || '',
        job_description: jobDescription || 'Job',
        final_price: amount.toString(),
        platform: 'patchwork-trades',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log('Payment intent created:', paymentIntent.id);
    
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

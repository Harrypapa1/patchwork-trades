const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
        
        // Create active job from payment metadata
        const paymentIntent = stripeEvent.data.object;
        const metadata = paymentIntent.metadata;
        
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const jobData = {
          id: jobId,
          quote_request_id: metadata.quote_request_id,
          customer_id: metadata.customer_id,
          tradesman_id: metadata.tradesman_id,
          tradesman_name: metadata.tradesman_name,
          customer_name: metadata.customer_name,
          tradesman_email: metadata.tradesman_email,
          customer_email: metadata.customer_email,
          job_title: metadata.job_description,
          final_price: metadata.final_price,
          payment_intent_id: paymentIntent.id,
          status: 'active',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        };

        // Add to active_jobs collection
        await setDoc(doc(db, 'active_jobs', jobId), jobData);
        console.log('Active job created:', jobId);

        // Update quote request status
        await updateDoc(doc(db, 'quote_requests', metadata.quote_request_id), {
          status: 'paid',
          active_job_id: jobId,
          payment_completed_at: serverTimestamp()
        });
        console.log('Quote updated to paid status');
        
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', stripeEvent.data.object.id);
        console.log('Failure reason:', stripeEvent.data.object.last_payment_error?.message);
        break;
      
      case 'payment_intent.canceled':
        console.log('🚫 Payment canceled:', stripeEvent.data.object.id);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        received: true,
        event_type: stripeEvent.type,
        message: 'Event processed successfully'
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

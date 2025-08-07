import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// TEMPORARY FIX: Hardcode publishable key until Netlify env var issue is resolved
const stripePromise = loadStripe('pk_live_51Rt5T45yl11NCnnE6m2GaEvtqUXXhz0fRLA1ZpaF1VOlgTrMze0MlM3dD7iBmZyz0pxNmkIXwQMHeA0VRzC7EzVj00smdZhrMd');

// Alternative: Keep original line commented for reference
// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ amount, quoteId, customerId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet.');
      setIsLoading(false);
      return;
    }

    const card = elements.getElement(CardElement);

    try {
      // Create payment intent
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'gbp',
          quoteId,
          customerId,
        }),
      });

      const { clientSecret, error: serverError } = await response.json();

      if (serverError) {
        throw new Error(serverError);
      }

      // Confirm payment
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' },
            },
          },
        }}
      />
      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: isLoading ? '#ccc' : '#007cba',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Processing...' : `Pay £${amount}`}
      </button>
    </form>
  );
};

const PaymentCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get payment data from navigation state
  const { quoteId, quoteData, finalPrice } = location.state || {};
  
  // Extract numeric amount from finalPrice
  const extractAmount = (priceString) => {
    if (!priceString) return 0;
    const match = String(priceString).match(/£?(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  const amount = extractAmount(finalPrice);
  
  const handlePaymentSuccess = (paymentIntent) => {
    // Navigate to success page with job details
    navigate('/payment-success', {
      state: {
        jobId: quoteId,
        job: quoteData,
        paymentAmount: amount,
        paymentIntent: paymentIntent
      }
    });
  };
  
  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    // Could show error message or redirect
  };
  
  if (!quoteData || !amount) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Payment Information Missing</h2>
          <p className="text-red-700 mb-4">Unable to find payment details. Please try again.</p>
          <button
            onClick={() => navigate('/quote-requests')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Quote Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Complete Payment</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-2">{quoteData.job_title}</h2>
        <p className="text-gray-600 mb-4">Amount: £{amount}</p>
        
        <Elements stripe={stripePromise}>
          <CheckoutForm
            amount={amount}
            quoteId={quoteId}
            customerId={quoteData.customer_id}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </Elements>
      </div>
    </div>
  );
};

export default PaymentCheckout;

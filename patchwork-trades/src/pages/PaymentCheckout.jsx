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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Element with better styling */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1f2937',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  '::placeholder': { 
                    color: '#9ca3af' 
                  },
                  iconColor: '#6b7280',
                },
                invalid: {
                  color: '#ef4444',
                  iconColor: '#ef4444',
                }
              },
              hidePostalCode: false,
            }}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <span className="text-red-400 mr-2">⚠️</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Payment button */}
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
          isLoading || !stripe
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </div>
        ) : (
          `💳 Pay £${amount} Securely`
        )}
      </button>

      {/* Security badges */}
      <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
        <span className="flex items-center">
          🔒 SSL Encrypted
        </span>
        <span className="flex items-center">
          🛡️ Stripe Secure
        </span>
        <span className="flex items-center">
          ✅ PCI Compliant
        </span>
      </div>
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
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
        <p className="text-gray-600">Secure checkout powered by Stripe</p>
      </div>

      {/* Job Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{quoteData.job_title}</h2>
        <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
          <span>Tradesman: {quoteData.tradesman_name}</span>
          <span>Quote ID: {quoteId.slice(-8).toUpperCase()}</span>
        </div>
        <div className="border-t border-blue-200 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-900">Total Amount:</span>
            <span className="text-2xl font-bold text-green-600">£{amount}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
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

      {/* Trust indicators */}
      <div className="text-center mt-6 text-xs text-gray-500">
        <p>Your payment information is secure and encrypted</p>
        <p>Powered by Stripe • Used by millions worldwide</p>
      </div>
    </div>
  );
};

export default PaymentCheckout;

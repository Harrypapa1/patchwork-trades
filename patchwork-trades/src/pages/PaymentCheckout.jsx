import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Payment Form Component
const CheckoutForm = ({ amount, quoteData, quoteId, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to pence
          currency: 'gbp',
          metadata: {
            quoteId: quoteId,
            jobTitle: quoteData.job_title,
            tradesmanId: quoteData.tradesman_id,
            customerId: quoteData.customer_id
          }
        }),
      });

      const { clientSecret, error: serverError } = await response.json();
      
      if (serverError) {
        throw new Error(serverError);
      }

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: quoteData.customer_name,
            email: quoteData.customer_email,
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Payment successful
      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment successful!', paymentIntent);
        onPaymentSuccess(paymentIntent);
      }

    } catch (error) {
      console.error('❌ Payment failed:', error);
      setError(error.message || 'Payment failed. Please try again.');
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

// Main PaymentCheckout Component
const PaymentCheckout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Get data from QuoteRequests navigation
  const { jobId, job, paymentAmount, finalPrice, paymentRequired } = location.state || {};

  // Handle missing data
  if (!job || !jobId) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information Not Found</h2>
          <p className="text-gray-600 mb-4">We couldn't find the payment details for this job.</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/quote-requests')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full"
            >
              Return to Quote Requests
            </button>
            <button
              onClick={() => navigate('/active-jobs')}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 w-full"
            >
              View Active Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle successful payment
  const handlePaymentSuccess = (paymentIntent) => {
    console.log('🎉 Payment successful, navigating to success page...');
    
    // Navigate to PaymentSuccess with all required data
    navigate('/payment-success', {
      state: {
        jobId: jobId,           // Same as received
        job: job,              // Same as received
        paymentAmount: paymentAmount, // Same as received
        paymentIntent: paymentIntent  // Add payment intent from Stripe
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
        <p className="text-gray-600">Secure checkout powered by Stripe</p>
      </div>

      {/* Job Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{job.job_title}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
          <div>
            <span className="font-medium">Tradesman:</span> {job.tradesman_name}
          </div>
          <div>
            <span className="font-medium">Quote ID:</span> {jobId.slice(-8).toUpperCase()}
          </div>
        </div>
        
        {/* Job description */}
        <div className="mb-4">
          <p className="text-gray-700 text-sm">{job.job_description}</p>
        </div>

        {/* Pricing breakdown */}
        <div className="border-t border-blue-200 pt-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Service:</span>
            <span>{finalPrice}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Platform fee:</span>
            <span>£0.00 (Promotional)</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-lg font-medium text-gray-900">Total Amount:</span>
            <span className="text-2xl font-bold text-green-600">£{paymentAmount}</span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
        <Elements stripe={stripePromise}>
          <CheckoutForm
            amount={paymentAmount}
            quoteData={job}
            quoteId={jobId}
            onPaymentSuccess={handlePaymentSuccess}
          />
        </Elements>
      </div>

      {/* Trust indicators */}
      <div className="text-center mt-6 text-xs text-gray-500 space-y-1">
        <p>Your payment information is secure and encrypted</p>
        <p>Powered by Stripe • Used by millions worldwide</p>
        <p>Money-back guarantee if you're not satisfied</p>
      </div>

      {/* Back button */}
      <div className="text-center mt-6">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 text-sm underline"
        >
          ← Back to Quote Request
        </button>
      </div>
    </div>
  );
};

export default PaymentCheckout;

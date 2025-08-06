import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc,
  addDoc,
  collection,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// TEMPORARY: Hardcoded key for testing (replace with env variable later)
const stripePromise = loadStripe('pk_test_51Bt5TL992gNc5EB8p9VlI2MeFFSMvJlinCSmQwch8bPvqQHQYEPVRlMTXZ29kLF2y2wlk6L40xJu4NIhCDJtAY2fI00e0pnnXQd');

const PaymentForm = ({ job, isQuotePayment, jobId, quoteId }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    address: '',
    city: '',
    postcode: ''
  });

  const handleInputChange = (e) => {
    setBillingDetails({
      ...billingDetails,
      [e.target.name]: e.target.value
    });
  };

  const calculateFees = () => {
    const priceString = job.final_price || job.customer_counter_quote || job.custom_quote || '200';
    const match = priceString.toString().match(/(\d+)/);
    const subtotal = match ? parseInt(match[1]) : 200;
    const platformFee = 0;
    const processingFee = Math.round(subtotal * 0.029 + 30/100);
    const total = subtotal + platformFee + processingFee;
    
    return { subtotal, platformFee, processingFee, total };
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { total } = calculateFees();

      // Create payment intent
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: total,
          currency: 'gbp',
          quoteId: quoteId || null,
          customerId: currentUser.uid
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Function response:', errorText);
        throw new Error(`Failed to create payment intent: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Payment intent response:', responseData);
      const { clientSecret } = responseData;
      
      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: billingDetails.name,
            address: {
              line1: billingDetails.address,
              city: billingDetails.city,
              postal_code: billingDetails.postcode,
              country: 'GB',
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        if (isQuotePayment) {
          // Convert quote to active job
          const quoteData = job.quoteData;
          
          const activeJobData = {
            quote_request_id: quoteId,
            customer_id: quoteData.customer_id,
            customer_name: quoteData.customer_name,
            customer_email: quoteData.customer_email,
            customer_photo: quoteData.customer_photo,
            tradesman_id: quoteData.tradesman_id,
            tradesman_name: quoteData.tradesman_name,
            tradesman_email: quoteData.tradesman_email,
            tradesman_photo: quoteData.tradesman_photo,
            job_title: quoteData.job_title,
            job_description: quoteData.job_description,
            job_images: quoteData.job_images || [],
            additional_notes: quoteData.additional_notes,
            agreed_date: quoteData.selected_time_slot?.date,
            time_slot: quoteData.selected_time_slot?.slot_id,
            agreed_time_start: quoteData.selected_time_slot?.start_time,
            agreed_time_end: quoteData.selected_time_slot?.end_time,
            final_price: quoteData.final_agreed_price,
            status: 'accepted',
            payment_status: 'completed',
            payment_amount: total,
            payment_intent_id: paymentIntent.id,
            payment_method: 'card',
            payment_processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const newJobRef = await addDoc(collection(db, 'active_jobs'), activeJobData);
          await deleteDoc(doc(db, 'quote_requests', quoteId));

          navigate('/payment-success', { 
            state: { 
              jobId: newJobRef.id,
              job: activeJobData,
              paymentAmount: total,
              convertedFromQuote: true
            }
          });

        } else {
          // Regular job payment
          await updateDoc(doc(db, 'active_jobs', jobId), {
            payment_status: 'completed',
            payment_amount: total,
            payment_intent_id: paymentIntent.id,
            payment_method: 'card',
            payment_processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          navigate('/payment-success', { 
            state: { 
              jobId: jobId,
              job: job,
              paymentAmount: total
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const { subtotal, platformFee, processingFee, total } = calculateFees();

  return (
    <form onSubmit={handlePayment} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Details *
        </label>
        <div className="border border-gray-300 rounded-md p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cardholder Name *
        </label>
        <input
          type="text"
          name="name"
          value={billingDetails.name}
          onChange={handleInputChange}
          placeholder="John Smith"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Billing Address *
        </label>
        <input
          type="text"
          name="address"
          value={billingDetails.address}
          onChange={handleInputChange}
          placeholder="123 Main Street"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={billingDetails.city}
            onChange={handleInputChange}
            placeholder="London"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postcode *
          </label>
          <input
            type="text"
            name="postcode"
            value={billingDetails.postcode}
            onChange={handleInputChange}
            placeholder="SW1A 1AA"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium text-lg transition-colors"
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            `Pay £${total} Now`
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center text-sm text-gray-500">
        <span className="text-green-600 mr-2">🔒</span>
        Your payment is secured by Stripe and 256-bit SSL encryption
      </div>
    </form>
  );
};

const PaymentCheckout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const jobId = new URLSearchParams(location.search).get('jobId') || location.state?.jobId;
  const quoteId = new URLSearchParams(location.search).get('quoteId') || location.state?.quoteId;
  const quoteData = location.state?.quoteData;
  const isQuotePayment = !!quoteId && !!quoteData;

  useEffect(() => {
    if (isQuotePayment) {
      setJob({
        id: quoteId,
        job_title: quoteData.job_title,
        job_description: quoteData.job_description,
        tradesman_name: quoteData.tradesman_name,
        customer_name: quoteData.customer_name,
        final_price: quoteData.final_agreed_price,
        agreed_date: quoteData.selected_time_slot?.date,
        time_slot: quoteData.selected_time_slot?.label,
        status: 'payment_pending',
        created_at: quoteData.created_at,
        quoteData: quoteData
      });
      setLoading(false);
    } else if (jobId) {
      fetchJobDetails();
    } else {
      setLoading(false);
    }
  }, [jobId, quoteId, isQuotePayment]);

  const fetchJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'active_jobs', jobId));
      if (jobDoc.exists()) {
        setJob({ id: jobDoc.id, ...jobDoc.data() });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-8">Loading payment details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {isQuotePayment ? 'Quote Not Found' : 'Job Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isQuotePayment 
              ? 'The quote you\'re trying to pay for could not be found.'
              : 'The job you\'re trying to pay for could not be found.'
            }
          </p>
          <button
            onClick={() => navigate(isQuotePayment ? '/quote-requests' : '/active-jobs')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            {isQuotePayment ? 'Back to Quote Requests' : 'Back to Active Jobs'}
          </button>
        </div>
      </div>
    );
  }

  const priceString = job.final_price || job.customer_counter_quote || job.custom_quote || '200';
  const match = priceString.toString().match(/(\d+)/);
  const subtotal = match ? parseInt(match[1]) : 200;
  const platformFee = 0;
  const processingFee = Math.round(subtotal * 0.029 + 30/100);
  const total = subtotal + platformFee + processingFee;

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Complete Payment</h1>
        
        {isQuotePayment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-blue-800 mb-2">
              <span className="text-lg mr-2">💳</span>
              <span className="font-semibold">Quote Payment</span>
            </div>
            <p className="text-blue-700 text-sm">
              After payment, this quote will be converted to an active job and you'll be able to track progress.
            </p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            <PaymentForm 
              job={job}
              isQuotePayment={isQuotePayment}
              jobId={jobId}
              quoteId={quoteId}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-2">{job.job_title}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Tradesman:</strong> {job.tradesman_name}</p>
                <p><strong>Date:</strong> {job.agreed_date ? 
                  new Date(job.agreed_date).toLocaleDateString('en-GB') : 
                  'To be arranged'
                }</p>
                {job.time_slot && (
                  <p><strong>Time:</strong> {job.time_slot}</p>
                )}
                <p><strong>Status:</strong>
                  <span className="ml-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                    {isQuotePayment ? 'Quote Payment' : 
                     job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Job Price</span>
                <span>£{subtotal}</span>
              </div>
              
              <div className="flex justify-between text-gray-700">
                <span>Platform Fee</span>
                <span className="text-green-600 font-medium">FREE!</span>
              </div>
              
              <div className="flex justify-between text-gray-700">
                <span>Payment Processing</span>
                <span>£{(processingFee/100).toFixed(2)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-semibold text-gray-900">
                  <span>Total</span>
                  <span>£{total}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center text-green-800 mb-2">
                <span className="text-lg mr-2">🎉</span>
                <span className="font-semibold">Launch Promotion</span>
              </div>
              <p className="text-green-700 text-sm">
                0% platform fees during our launch period.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(isQuotePayment ? '/quote-requests' : '/active-jobs')}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            Cancel and return to {isQuotePayment ? 'quotes' : 'jobs'}
          </button>
        </div>
      </div>
    </Elements>
  );
};

export default PaymentCheckout;

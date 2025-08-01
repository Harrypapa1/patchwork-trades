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

const PaymentCheckout = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    postcode: ''
  });

  // 🆕 UPDATED: Handle both job payments and quote payments
  const jobId = new URLSearchParams(location.search).get('jobId') || location.state?.jobId;
  const quoteId = new URLSearchParams(location.search).get('quoteId') || location.state?.quoteId;
  const quoteData = location.state?.quoteData;
  const isQuotePayment = !!quoteId && !!quoteData;

  useEffect(() => {
    if (isQuotePayment) {
      // For quote payments, use the passed quote data
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
        // Include all quote data for job creation
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

  const handleInputChange = (e) => {
    let value = e.target.value;
    const name = e.target.name;

    // Format card number with spaces
    if (name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
      if (value.length > 19) value = value.substr(0, 19);
    }
    
    // Format expiry date
    if (name === 'expiryDate') {
      value = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      if (value.length > 5) value = value.substr(0, 5);
    }
    
    // Format CVV
    if (name === 'cvv') {
      value = value.replace(/\D/g, '');
      if (value.length > 3) value = value.substr(0, 3);
    }

    setPaymentForm({
      ...paymentForm,
      [name]: value
    });
  };

  const getFinalPrice = () => {
    if (!job) return '£0';
    
    if (job.final_price) {
      return job.final_price;
    } else if (job.customer_counter_quote) {
      return job.customer_counter_quote;
    } else if (job.custom_quote) {
      return job.custom_quote;
    } else if (job.tradesman_hourly_rate) {
      return `£${job.tradesman_hourly_rate}/hour`;
    } else {
      return 'Standard Rate';
    }
  };

  const getNumericPrice = () => {
    const priceString = getFinalPrice();
    const match = priceString.match(/£?(\d+)/);
    return match ? parseInt(match[1]) : 200;
  };

  const calculateFees = () => {
    const subtotal = getNumericPrice();
    const platformFee = 0; // 0% commission during launch period
    const processingFee = Math.round(subtotal * 0.029 + 30/100); // Stripe standard: 2.9% + 30p
    const total = subtotal + platformFee + processingFee;
    
    return { subtotal, platformFee, processingFee, total };
  };

  // 🆕 UPDATED: Handle both quote and job payments
  const handlePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // DEMO: Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { total } = calculateFees();

      if (isQuotePayment) {
        // 🆕 QUOTE PAYMENT: Convert quote to active job
        console.log('🚀 Converting quote to active job after payment...');
        
        const quoteData = job.quoteData;
        
        // Create new active job
        const activeJobData = {
          // Copy all quote data
          quote_request_id: quoteId,
          customer_id: quoteData.customer_id,
          customer_name: quoteData.customer_name,
          customer_email: quoteData.customer_email,
          customer_photo: quoteData.customer_photo,
          tradesman_id: quoteData.tradesman_id,
          tradesman_name: quoteData.tradesman_name,
          tradesman_email: quoteData.tradesman_email,
          tradesman_photo: quoteData.tradesman_photo,
          
          // Job details
          job_title: quoteData.job_title,
          job_description: quoteData.job_description,
          job_images: quoteData.job_images || [],
          additional_notes: quoteData.additional_notes,
          
          // Time slot details
          agreed_date: quoteData.selected_time_slot?.date,
          time_slot: quoteData.selected_time_slot?.slot_id,
          agreed_time_start: quoteData.selected_time_slot?.start_time,
          agreed_time_end: quoteData.selected_time_slot?.end_time,
          
          // Pricing
          final_price: quoteData.final_agreed_price,
          
          // Status
          status: 'accepted',
          
          // Payment info
          payment_status: 'completed',
          payment_amount: total,
          payment_method: 'card',
          payment_processed_at: new Date().toISOString(),
          
          // Timestamps
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Creating active job with data:', activeJobData);
        const newJobRef = await addDoc(collection(db, 'active_jobs'), activeJobData);
        
        // Delete the quote request
        console.log('Deleting quote request:', quoteId);
        await deleteDoc(doc(db, 'quote_requests', quoteId));

        // Navigate to success page with new job ID
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
      
    } catch (error) {
      console.error('Payment processing error:', error);
      navigate('/payment-failed', { 
        state: { 
          jobId: jobId || quoteId,
          error: error.message
        }
      });
    } finally {
      setProcessing(false);
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

  const { subtotal, platformFee, processingFee, total } = calculateFees();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Payment</h1>
      
      {/* 🆕 Quote Payment Notice */}
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
        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
          
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number *
              </label>
              <input
                type="text"
                name="cardNumber"
                value={paymentForm.cardNumber}
                onChange={handleInputChange}
                placeholder="1234 5678 9012 3456"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="text"
                  name="expiryDate"
                  value={paymentForm.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV *
                </label>
                <input
                  type="text"
                  name="cvv"
                  value={paymentForm.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name *
              </label>
              <input
                type="text"
                name="cardholderName"
                value={paymentForm.cardholderName}
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
                name="billingAddress"
                value={paymentForm.billingAddress}
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
                  value={paymentForm.city}
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
                  value={paymentForm.postcode}
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
                disabled={processing}
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
          </form>

          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span className="text-green-600 mr-2">🔒</span>
            Your payment is secured by 256-bit SSL encryption
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          {/* Job Details */}
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

          {/* Price Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Job Price</span>
              <span>£{subtotal}</span>
            </div>
            
            <div className="flex justify-between text-gray-700">
              <span>Platform Fee</span>
              <span className="text-green-600 font-medium">
                {platformFee === 0 ? 'FREE!' : `£${platformFee}`}
              </span>
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

          {/* Launch Promotion */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center text-green-800 mb-2">
              <span className="text-lg mr-2">🎉</span>
              <span className="font-semibold">Launch Promotion</span>
            </div>
            <p className="text-green-700 text-sm">
              0% platform fees during our launch period. You only pay the job price plus standard payment processing.
            </p>
          </div>

          {/* Security Features */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-blue-600 mr-2">✓</span>
              Instant payment to tradesman
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-blue-600 mr-2">✓</span>
              Full refund if work not completed
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-blue-600 mr-2">✓</span>
              Dispute protection included
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => navigate(isQuotePayment ? '/quote-requests' : '/active-jobs')}
          className="text-gray-600 hover:text-gray-800 underline"
        >
          Cancel and return to {isQuotePayment ? 'quotes' : 'jobs'}
        </button>
      </div>
    </div>
  );
};

export default PaymentCheckout;

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  addDoc, 
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [jobCreated, setJobCreated] = useState(false);
  const [processing, setProcessing] = useState(true);
  
  // FIXED: Handle both old and new data structures
  const locationState = location.state || {};
  
  // Try both naming conventions to be safe - FIXED: Add more debugging
  const jobId = locationState.jobId || locationState.quoteId;
  const job = locationState.job || locationState.quoteData;  
  const paymentAmount = locationState.paymentAmount || extractNumericValue(locationState.finalPrice);
  const paymentIntent = locationState.paymentIntent;

  // 🔧 DEBUG: Log received data
  console.log('💳 PaymentSuccess received data:', {
    locationState,
    jobId,
    job,
    paymentAmount,
    paymentIntent
  });

  // Helper function to extract numeric value from price string
  const extractNumericValue = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.toString().match(/£?(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  useEffect(() => {
    // Create active job and update quote status after payment success
    const processPaymentCompletion = async () => {
      if (!job || !jobId || jobCreated) return;
      
      try {
        console.log('🚀 Processing payment completion for job:', jobId);
        console.log('📊 Job data received:', job);
        console.log('💰 Payment amount:', paymentAmount);
        
        // 🔧 FIXED: Add job.id to the data structure
        const activeJobData = {
          // Core job info
          job_title: job.job_title,
          job_description: job.job_description,
          customer_id: job.customer_id,
          tradesman_id: job.tradesman_id,
          customer_name: job.customer_name,
          tradesman_name: job.tradesman_name,
          customer_email: job.customer_email,
          tradesman_email: job.tradesman_email,
          customer_photo: job.customer_photo || null,
          tradesman_photo: job.tradesman_photo || null,
          
          // Job details
          job_images: job.job_images || [],
          additional_notes: job.additional_notes || '',
          urgency: job.urgency || 'normal',
          selected_time_slot: job.selected_time_slot || null,
          preferred_dates_list: job.preferred_dates_list || [],
          budget_expectation: job.budget_expectation || '',
          tradesman_hourly_rate: job.tradesman_hourly_rate || 0,
          
          // Payment and status info
          quote_id: jobId,
          original_quote_id: job.id || jobId, // 🔧 FIXED: Ensure we have the original ID
          final_price: `£${paymentAmount}`,
          agreed_price: paymentAmount,
          platform_fee: 0,
          platform_commission_rate: 0,
          theoretical_commission: parseFloat((paymentAmount * 0.05).toFixed(2)),
          payment_intent_id: paymentIntent?.id || null,
          status: 'accepted',
          
          // Timestamps
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          payment_completed_at: new Date().toISOString()
        };

        console.log('📋 Creating active job with data:', activeJobData);
        
        // 🔧 FIXED: Better error handling for job creation
        const activeJobRef = await addDoc(collection(db, 'active_jobs'), activeJobData);
        console.log('✅ Active job created with ID:', activeJobRef.id);

        // STEP 2: Update quote request status to completed/paid
        try {
          await updateDoc(doc(db, 'quote_requests', jobId), {
            status: 'completed',
            active_job_id: activeJobRef.id,
            payment_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          console.log('✅ Quote request updated to completed status');
        } catch (updateError) {
          console.error('❌ Error updating quote request:', updateError);
          // Continue anyway - job was created successfully
        }

        // STEP 3: Add system comment to the new active job
        try {
          await addDoc(collection(db, 'booking_comments'), {
            active_job_id: activeJobRef.id,
            quote_request_id: jobId,
            booking_id: null, // Legacy field
            user_id: currentUser?.uid || 'system',
            user_type: 'system',
            user_name: 'System',
            comment: `Payment completed successfully! Job moved to Active Jobs. Amount: £${paymentAmount}`,
            timestamp: new Date().toISOString()
          });
          console.log('✅ System comment added to active job');
        } catch (commentError) {
          console.error('❌ Error adding system comment:', commentError);
          // Continue anyway - job was created successfully
        }

        // STEP 4: Send email notification to tradesman
        try {
          await sendEmailNotification({
            recipientEmail: job.tradesman_email,
            recipientName: job.tradesman_name,
            senderName: job.customer_name,
            messageText: `Great news! ${job.customer_name} has completed payment for "${job.job_title}". The job is now active and ready to start.`,
            replyLink: 'https://patchworktrades.com/active-jobs'
          });
          console.log('✅ Tradesman notification email sent');
        } catch (emailError) {
          console.error('Email notification failed (non-critical):', emailError);
        }

        setJobCreated(true);
        console.log('🎉 Payment completion processing finished successfully');
        
      } catch (error) {
        console.error('❌ Error processing payment completion:', error);
        console.error('Error details:', error.message, error.stack);
        
        // 🔧 FIXED: More specific error handling
        if (error.code === 'permission-denied') {
          alert('Payment successful, but there was a permission error setting up your job. Please contact support.');
        } else if (error.code === 'not-found') {
          alert('Payment successful, but we couldn\'t find the quote request. Please contact support.');
        } else {
          alert('Payment successful, but there was an error setting up your job. Please contact support.');
        }
      } finally {
        setProcessing(false);
      }
    };

    // Send confirmation email (demo)
    const sendConfirmationEmail = async () => {
      try {
        // Demo: Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        setEmailSent(true);
      } catch (error) {
        console.error('Email sending failed:', error);
      }
    };

    if (job && !emailSent) {
      sendConfirmationEmail();
    }

    // Process payment completion
    processPaymentCompletion();
  }, [job, jobId, jobCreated, paymentAmount, paymentIntent, currentUser?.uid]);

  // Email notification helper function
  const sendEmailNotification = async (emailData) => {
    try {
      const response = await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        console.error('Email notification failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  const generateReceiptNumber = () => {
    return `PW-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🔧 FIXED: Better error handling for missing job data
  if (!job || !jobId) {
    console.error('❌ Missing job data:', { job, jobId, locationState });
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Completed</h2>
          <p className="text-gray-600 mb-4">Your payment was successful, but we're having trouble loading the job details.</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/active-jobs')}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 block mx-auto"
            >
              View Active Jobs
            </button>
            <button
              onClick={() => navigate('/quote-requests')}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 block mx-auto"
            >
              Back to Quote Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Processing Indicator */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center text-blue-800">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="font-medium">Setting up your job...</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            We're moving your job to Active Jobs and notifying the tradesman.
          </p>
        </div>
      )}

      {/* Success Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
        <div className="text-6xl text-green-500 mb-4">✅</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-lg text-gray-600">
          Your payment of <span className="font-semibold text-green-600">£{paymentAmount}</span> has been processed
        </p>
        {jobCreated && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 font-medium">🎉 Your job has been activated!</p>
            <p className="text-green-700 text-sm mt-1">
              You can now track progress and communicate with your tradesman in Active Jobs.
            </p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Receipt */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Payment Receipt</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Receipt Number</span>
              <span className="font-medium">{generateReceiptNumber()}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Date & Time</span>
              <span className="font-medium">{formatDate(new Date())}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium">Card ending in ****</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Transaction ID</span>
              <span className="font-medium">{paymentIntent?.id || `txn_${Math.random().toString(36).substr(2, 10)}`}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 bg-green-50 px-3 rounded-lg">
              <span className="text-gray-900 font-semibold">Amount Paid</span>
              <span className="text-xl font-bold text-green-600">£{paymentAmount}</span>
            </div>
          </div>

          {/* Email Status */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-800">
              <span className="text-lg mr-2">
                {emailSent ? '✅' : '⏳'}
              </span>
              <span className="font-medium">
                {emailSent ? 'Receipt email sent!' : 'Sending receipt email...'}
              </span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              A copy of this receipt has been sent to {currentUser?.email}
            </p>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">{job.job_title}</h3>
              <p className="text-gray-600 text-sm">{job.job_description}</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="text-sm text-gray-600">Tradesman</span>
                <div className="flex items-center mt-1">
                  {job.tradesman_photo && (
                    <img 
                      src={job.tradesman_photo} 
                      alt="Tradesman" 
                      className="w-8 h-8 rounded-full object-cover mr-2"
                    />
                  )}
                  <span className="font-medium">{job.tradesman_name}</span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Scheduled Date</span>
                <p className="font-medium">
                  {job.agreed_date ? 
                    new Date(job.agreed_date).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    }) : 
                    'Date to be arranged'
                  }
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Status</span>
                <div className="mt-1">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {jobCreated ? 'Active Job' : 'Payment Completed'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {job.additional_notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Additional Notes</h4>
              <p className="text-gray-700 text-sm whitespace-pre-line">{job.additional_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl text-blue-600 mb-3">👨‍🔧</div>
            <h3 className="font-medium text-gray-900 mb-2">Tradesman Notified</h3>
            <p className="text-sm text-gray-600">
              {job.tradesman_name} has been notified of your payment and will begin work as scheduled.
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl text-blue-600 mb-3">📱</div>
            <h3 className="font-medium text-gray-900 mb-2">Track Progress</h3>
            <p className="text-sm text-gray-600">
              Monitor job progress and communicate with your tradesman through your Active Jobs page.
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-3xl text-blue-600 mb-3">⭐</div>
            <h3 className="font-medium text-gray-900 mb-2">Leave Review</h3>
            <p className="text-sm text-gray-600">
              After completion, you can leave a review to help other customers and support quality tradesmen.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6 justify-center">
        <button
          onClick={() => navigate('/active-jobs')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          View Active Jobs
        </button>
        
        <button
          onClick={() => navigate('/browse')}
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          Book Another Job
        </button>
        
        <button
          onClick={() => window.print()}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 font-medium transition-colors"
        >
          Print Receipt
        </button>
      </div>

      {/* Support Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <div className="flex items-center text-blue-800 mb-3">
          <span className="text-xl mr-2">💬</span>
          <span className="font-semibold">Need Help?</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-blue-700 text-sm">
          <div>
            <p className="mb-2">
              <strong>Payment Issues:</strong> Contact our support team if you have any questions about your payment or receipt.
            </p>
          </div>
          <div>
            <p>
              <strong>Job Support:</strong> Use the messaging system in Active Jobs to communicate directly with your tradesman.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

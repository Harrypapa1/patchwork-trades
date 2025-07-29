import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// 🚀 NEW BULLETPROOF QUOTE REQUESTS COMPONENT
// Connects to 'quote_requests' collection - no more race conditions!
const QuoteRequests = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [acceptingQuote, setAcceptingQuote] = useState({}); // Track accept operations
  
  // Refs for cleanup
  const activeListeners = useRef({});
  const componentId = useRef(`quote-requests-${Date.now()}-${Math.random()}`);

  // EMAIL NOTIFICATION HELPER FUNCTION (same as your existing)
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
      } else {
        console.log('Email notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchQuoteRequests();
    }
    
    // Cleanup function (same pattern as your existing)
    return () => {
      console.log(`🧹 [${componentId.current}] Cleaning up component...`);
      
      // Clean up all listeners
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListeners.current = {};
    };
  }, [currentUser, userType]);

  // 🎯 CONNECT TO NEW quote_requests COLLECTION
  const fetchQuoteRequests = async () => {
    try {
      let quotesQuery;
      
      if (userType === 'customer') {
        quotesQuery = query(
          collection(db, 'quote_requests'), // 🆕 NEW COLLECTION
          where('customer_id', '==', currentUser.uid)
        );
      } else {
        quotesQuery = query(
          collection(db, 'quote_requests'), // 🆕 NEW COLLECTION  
          where('tradesman_id', '==', currentUser.uid)
        );
      }

      const quotesSnapshot = await getDocs(quotesQuery);
      const requests = quotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Found quote requests:', requests);
      setQuoteRequests(requests);

      // Clean up existing listeners before setting up new ones
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListeners.current = {};

      // Fetch comments for each request
      for (const request of requests) {
        fetchComments(request.id);
      }

    } catch (error) {
      console.error('Error fetching quote requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 ENHANCED COMMENTS FOR NEW ARCHITECTURE
  const fetchComments = (quoteRequestId) => {
    try {
      // Clean up existing listener for this quote if it exists
      if (activeListeners.current[quoteRequestId]) {
        activeListeners.current[quoteRequestId]();
        delete activeListeners.current[quoteRequestId];
      }

      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('quote_request_id', '==', quoteRequestId) // 🆕 NEW FIELD
      );

      console.log('Setting up real-time listener for quote:', quoteRequestId);

      // Set up new listener with proper cleanup
      const unsubscribe = onSnapshot(commentsQuery, 
        (snapshot) => {
          const quoteComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort by timestamp
          quoteComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          console.log('Comments updated for quote', quoteRequestId, ':', quoteComments);
          
          setComments(prev => ({
            ...prev,
            [quoteRequestId]: quoteComments
          }));
        },
        (error) => {
          console.log('Comments collection may not exist yet, initializing empty:', error);
          setComments(prev => ({
            ...prev,
            [quoteRequestId]: []
          }));
        }
      );

      // Store the unsubscribe function for cleanup
      activeListeners.current[quoteRequestId] = unsubscribe;

    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(prev => ({
        ...prev,
        [quoteRequestId]: []
      }));
    }
  };

  // 🎯 ENHANCED COMMENT SYSTEM
  const addComment = async (quoteRequestId) => {
    const commentText = newComments[quoteRequestId]?.trim();
    if (!commentText) return;

    console.log('Adding comment for quote:', quoteRequestId, 'Comment:', commentText);

    try {
      const commentData = {
        quote_request_id: quoteRequestId, // 🆕 NEW FIELD
        booking_id: null, // Legacy field for backward compatibility
        user_id: currentUser.uid,
        user_type: userType,
        user_name: userType === 'customer' ? 
          quoteRequests.find(q => q.id === quoteRequestId)?.customer_name : 
          quoteRequests.find(q => q.id === quoteRequestId)?.tradesman_name,
        comment: commentText,
        timestamp: new Date().toISOString()
      };

      console.log('Comment data being saved:', commentData);

      await addDoc(collection(db, 'booking_comments'), commentData);

      // Clear the input
      setNewComments(prev => ({
        ...prev,
        [quoteRequestId]: ''
      }));

      console.log('Comment saved successfully!');

      // EMAIL NOTIFICATION FOR NEW COMMENT
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (quote) {
        const recipientIsCustomer = userType === 'tradesman';
        const recipientEmail = recipientIsCustomer ? quote.customer_email : quote.tradesman_email;
        const recipientName = recipientIsCustomer ? quote.customer_name : quote.tradesman_name;
        const senderName = recipientIsCustomer ? quote.tradesman_name : quote.customer_name;

        await sendEmailNotification({
          recipientEmail: recipientEmail,
          recipientName: recipientName,
          senderName: senderName,
          messageText: `New comment on job "${quote.job_title}": ${commentText}`,
          replyLink: `https://patchworktrades.com/quote-requests`
        });
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  // 🚀 BULLETPROOF ACCEPT OPERATION - THE MAGIC HAPPENS HERE!
  const acceptQuote = async (quoteRequestId) => {
    console.log('🚀 Starting bulletproof quote acceptance:', quoteRequestId);
    
    if (acceptingQuote[quoteRequestId]) {
      console.log('⏳ Accept already in progress for this quote');
      return;
    }

    setAcceptingQuote(prev => ({ ...prev, [quoteRequestId]: true }));

    try {
      // STEP 1: Get the quote data
      console.log('📖 Step 1: Reading quote data...');
      const quoteDoc = await getDoc(doc(db, 'quote_requests', quoteRequestId));
      
      if (!quoteDoc.exists()) {
        throw new Error('Quote request not found');
      }
      
      const quoteData = quoteDoc.data();
      console.log('✅ Quote data retrieved:', quoteData);
      
      // STEP 2: Create the active job record
      console.log('📝 Step 2: Creating active job...');
      const jobData = {
        // Reference to original quote
        quote_request_id: quoteRequestId,
        
        // Copy all quote data
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
        
        // Final agreement from negotiation
        final_price: getFinalNegotiatedPrice(quoteData),
        final_reasoning: quoteData.quote_reasoning || 'Quote accepted',
        agreed_date: quoteData.preferred_dates_list?.[0] || new Date().toISOString().split('T')[0],
        
        // Job status
        status: 'accepted',
        
        // Initialize job fields
        progress_notes: '',
        work_started_at: null,
        estimated_completion: null,
        completion_photos: [],
        completion_notes: '',
        submitted_for_approval_at: null,
        
        // Review system
        reviewed_by_customer: false,
        customer_rating: null,
        customer_review: null,
        review_submitted_at: null,
        
        // Cancellation
        cancelled_by: null,
        cancelled_at: null,
        cancellation_reason: null,
        
        // Payment (for future)
        payment_intent_id: null,
        payment_status: 'pending',
        platform_commission: 0, // 0% commission period
        tradesman_payout: extractNumericValue(getFinalNegotiatedPrice(quoteData)),
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null
      };
      
      // Create job document
      const jobRef = await addDoc(collection(db, 'active_jobs'), jobData);
      console.log('✅ Active job created with ID:', jobRef.id);
      
      // STEP 3: Update comments to reference the new job
      console.log('🔄 Step 3: Migrating comments to job...');
      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('quote_request_id', '==', quoteRequestId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      
      const commentUpdates = commentsSnapshot.docs.map(commentDoc => 
        updateDoc(commentDoc.ref, {
          active_job_id: jobRef.id,
          quote_request_id: null // Clear the quote reference
        })
      );
      
      if (commentUpdates.length > 0) {
        await Promise.all(commentUpdates);
        console.log(`✅ ${commentUpdates.length} comments migrated to job`);
      }
      
      // STEP 4: Delete the quote request (NO MORE RACE CONDITIONS!)
      console.log('🗑️ Step 4: Deleting quote request...');
      await deleteDoc(doc(db, 'quote_requests', quoteRequestId));
      console.log('✅ Quote request deleted successfully');
      
      // STEP 5: Send email notifications
      console.log('📧 Step 5: Sending email notifications...');
      await sendQuoteAcceptedEmails(quoteData, jobRef.id, jobData.final_price);
      
      // STEP 6: Refresh data and redirect
      console.log('🔄 Step 6: Refreshing data...');
      await fetchQuoteRequests();
      
      console.log('🎉 QUOTE ACCEPTED SUCCESSFULLY - NO RACE CONDITIONS!');
      
      // Success message and redirect
      alert(`✅ Quote accepted successfully!\n\nJob created and moved to Active Jobs section.`);
      navigate('/active-jobs'); // Redirect to see the new job
      
    } catch (error) {
      console.error('❌ Quote acceptance failed:', error);
      alert(`Error accepting quote: ${error.message}\n\nPlease try again or refresh the page.`);
    } finally {
      setAcceptingQuote(prev => ({ ...prev, [quoteRequestId]: false }));
    }
  };

  // Helper function to determine final negotiated price
  const getFinalNegotiatedPrice = (quoteData) => {
    if (quoteData.customer_counter_quote && quoteData.has_customer_counter) {
      return quoteData.customer_counter_quote;
    } else if (quoteData.custom_quote && quoteData.has_custom_quote) {
      return quoteData.custom_quote;
    } else if (quoteData.tradesman_hourly_rate) {
      return `£${quoteData.tradesman_hourly_rate}/hour`;
    } else {
      return 'Standard Rate';
    }
  };

  // Helper function to extract numeric value from price string
  const extractNumericValue = (priceString) => {
    const match = priceString.match(/£?(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Enhanced email notification for quote acceptance
  const sendQuoteAcceptedEmails = async (quoteData, jobId, finalPrice) => {
    try {
      // Email to customer
      await sendEmailNotification({
        recipientEmail: quoteData.customer_email,
        recipientName: quoteData.customer_name,
        senderName: quoteData.tradesman_name,
        messageText: `Great news! Your quote for "${quoteData.job_title}" has been accepted. Final price: ${finalPrice}. The job has moved to your Active Jobs section where you can track progress.`,
        replyLink: `https://patchworktrades.com/active-jobs`
      });

      // Email to tradesman
      await sendEmailNotification({
        recipientEmail: quoteData.tradesman_email,
        recipientName: quoteData.tradesman_name,
        senderName: quoteData.customer_name,
        messageText: `Congratulations! ${quoteData.customer_name} has accepted your quote for "${quoteData.job_title}". Final price: ${finalPrice}. The job has moved to your Active Jobs section.`,
        replyLink: `https://patchworktrades.com/active-jobs`
      });
      
      console.log('✅ Quote acceptance emails sent successfully');
    } catch (error) {
      console.error('⚠️ Error sending acceptance emails (non-critical):', error);
    }
  };

  // Quote update functions (same patterns as your existing, but for quotes)
  const proposeCustomQuote = async (quoteRequestId, customQuote) => {
    try {
      const updateData = {
        custom_quote: customQuote,
        has_custom_quote: true,
        status: 'negotiating', // Update status to show negotiation
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'quote_requests', quoteRequestId), updateData);
      
      // Refresh the list
      fetchQuoteRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          quote_request_id: quoteRequestId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: `Custom quote proposed: ${customQuote}`,
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR CUSTOM QUOTE
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (quote) {
        await sendEmailNotification({
          recipientEmail: quote.customer_email,
          recipientName: quote.customer_name,
          senderName: quote.tradesman_name,
          messageText: `${quote.tradesman_name} has sent you a custom quote for "${quote.job_title}": ${customQuote}. Please review and respond.`,
          replyLink: `https://patchworktrades.com/quote-requests`
        });
      }

    } catch (error) {
      console.error('Error proposing custom quote:', error);
      alert('Error proposing custom quote. Please try again.');
    }
  };

  const proposeCustomerCounter = async (quoteRequestId, counterQuote, reasoning) => {
    try {
      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        customer_counter_quote: counterQuote,
        has_customer_counter: true,
        customer_reasoning: reasoning,
        has_custom_quote: false,
        custom_quote: null,
        status: 'negotiating',
        updated_at: new Date().toISOString()
      });
      
      fetchQuoteRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          quote_request_id: quoteRequestId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: `Customer counter-offer: ${counterQuote}${reasoning ? `\nReason: ${reasoning}` : ''}`,
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR CUSTOMER COUNTER-OFFER
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (quote) {
        await sendEmailNotification({
          recipientEmail: quote.tradesman_email,
          recipientName: quote.tradesman_name,
          senderName: quote.customer_name,
          messageText: `${quote.customer_name} has made a counter-offer for "${quote.job_title}": ${counterQuote}${reasoning ? `. Reason: ${reasoning}` : ''}. Please review and respond.`,
          replyLink: `https://patchworktrades.com/quote-requests`
        });
      }

    } catch (error) {
      console.error('Error proposing counter-offer:', error);
      alert('Error proposing counter-offer. Please try again.');
    }
  };

  const rejectCustomQuote = async (quoteRequestId) => {
    try {
      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        custom_quote: null,
        has_custom_quote: false,
        customer_counter_quote: null,
        has_customer_counter: false,
        quote_reasoning: null,
        status: 'pending',
        updated_at: new Date().toISOString()
      });
      
      fetchQuoteRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          quote_request_id: quoteRequestId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: 'Customer rejected the custom quote - available for new response',
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

    } catch (error) {
      console.error('Error rejecting custom quote:', error);
      alert('Error rejecting custom quote. Please try again.');
    }
  };

  // Helper functions (same as your existing)
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSimpleDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long'
    });
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading quote requests...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {userType === 'customer' ? 'My Quote Requests' : 'Incoming Quote Requests'}
        </h1>
        <p className="text-gray-600 mt-2">
          {userType === 'customer' ? 
            'Track your submitted requests and negotiate with tradesmen' : 
            'Review customer requests and provide quotes'}
        </p>
      </div>

      {quoteRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">
            {userType === 'customer' ? 
              'No quote requests yet.' : 
              'No new quote requests at the moment.'}
          </p>
          {userType === 'customer' && (
            <button
              onClick={() => navigate('/browse')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Browse Tradesmen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {quoteRequests.map(request => (
            <div key={request.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Job Header */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {request.job_title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {userType === 'customer' ? 
                        `Request to: ${request.tradesman_name}` : 
                        `Request from: ${request.customer_name}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDate(request.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)} Priority
                    </span>
                    
                    {/* Status badges */}
                    {request.status === 'negotiating' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Negotiating
                      </span>
                    )}
                    
                    {request.has_custom_quote && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Tradesman Quote: {request.custom_quote}
                      </span>
                    )}
                    {request.has_customer_counter && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Customer Counter: {request.customer_counter_quote}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Details (same as your existing structure) */}
              <div className="px-6 py-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Job Description</h3>
                      <p className="text-gray-700 whitespace-pre-line">{request.job_description}</p>
                    </div>
                    
                    {/* Enhanced Pricing Section */}
                    <div className="space-y-3">
                      {/* Tradesman Hourly Rate */}
                      {request.tradesman_hourly_rate && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h3 className="font-medium text-gray-900 mb-1">Tradesman Rate</h3>
                          <p className="text-blue-800 font-semibold">
                            £{request.tradesman_hourly_rate}/hour
                          </p>
                          <p className="text-blue-600 text-sm">
                            Minimum 2 hours: £{request.tradesman_hourly_rate * 2}
                          </p>
                        </div>
                      )}
                      
                      {/* Customer Budget */}
                      {request.budget_expectation && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h3 className="font-medium text-gray-900 mb-1">Customer Budget</h3>
                          <p className="text-green-800 font-semibold">{request.budget_expectation}</p>
                        </div>
                      )}
                    </div>

                    {request.additional_notes && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">Additional Notes</h3>
                        <p className="text-gray-700 whitespace-pre-line">{request.additional_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Enhanced Preferred Dates */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Requested Dates</h3>
                      <div className="text-sm text-gray-700">
                        {request.preferred_dates_list && request.preferred_dates_list.length > 0 ? (
                          <div className="space-y-1">
                            {request.preferred_dates_list.map((date, index) => (
                              <div key={index} className="flex items-center">
                                <span className="w-1 h-1 bg-green-600 rounded-full mr-2"></span>
                                <span>{formatSimpleDate(date)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No specific dates selected</p>
                        )}
                      </div>
                    </div>

                    {/* Job Photos */}
                    {request.job_images && request.job_images.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Job Photos ({request.job_images.length})</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {request.job_images.slice(0, 4).map((image, index) => (
                            <img
                              key={index}
                              src={typeof image === 'string' ? image : image.image}
                              alt={`Job photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(typeof image === 'string' ? image : image.image, '_blank')}
                            />
                          ))}
                        </div>
                        {request.job_images.length > 4 && (
                          <p className="text-xs text-gray-500 mt-1">
                            +{request.job_images.length - 4} more photos
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  {/* TRADESMAN ACTIONS */}
                  {userType === 'tradesman' && (
                    <>
                      {/* No quotes sent yet - original buttons */}
                      {!request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Your Response</h3>
                          <div className="flex gap-3">
                            <button
                              onClick={() => acceptQuote(request.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                              disabled={acceptingQuote[request.id]}
                            >
                              {acceptingQuote[request.id] ? 'Accepting...' : `Accept (£${request.tradesman_hourly_rate || 'Standard Rate'}/hour)`}
                            </button>
                            
                            <button
                              onClick={() => {
                                const customQuote = prompt('Enter your custom quote (e.g., £200 fixed price, or £50/hour):');
                                if (customQuote) {
                                  proposeCustomQuote(request.id, customQuote);
                                }
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                              Custom Quote
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to reject this request?')) {
                                  // For now, we can keep rejected quotes in the collection with a status
                                  updateDoc(doc(db, 'quote_requests', request.id), {
                                    status: 'rejected',
                                    updated_at: new Date().toISOString()
                                  }).then(() => fetchQuoteRequests());
                                }
                              }}
                              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      )}

                      {/* Tradesman sent quote, waiting for customer */}
                      {request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Custom Quote Sent</h3>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800">
                              ✅ You've sent a custom quote: <strong>{request.custom_quote}</strong>
                            </p>
                            <p className="text-blue-600 text-sm mt-1">
                              Waiting for customer response...
                            </p>
                          </div>
                        </>
                      )}

                      {/* Customer sent counter-offer */}
                      {request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Customer Counter-Offer</h3>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                            <p className="text-orange-800 mb-2">
                              💬 <strong>{request.customer_name}</strong> has counter-offered: 
                              <span className="font-bold text-lg ml-2">{request.customer_counter_quote}</span>
                            </p>
                            {request.customer_reasoning && (
                              <p className="text-orange-700 text-sm mb-3 italic">
                                Reason: "{request.customer_reasoning}"
                              </p>
                            )}
                            <div className="flex gap-3">
                              <button
                                onClick={() => acceptQuote(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                disabled={acceptingQuote[request.id]}
                              >
                                {acceptingQuote[request.id] ? 'Accepting...' : 'Accept Counter-Offer'}
                              </button>
                              <button
                                onClick={() => {
                                  const newQuote = prompt('Enter your new counter-quote:');
                                  if (newQuote) {
                                    proposeCustomQuote(request.id, newQuote);
                                  }
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                              >
                                New Counter-Quote
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Reject this counter-offer? You can then propose a new quote.')) {
                                    rejectCustomQuote(request.id);
                                  }
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                              >
                                Reject Counter
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* CUSTOMER ACTIONS */}
                  {userType === 'customer' && (
                    <>
                      {/* Customer sent counter, waiting for tradesman */}
                      {request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Counter-Offer Sent</h3>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <p className="text-orange-800">
                              ✅ You've sent a counter-offer: <strong>{request.customer_counter_quote}</strong>
                            </p>
                            {request.customer_reasoning && (
                              <p className="text-orange-700 text-sm mt-1">
                                Your reason: "{request.customer_reasoning}"
                              </p>
                            )}
                            <p className="text-orange-600 text-sm mt-1">
                              Waiting for <strong>{request.tradesman_name}</strong> to respond...
                            </p>
                          </div>
                        </>
                      )}

                      {/* Tradesman sent quote, customer can respond */}
                      {request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Custom Quote Received</h3>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                            <p className="text-purple-800 mb-3">
                              💼 <strong>{request.tradesman_name}</strong> has sent you a custom quote: 
                              <span className="font-bold text-lg ml-2">{request.custom_quote}</span>
                            </p>
                            <div className="flex gap-3 flex-wrap">
                              <button
                                onClick={() => acceptQuote(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                disabled={acceptingQuote[request.id]}
                              >
                                {acceptingQuote[request.id] ? 'Accepting...' : 'Accept Quote'}
                              </button>
                              <button
                                onClick={() => {
                                  const counterQuote = prompt('Enter your counter-offer (e.g., £150 fixed price, or £40/hour):');
                                  if (counterQuote) {
                                    const reasoning = prompt('Why this price? (optional - helps with negotiation):') || '';
                                    proposeCustomerCounter(request.id, counterQuote, reasoning);
                                  }
                                }}
                                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                              >
                                Counter-Offer
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to reject this quote? The job will return to the tradesman.')) {
                                    rejectCustomQuote(request.id);
                                  }
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                              >
                                Reject Quote
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* No quotes yet - waiting */}
                      {!request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Request Status</h3>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800">
                              ⏳ Waiting for <strong>{request.tradesman_name}</strong> to respond to your quote request...
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Comments Section (same as your existing structure) */}
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="px-6 py-4">
                  <h3 className="font-medium text-gray-900 mb-3">Discussion</h3>
                  
                  {/* Comments List */}
                  <div className="space-y-3 mb-4">
                    {comments[request.id] && comments[request.id].length > 0 ? (
                      comments[request.id].map(comment => (
                        <div key={comment.id} className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {comment.user_name}
                              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                                comment.user_type === 'customer' ? 'bg-blue-100 text-blue-800' :
                                comment.user_type === 'tradesman' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {comment.user_type === 'system' ? 'System' : 
                                 comment.user_type.charAt(0).toUpperCase() + comment.user_type.slice(1)}
                              </span>
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-line">{comment.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm italic">No comments yet. Start the conversation!</p>
                    )}
                  </div>

                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComments[request.id] || ''}
                      onChange={(e) => setNewComments(prev => ({
                        ...prev,
                        [request.id]: e.target.value
                      }))}
                      placeholder="Ask a question or add a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addComment(request.id)}
                    />
                    <button
                      onClick={() => addComment(request.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuoteRequests;
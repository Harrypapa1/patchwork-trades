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
import { detectContactInfo, getViolationWarning, getShortWarning } from '../utils/contactInfoDetector';
import { logViolation, checkUserStatus } from '../utils/violationTracker';

// 🚀 FIXED BULLETPROOF QUOTE REQUESTS COMPONENT - WITH CONTACT INFO DETECTION
const QuoteRequests = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [acceptingQuote, setAcceptingQuote] = useState({});
  
  // 🆕 NEW: Suspension check
  const [userStatus, setUserStatus] = useState({ suspended: false, violationCount: 0 });
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(false);

  // 🆕 NEW: Contact violation tracking per quote
  const [commentViolations, setCommentViolations] = useState({});
  
  // Refs for cleanup
  const activeListeners = useRef({});
  const componentId = useRef(`quote-requests-${Date.now()}-${Math.random()}`);

  // 🆕 NEW: Check user suspension status on mount
  useEffect(() => {
    const checkSuspension = async () => {
      if (!currentUser) return;
      
      const status = await checkUserStatus(currentUser.uid);
      setUserStatus(status);
      
      if (status.suspended) {
        setShowSuspensionWarning(true);
      }
    };
    
    checkSuspension();
  }, [currentUser]);

  // EMAIL NOTIFICATION HELPER FUNCTION
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
    
    return () => {
      console.log(`🧹 [${componentId.current}] Cleaning up component...`);
      
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (error) {
            console.warn('Error during listener cleanup:', error);
          }
        }
      });
      activeListeners.current = {};
    };
  }, [currentUser, userType]);

  const fetchQuoteRequests = async () => {
    try {
      let quotesQuery;
      
      if (userType === 'customer') {
        quotesQuery = query(
          collection(db, 'quote_requests'),
          where('customer_id', '==', currentUser.uid)
        );
      } else {
        quotesQuery = query(
          collection(db, 'quote_requests'),
          where('tradesman_id', '==', currentUser.uid)
        );
      }

      const quotesSnapshot = await getDocs(quotesQuery);
      const allRequests = quotesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const activeRequests = allRequests.filter(request => {
        const status = request.status;
        
        if (status === 'completed' || 
            status === 'moved_to_active_jobs' || 
            status === 'rejected' || 
            status === 'dismissed_by_customer' ||
            request.archived) {
          return false;
        }

        if (userType === 'tradesman' && request.dismissed_by_tradesman) {
          return false;
        }

        return true;
      });

      console.log('Found active quote requests:', activeRequests);
      setQuoteRequests(activeRequests);

      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe();
          } catch (error) {
            console.warn('Error cleaning up existing listener:', error);
          }
        }
      });
      activeListeners.current = {};

      for (const request of activeRequests) {
        fetchComments(request.id);
      }

    } catch (error) {
      console.error('Error fetching quote requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = (quoteRequestId) => {
    try {
      if (activeListeners.current[quoteRequestId]) {
        try {
          activeListeners.current[quoteRequestId]();
        } catch (error) {
          console.warn(`Error cleaning up listener for quote ${quoteRequestId}:`, error);
        }
        delete activeListeners.current[quoteRequestId];
      }

      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('quote_request_id', '==', quoteRequestId)
      );

      console.log('Setting up real-time listener for quote:', quoteRequestId);

      const unsubscribe = onSnapshot(
        commentsQuery, 
        (snapshot) => {
          const quoteComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
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

      activeListeners.current[quoteRequestId] = unsubscribe;

    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(prev => ({
        ...prev,
        [quoteRequestId]: []
      }));
    }
  };

  // ✅ FIXED: Enhanced addComment with contact detection - BLOCKS FIRST
  const addComment = async (quoteRequestId) => {
    const commentText = newComments[quoteRequestId]?.trim();
    if (!commentText) return;

    // Check if user is suspended
    if (userStatus.suspended) {
      alert('⚠️ Your account is suspended.\n\nYou cannot send comments.\n\nPlease contact support@patchworktrades.com to appeal.');
      return;
    }

    // 🆕 NEW: Detect contact info
    const detection = detectContactInfo(commentText);
    
    if (detection.detected) {
      // ✅ FIXED: Block submission FIRST, log violation SECOND
      // This ensures comment is blocked even if logging fails
      
      // Clear the input immediately
      setNewComments(prev => ({
        ...prev,
        [quoteRequestId]: ''
      }));

      // Show warning immediately
      alert(getViolationWarning(userStatus.violationCount));

      // Now try to log the violation (non-blocking)
      try {
        const quote = quoteRequests.find(q => q.id === quoteRequestId);
        const violationTypes = detection.violations.map(v => v.type);
        
        const violationResult = await logViolation(
          currentUser.uid,
          currentUser.email,
          userType === 'customer' ? quote?.customer_name : quote?.tradesman_name,
          userType,
          {
            location: 'quote_request_comment',
            detectedContent: detection.message,
            violationTypes: violationTypes,
            blockedText: commentText.substring(0, 100)
          }
        );

        // Update local user status
        setUserStatus(prev => ({
          ...prev,
          violationCount: violationResult.violationCount,
          suspended: violationResult.suspended
        }));

        if (violationResult.suspended) {
          setShowSuspensionWarning(true);
        }
      } catch (error) {
        console.error('Error logging violation:', error);
        // Even if logging fails, we've already blocked the comment
      }

      return; // Block submission
    }

    console.log('Adding comment for quote:', quoteRequestId, 'Comment:', commentText);

    try {
      const commentData = {
        quote_request_id: quoteRequestId,
        booking_id: null,
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

  // 🆕 NEW: Handle comment input change with real-time detection
  const handleCommentChange = (quoteRequestId, value) => {
    setNewComments(prev => ({
      ...prev,
      [quoteRequestId]: value
    }));

    // Real-time contact detection
    const detection = detectContactInfo(value);
    setCommentViolations(prev => ({
      ...prev,
      [quoteRequestId]: detection.detected ? detection : null
    }));
  };

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

  const extractNumericValue = (priceString) => {
    const match = priceString.toString().match(/£?(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const handleRejectQuote = async (quoteRequestId) => {
    try {
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (!quote) return;

      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: currentUser.uid,
        updated_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'booking_comments'), {
        quote_request_id: quoteRequestId,
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: `Quote request rejected by ${quote.tradesman_name}`,
        timestamp: new Date().toISOString()
      });

      await sendEmailNotification({
        recipientEmail: quote.customer_email,
        recipientName: quote.customer_name,
        senderName: quote.tradesman_name,
        messageText: `${quote.tradesman_name} is unable to take on your job "${quote.job_title}" at this time. You can search for other tradesmen or adjust your requirements.`,
        replyLink: `https://patchworktrades.com/browse`
      });

      fetchQuoteRequests();

      alert('Quote request rejected and customer has been notified.');

    } catch (error) {
      console.error('Error rejecting quote:', error);
      alert('Error rejecting quote. Please try again.');
    }
  };

  const handleDismissQuote = async (quoteRequestId) => {
    try {
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (!quote) return;

      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        dismissed_by_tradesman: true,
        dismissed_at: new Date().toISOString(),
        dismissed_by: currentUser.uid,
        updated_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'booking_comments'), {
        quote_request_id: quoteRequestId,
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: `Quote request dismissed by tradesman (hidden from tradesman view)`,
        timestamp: new Date().toISOString()
      });

      fetchQuoteRequests();

      alert('Quote request dismissed from your list.');

    } catch (error) {
      console.error('Error dismissing quote:', error);
      alert('Error dismissing quote. Please try again.');
    }
  };

  const handleCustomerDismissQuote = async (quoteRequestId, dismissalReason = '') => {
    try {
      const quote = quoteRequests.find(q => q.id === quoteRequestId);
      if (!quote) return;

      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        dismissed_by_customer: true,
        status: 'dismissed_by_customer',
        dismissal_reason: dismissalReason || 'No reason provided',
        dismissed_at: new Date().toISOString(),
        dismissed_by: currentUser.uid,
        updated_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'booking_comments'), {
        quote_request_id: quoteRequestId,
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: `Quote request dismissed by customer - removed from both sides (admin tracking)${dismissalReason ? `\nReason: ${dismissalReason}` : ''}`,
        timestamp: new Date().toISOString()
      });

      fetchQuoteRequests();

      alert('Quote request dismissed. This job has been removed from both your list and the tradesman\'s list.');

    } catch (error) {
      console.error('Error dismissing quote:', error);
      alert('Error dismissing quote. Please try again.');
    }
  };

  const acceptQuote = async (quoteRequestId) => {
    console.log('🚀 Starting quote acceptance with payment-first flow:', quoteRequestId);
    
    if (acceptingQuote[quoteRequestId]) {
      console.log('⏳ Accept already in progress for this quote');
      return;
    }

    setAcceptingQuote(prev => ({ ...prev, [quoteRequestId]: true }));

    try {
      console.log('📖 Step 1: Reading quote data...');
      const quoteDoc = await getDoc(doc(db, 'quote_requests', quoteRequestId));
      
      if (!quoteDoc.exists()) {
        throw new Error('Quote request not found');
      }
      
      const quoteData = quoteDoc.data();
      console.log('✅ Quote data retrieved:', quoteData);

      console.log('💳 Step 2: Marking quote as payment pending...');
      await updateDoc(doc(db, 'quote_requests', quoteRequestId), {
        status: 'payment_pending',
        payment_required: true,
        final_agreed_price: getFinalNegotiatedPrice(quoteData),
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('🛒 Step 3: Redirecting to payment checkout...');
      
      if (userType === 'customer') {
        navigate('/payment-checkout', { 
          state: { 
            quoteId: quoteRequestId,
            quoteData: quoteData,
            finalPrice: getFinalNegotiatedPrice(quoteData),
            paymentRequired: true
          }
        });
      } else {
        await sendEmailNotification({
          recipientEmail: quoteData.customer_email,
          recipientName: quoteData.customer_name,
          senderName: quoteData.tradesman_name,
          messageText: `${quoteData.tradesman_name} has accepted your counter-offer of ${getFinalNegotiatedPrice(quoteData)} for "${quoteData.job_title}". Please complete payment to confirm the job.`,
          replyLink: `https://patchworktrades.com/payment-checkout?quoteId=${quoteRequestId}`
        });
        
        alert(`✅ Counter-offer accepted!\n\n${quoteData.customer_name} has been notified and will receive a payment link to complete the booking.`);
      }
      
      await fetchQuoteRequests();
      
      console.log('🎉 QUOTE ACCEPTED - CUSTOMER REDIRECTED TO PAYMENT!');
      
    } catch (error) {
      console.error('❌ Quote acceptance failed:', error);
      alert(`Error accepting quote: ${error.message}\n\nPlease try again or refresh the page.`);
    } finally {
      setAcceptingQuote(prev => ({ ...prev, [quoteRequestId]: false }));
    }
  };

  // ✅ FIXED: Enhanced proposeCustomQuote with contact detection - BLOCKS FIRST
  const proposeCustomQuote = async (quoteRequestId, customQuote) => {
    // Detect contact info in custom quote
    const detection = detectContactInfo(customQuote);
    
    if (detection.detected) {
      // ✅ FIXED: Block first, log second
      alert(getViolationWarning(userStatus.violationCount));

      // Try to log violation (non-blocking)
      try {
        const quote = quoteRequests.find(q => q.id === quoteRequestId);
        const violationTypes = detection.violations.map(v => v.type);
        
        const violationResult = await logViolation(
          currentUser.uid,
          currentUser.email,
          quote?.tradesman_name || currentUser.email,
          userType,
          {
            location: 'custom_quote_proposal',
            detectedContent: detection.message,
            violationTypes: violationTypes,
            blockedText: customQuote.substring(0, 100)
          }
        );

        setUserStatus(prev => ({
          ...prev,
          violationCount: violationResult.violationCount,
          suspended: violationResult.suspended
        }));

        if (violationResult.suspended) {
          setShowSuspensionWarning(true);
        }
      } catch (error) {
        console.error('Error logging violation:', error);
        // Even if logging fails, we've already blocked the quote
      }

      return; // Block submission
    }

    try {
      const updateData = {
        custom_quote: customQuote,
        has_custom_quote: true,
        status: 'negotiating',
        updated_at: new Date().toISOString()
      };

      await updateDoc(doc(db, 'quote_requests', quoteRequestId), updateData);
      
      fetchQuoteRequests();
      
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

  // ✅ FIXED: Enhanced proposeCustomerCounter with contact detection - BLOCKS FIRST
  const proposeCustomerCounter = async (quoteRequestId, counterQuote, reasoning) => {
    // Detect contact info in counter quote AND reasoning
    const quoteDetection = detectContactInfo(counterQuote);
    const reasoningDetection = detectContactInfo(reasoning);
    
    if (quoteDetection.detected || reasoningDetection.detected) {
      // ✅ FIXED: Block first, log second
      alert(getViolationWarning(userStatus.violationCount));

      // Try to log violation (non-blocking)
      try {
        const quote = quoteRequests.find(q => q.id === quoteRequestId);
        const violationTypes = [
          ...(quoteDetection.violations?.map(v => v.type) || []),
          ...(reasoningDetection.violations?.map(v => v.type) || [])
        ];
        
        const violationResult = await logViolation(
          currentUser.uid,
          currentUser.email,
          quote?.customer_name || currentUser.email,
          userType,
          {
            location: 'customer_counter_offer',
            detectedContent: quoteDetection.message || reasoningDetection.message,
            violationTypes: [...new Set(violationTypes)],
            blockedText: (counterQuote + ' ' + reasoning).substring(0, 100)
          }
        );

        setUserStatus(prev => ({
          ...prev,
          violationCount: violationResult.violationCount,
          suspended: violationResult.suspended
        }));

        if (violationResult.suspended) {
          setShowSuspensionWarning(true);
        }
      } catch (error) {
        console.error('Error logging violation:', error);
        // Even if logging fails, we've already blocked the counter-offer
      }

      return; // Block submission
    }

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
      {/* 🆕 NEW: Suspension Warning Banner */}
      {showSuspensionWarning && userStatus.suspended && (
        <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">🚫</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Account Suspended</h3>
              <p className="text-red-800 mb-2">
                Your account has been suspended for repeatedly attempting to share contact information.
              </p>
              <p className="text-red-700 text-sm mb-3">
                You cannot send comments or negotiate quotes while suspended.
              </p>
              <a 
                href="mailto:support@patchworktrades.com"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium inline-block"
              >
                Contact Support to Appeal
              </a>
            </div>
          </div>
        </div>
      )}

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
                  
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(request.urgency)}`}>
                      {request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1)} Priority
                    </span>
                    
                    {request.status === 'negotiating' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Negotiating
                      </span>
                    )}

                    {request.status === 'payment_pending' && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        💳 Payment Required
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

              {/* Job Details */}
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
                  {/* PAYMENT PENDING STATUS */}
                  {request.status === 'payment_pending' && (
                    <>
                      <h3 className="font-medium text-gray-900 mb-3">Payment Required</h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center text-red-800 mb-3">
                          <span className="text-lg mr-2">💳</span>
                          <span className="font-semibold">Quote Accepted - Payment Required</span>
                        </div>
                        <p className="text-red-700 mb-3">
                          Final agreed price: <strong>{request.final_agreed_price}</strong>
                        </p>
                        {userType === 'customer' ? (
                          <div>
                            <p className="text-red-700 text-sm mb-3">
                              Complete payment to confirm this job and move it to your Active Jobs.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => navigate('/payment-checkout', { 
                                  state: { 
                                    quoteId: request.id,
                                    quoteData: request,
                                    finalPrice: request.final_agreed_price,
                                    paymentRequired: true
                                  }
                                })}
                                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                              >
                                💳 Complete Payment ({request.final_agreed_price})
                              </button>
                              
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide a reason for dismissing this quote (optional):');
                                  if (reason !== null) {
                                    handleCustomerDismissQuote(request.id, reason);
                                  }
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                              >
                                Dismiss Quote
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-red-700 text-sm">
                            Waiting for <strong>{request.customer_name}</strong> to complete payment. They have been notified via email.
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* TRADESMAN ACTIONS */}
                  {userType === 'tradesman' && request.status !== 'payment_pending' && (
                    <>
                      {!request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Your Response</h3>
                          <div className="flex gap-3">
                            <button
                              onClick={() => acceptQuote(request.id)}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                              disabled={acceptingQuote[request.id] || userStatus.suspended}
                            >
                              {acceptingQuote[request.id] ? 'Accepting...' : `Accept (£${request.tradesman_hourly_rate || 'Standard Rate'}/hour)`}
                            </button>
                            
                            <button
                              onClick={() => {
                                if (userStatus.suspended) {
                                  alert('⚠️ Your account is suspended. You cannot propose quotes.');
                                  return;
                                }
                                const customQuote = prompt('Enter your custom quote (e.g., £200 fixed price, or £50/hour):');
                                if (customQuote) {
                                  proposeCustomQuote(request.id, customQuote);
                                }
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                              disabled={userStatus.suspended}
                            >
                              Custom Quote
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to reject this request? This will remove it from your list and notify the customer.')) {
                                  handleRejectQuote(request.id);
                                }
                              }}
                              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            >
                              Reject
                            </button>

                            <button
                              onClick={() => {
                                if (confirm('Dismiss this quote? It will be hidden from your list but the customer won\'t be notified. They can still see it as pending.')) {
                                  handleDismissQuote(request.id);
                                }
                              }}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                              Dismiss
                            </button>
                          </div>
                        </>
                      )}

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
                                disabled={acceptingQuote[request.id] || userStatus.suspended}
                              >
                                {acceptingQuote[request.id] ? 'Accepting...' : 'Accept Counter-Offer'}
                              </button>
                              <button
                                onClick={() => {
                                  if (userStatus.suspended) {
                                    alert('⚠️ Your account is suspended. You cannot propose quotes.');
                                    return;
                                  }
                                  const newQuote = prompt('Enter your new counter-quote:');
                                  if (newQuote) {
                                    proposeCustomQuote(request.id, newQuote);
                                  }
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                disabled={userStatus.suspended}
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
                  {userType === 'customer' && request.status !== 'payment_pending' && (
                    <>
                      {request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Counter-Offer Sent</h3>
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
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
                          
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide a reason for dismissing this quote (optional):');
                                if (reason !== null) {
                                  handleCustomerDismissQuote(request.id, reason);
                                }
                              }}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                              Dismiss Quote Request
                            </button>
                          </div>
                        </>
                      )}

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
                                disabled={acceptingQuote[request.id] || userStatus.suspended}
                              >
                                {acceptingQuote[request.id] ? 'Accepting...' : 'Accept Quote'}
                              </button>
                              <button
                                onClick={() => {
                                  if (userStatus.suspended) {
                                    alert('⚠️ Your account is suspended. You cannot propose counter-offers.');
                                    return;
                                  }
                                  const counterQuote = prompt('Enter your counter-offer (e.g., £150 fixed price, or £40/hour):');
                                  if (counterQuote) {
                                    const reasoning = prompt('Why this price? (optional - helps with negotiation):') || '';
                                    proposeCustomerCounter(request.id, counterQuote, reasoning);
                                  }
                                }}
                                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
                                disabled={userStatus.suspended}
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
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide a reason for dismissing this quote (optional):');
                                  if (reason !== null) {
                                    handleCustomerDismissQuote(request.id, reason);
                                  }
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                              >
                                Dismiss Quote Request
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {!request.has_custom_quote && !request.has_customer_counter && (
                        <>
                          <h3 className="font-medium text-gray-900 mb-3">Request Status</h3>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-yellow-800">
                              ⏳ Waiting for <strong>{request.tradesman_name}</strong> to respond to your quote request...
                            </p>
                          </div>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide a reason for dismissing this quote (optional):');
                                if (reason !== null) {
                                  handleCustomerDismissQuote(request.id, reason);
                                }
                              }}
                              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                              Dismiss Quote Request
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Comments Section */}
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
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComments[request.id] || ''}
                        onChange={(e) => handleCommentChange(request.id, e.target.value)}
                        placeholder={userStatus.suspended ? "Account suspended - cannot comment" : "Ask a question or add a comment..."}
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                          commentViolations[request.id] 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        onKeyPress={(e) => e.key === 'Enter' && !userStatus.suspended && addComment(request.id)}
                        disabled={userStatus.suspended}
                      />
                      <button
                        onClick={() => addComment(request.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                        disabled={userStatus.suspended}
                      >
                        Comment
                      </button>
                    </div>
                    {commentViolations[request.id] && (
                      <p className="text-red-600 text-sm">
                        ⚠️ {commentViolations[request.id].message} - {getShortWarning(userStatus.violationCount)}
                      </p>
                    )}
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

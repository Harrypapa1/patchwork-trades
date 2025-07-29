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
  doc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// 🔒 GLOBAL MUTEX TO PREVENT RACE CONDITIONS ACROSS ALL COMPONENTS
window.patchworkBookingMutex = window.patchworkBookingMutex || {
  isLocked: false,
  lockId: null,
  queue: []
};

const BookingRequests = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [bookingRequests, setBookingRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Enhanced refs for race condition protection
  const activeListeners = useRef({});
  const isUpdating = useRef(false);
  const componentId = useRef(`booking-requests-${Date.now()}-${Math.random()}`);

  // 🔒 GLOBAL MUTEX FUNCTIONS
  const acquireGlobalLock = async (operationName) => {
    const lockId = `${componentId.current}-${operationName}-${Date.now()}`;
    
    console.log(`🔒 [${lockId}] Attempting to acquire global lock for: ${operationName}`);
    
    // Wait for existing lock to release (max 10 seconds)
    let attempts = 0;
    while (window.patchworkBookingMutex.isLocked && attempts < 100) {
      console.log(`🔒 [${lockId}] Waiting for lock... (attempt ${attempts + 1})`);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (window.patchworkBookingMutex.isLocked) {
      console.error(`🔒 [${lockId}] TIMEOUT: Could not acquire lock after 10 seconds`);
      throw new Error('System busy - please try again in a moment');
    }
    
    // Acquire lock
    window.patchworkBookingMutex.isLocked = true;
    window.patchworkBookingMutex.lockId = lockId;
    
    console.log(`🔒 [${lockId}] Global lock ACQUIRED for: ${operationName}`);
    return lockId;
  };

  const releaseGlobalLock = (lockId, operationName) => {
    if (window.patchworkBookingMutex.lockId === lockId) {
      window.patchworkBookingMutex.isLocked = false;
      window.patchworkBookingMutex.lockId = null;
      console.log(`🔒 [${lockId}] Global lock RELEASED for: ${operationName}`);
    } else {
      console.warn(`🔒 [${lockId}] Lock mismatch - could not release for: ${operationName}`);
    }
  };

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
      fetchBookingRequests();
    }
    
    // Enhanced cleanup with global mutex awareness
    return () => {
      console.log(`🧹 [${componentId.current}] Cleaning up component...`);
      
      // Clean up all listeners
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListeners.current = {};
      
      // Release any held locks
      if (window.patchworkBookingMutex.lockId?.startsWith(componentId.current)) {
        console.log(`🔒 [${componentId.current}] Emergency lock release during cleanup`);
        window.patchworkBookingMutex.isLocked = false;
        window.patchworkBookingMutex.lockId = null;
      }
    };
  }, [currentUser, userType]);

  const fetchBookingRequests = async () => {
    try {
      let bookingsQuery;
      
      if (userType === 'customer') {
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('customer_id', '==', currentUser.uid),
          where('status', '==', 'Quote Requested')
        );
      } else {
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('tradesman_id', '==', currentUser.uid),
          where('status', '==', 'Quote Requested')
        );
      }

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const requests = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('Found booking requests:', requests);
      setBookingRequests(requests);

      // Clean up existing listeners before setting up new ones
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListeners.current = {};

      // Fetch comments for each request with cleanup
      for (const request of requests) {
        fetchComments(request.id);
      }

    } catch (error) {
      console.error('Error fetching booking requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = (bookingId) => {
    try {
      // Clean up existing listener for this booking if it exists
      if (activeListeners.current[bookingId]) {
        activeListeners.current[bookingId]();
        delete activeListeners.current[bookingId];
      }

      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('booking_id', '==', bookingId)
      );

      console.log('Setting up real-time listener for booking:', bookingId);

      // Set up new listener with proper cleanup
      const unsubscribe = onSnapshot(commentsQuery, 
        (snapshot) => {
          const bookingComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort manually by timestamp
          bookingComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          console.log('Comments updated for booking', bookingId, ':', bookingComments);
          
          setComments(prev => ({
            ...prev,
            [bookingId]: bookingComments
          }));
        },
        (error) => {
          console.log('Comments collection may not exist yet, initializing empty:', error);
          setComments(prev => ({
            ...prev,
            [bookingId]: []
          }));
        }
      );

      // Store the unsubscribe function for cleanup
      activeListeners.current[bookingId] = unsubscribe;

    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(prev => ({
        ...prev,
        [bookingId]: []
      }));
    }
  };

  const addComment = async (bookingId) => {
    const commentText = newComments[bookingId]?.trim();
    if (!commentText) return;

    console.log('Adding comment for booking:', bookingId, 'Comment:', commentText);

    try {
      const commentData = {
        booking_id: bookingId,
        user_id: currentUser.uid,
        user_type: userType,
        user_name: userType === 'customer' ? 
          bookingRequests.find(b => b.id === bookingId)?.customer_name : 
          bookingRequests.find(b => b.id === bookingId)?.tradesman_name,
        comment: commentText,
        timestamp: new Date().toISOString()
      };

      console.log('Comment data being saved:', commentData);

      await addDoc(collection(db, 'booking_comments'), commentData);

      // Clear the input
      setNewComments(prev => ({
        ...prev,
        [bookingId]: ''
      }));

      console.log('Comment saved successfully!');

      // EMAIL NOTIFICATION FOR NEW COMMENT
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        const recipientIsCustomer = userType === 'tradesman';
        const recipientEmail = recipientIsCustomer ? booking.customer_email : booking.tradesman_email;
        const recipientName = recipientIsCustomer ? booking.customer_name : booking.tradesman_name;
        const senderName = recipientIsCustomer ? booking.tradesman_name : booking.customer_name;

        await sendEmailNotification({
          recipientEmail: recipientEmail,
          recipientName: recipientName,
          senderName: senderName,
          messageText: `New comment on job "${booking.job_title}": ${commentText}`,
          replyLink: `https://patchworktrades.com/booking-requests`
        });
      }

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  // 🔒 ENHANCED BOOKING UPDATE WITH GLOBAL MUTEX PROTECTION
  const updateBookingStatus = async (bookingId, newStatus, customQuote = null) => {
    const operationName = `updateBookingStatus-${newStatus}`;
    let lockId = null;
    
    console.log(`🚀 [ENHANCED] Starting booking update: ${operationName}`, { bookingId, newStatus, customQuote });
    
    // Early validation
    if (!bookingId || !newStatus) {
      console.error('❌ INVALID INPUTS:', { bookingId, newStatus });
      alert('Error: Invalid booking data. Please refresh the page.');
      return;
    }

    // Local mutex check
    if (isUpdating.current) {
      console.log('⏳ Local update already in progress, skipping...');
      alert('Please wait - another update is in progress.');
      return;
    }

    isUpdating.current = true;

    try {
      // 🔒 ACQUIRE GLOBAL LOCK
      lockId = await acquireGlobalLock(operationName);
      
      // STEP 1: Verify booking exists
      console.log(`🔍 [${lockId}] Step 1: Verifying booking exists...`);
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        console.error(`❌ [${lockId}] CRITICAL: Booking does not exist!`, bookingId);
        alert('Error: Booking not found in database. Please refresh the page.');
        return;
      }
      
      const currentBookingData = bookingSnap.data();
      console.log(`✅ [${lockId}] Booking exists, current status: ${currentBookingData.status}`);
      
      // STEP 2: Disable ALL listeners globally during update
      console.log(`🔄 [${lockId}] Step 2: Disabling all listeners...`);
      const listenersBackup = { ...activeListeners.current };
      Object.values(activeListeners.current).forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      activeListeners.current = {};
      
      // STEP 3: Create atomic update data
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (customQuote) {
        updateData.custom_quote = customQuote;
        updateData.has_custom_quote = true;
      }

      console.log(`📝 [${lockId}] Update data prepared:`, updateData);

      // STEP 4: Atomic update operation
      console.log(`💾 [${lockId}] Step 4: Performing atomic update...`);
      await updateDoc(bookingRef, updateData);
      console.log(`✅ [${lockId}] Atomic update completed successfully`);
      
      // STEP 5: Verify update worked
      console.log(`🔍 [${lockId}] Step 5: Verifying update...`);
      const verificationSnap = await getDoc(bookingRef);
      
      if (!verificationSnap.exists()) {
        console.error(`❌ [${lockId}] CRITICAL: Booking disappeared after update!`);
        alert('CRITICAL ERROR: Booking was lost during update. Screenshot this error and contact support.');
        return;
      }
      
      const verifiedData = verificationSnap.data();
      console.log(`✅ [${lockId}] Verification successful. New status: ${verifiedData.status}`);
      
      if (verifiedData.status !== newStatus) {
        console.error(`❌ [${lockId}] CRITICAL: Status not updated correctly!`, {
          expected: newStatus,
          actual: verifiedData.status
        });
        alert(`ERROR: Status update failed. Expected: ${newStatus}, Got: ${verifiedData.status}`);
        return;
      }
      
      // STEP 6: Add system comment
      console.log(`💬 [${lockId}] Step 6: Adding system comment...`);
      try {
        const commentData = {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: customQuote ? 
            `Custom quote proposed: ${customQuote}` : 
            `Booking ${newStatus.toLowerCase()}`,
          timestamp: new Date().toISOString()
        };

        await addDoc(collection(db, 'booking_comments'), commentData);
        console.log(`✅ [${lockId}] System comment added successfully`);
        
      } catch (commentError) {
        console.error(`⚠️ [${lockId}] Error adding system comment (non-critical):`, commentError);
      }

      // STEP 7: Send email notifications
      if (newStatus === 'Accepted') {
        console.log(`📧 [${lockId}] Sending acceptance emails...`);
        
        try {
          // Email both customer and tradesman
          await sendEmailNotification({
            recipientEmail: currentBookingData.customer_email,
            recipientName: currentBookingData.customer_name,
            senderName: currentBookingData.tradesman_name,
            messageText: `Great news! ${currentBookingData.tradesman_name} has accepted your job "${currentBookingData.job_title}". The job will now move to your Booked Jobs section.`,
            replyLink: `https://patchworktrades.com/booked-jobs`
          });

          await sendEmailNotification({
            recipientEmail: currentBookingData.tradesman_email,
            recipientName: currentBookingData.tradesman_name,
            senderName: currentBookingData.customer_name,
            messageText: `You have successfully accepted the job "${currentBookingData.job_title}" from ${currentBookingData.customer_name}. The job has moved to your Booked Jobs section.`,
            replyLink: `https://patchworktrades.com/booked-jobs`
          });
          
          console.log(`✅ [${lockId}] Acceptance emails sent successfully`);
        } catch (emailError) {
          console.error(`⚠️ [${lockId}] Error sending emails (non-critical):`, emailError);
        }
      }

      // STEP 8: Safe delay before refresh
      console.log(`⏳ [${lockId}] Step 8: Safe delay before refresh...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 9: Refresh data
      console.log(`🔄 [${lockId}] Step 9: Refreshing data...`);
      await fetchBookingRequests();
      console.log(`✅ [${lockId}] Data refreshed successfully`);

      console.log(`🎉 [${lockId}] ENHANCED booking update completed successfully!`);
      
      // Success message
      alert(`✅ Booking ${newStatus.toLowerCase()} successfully!\n\nThe job should now appear in your "Booked Jobs" section.`);

    } catch (error) {
      console.error(`❌ [${lockId}] BOOKING UPDATE FAILED:`, error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      alert(`CRITICAL ERROR in booking update:\n\nError: ${error.message}\n\nPlease screenshot this error and refresh the page.`);
    } finally {
      // 🔒 ALWAYS RELEASE GLOBAL LOCK
      if (lockId) {
        releaseGlobalLock(lockId, operationName);
      }
      
      isUpdating.current = false;
      console.log(`🔓 [${lockId}] Cleanup completed for: ${operationName}`);
    }
  };

  // Enhanced helper functions with mutex protection
  const proposeCustomQuote = async (bookingId, customQuote) => {
    const lockId = await acquireGlobalLock('proposeCustomQuote');
    
    try {
      const updateData = {
        custom_quote: customQuote,
        has_custom_quote: true,
        status: 'Quote Requested'
      };

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: `Custom quote proposed: ${customQuote}`,
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment (collection may not exist yet):', commentError);
      }

      // EMAIL NOTIFICATION FOR CUSTOM QUOTE
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.customer_email,
          recipientName: booking.customer_name,
          senderName: booking.tradesman_name,
          messageText: `${booking.tradesman_name} has sent you a custom quote for "${booking.job_title}": ${customQuote}. Please review and respond.`,
          replyLink: `https://patchworktrades.com/booking-requests`
        });
      }

    } catch (error) {
      console.error('Error proposing custom quote:', error);
      alert('Error proposing custom quote. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'proposeCustomQuote');
    }
  };

  const acceptCustomQuote = async (bookingId) => {
    const lockId = await acquireGlobalLock('acceptCustomQuote');
    
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Accepted'
      });
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list (job will now move to BookedJobs)
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: 'Customer accepted the custom quote',
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR QUOTE ACCEPTANCE
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.tradesman_email,
          recipientName: booking.tradesman_name,
          senderName: booking.customer_name,
          messageText: `Excellent! ${booking.customer_name} has accepted your custom quote for "${booking.job_title}". The job has moved to your Booked Jobs section.`,
          replyLink: `https://patchworktrades.com/booked-jobs`
        });
      }

    } catch (error) {
      console.error('Error accepting custom quote:', error);
      alert('Error accepting custom quote. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'acceptCustomQuote');
    }
  };

  const rejectCustomQuote = async (bookingId) => {
    const lockId = await acquireGlobalLock('rejectCustomQuote');
    
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        custom_quote: null,
        has_custom_quote: false,
        customer_counter_quote: null,
        has_customer_counter: false,
        quote_reasoning: null,
        status: 'Quote Requested'
      });
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: 'Customer rejected the custom quote - job available for new response',
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR QUOTE REJECTION
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.tradesman_email,
          recipientName: booking.tradesman_name,
          senderName: booking.customer_name,
          messageText: `${booking.customer_name} has declined your custom quote for "${booking.job_title}". You can now provide a new quote or proposal.`,
          replyLink: `https://patchworktrades.com/booking-requests`
        });
      }

    } catch (error) {
      console.error('Error rejecting custom quote:', error);
      alert('Error rejecting custom quote. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'rejectCustomQuote');
    }
  };

  const proposeCustomerCounter = async (bookingId, counterQuote, reasoning) => {
    const lockId = await acquireGlobalLock('proposeCustomerCounter');
    
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        customer_counter_quote: counterQuote,
        has_customer_counter: true,
        customer_reasoning: reasoning,
        has_custom_quote: false,
        custom_quote: null,
        status: 'Quote Requested'
      });
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
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
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.tradesman_email,
          recipientName: booking.tradesman_name,
          senderName: booking.customer_name,
          messageText: `${booking.customer_name} has made a counter-offer for "${booking.job_title}": ${counterQuote}${reasoning ? `. Reason: ${reasoning}` : ''}. Please review and respond.`,
          replyLink: `https://patchworktrades.com/booking-requests`
        });
      }

    } catch (error) {
      console.error('Error proposing counter-offer:', error);
      alert('Error proposing counter-offer. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'proposeCustomerCounter');
    }
  };

  const acceptCustomerCounter = async (bookingId) => {
    const lockId = await acquireGlobalLock('acceptCustomerCounter');
    
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Accepted'
      });
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list (job will now move to BookedJobs)
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: 'Tradesman accepted the customer counter-offer',
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR COUNTER-OFFER ACCEPTANCE
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.customer_email,
          recipientName: booking.customer_name,
          senderName: booking.tradesman_name,
          messageText: `Great news! ${booking.tradesman_name} has accepted your counter-offer for "${booking.job_title}". The job has moved to your Booked Jobs section.`,
          replyLink: `https://patchworktrades.com/booked-jobs`
        });
      }

    } catch (error) {
      console.error('Error accepting customer counter:', error);
      alert('Error accepting customer counter. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'acceptCustomerCounter');
    }
  };

  const rejectCustomerCounter = async (bookingId) => {
    const lockId = await acquireGlobalLock('rejectCustomerCounter');
    
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        customer_counter_quote: null,
        has_customer_counter: false,
        customer_reasoning: null,
        status: 'Quote Requested'
      });
      
      // Safe delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the list
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: 'Tradesman rejected the customer counter-offer - job available for new response',
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment:', commentError);
      }

      // EMAIL NOTIFICATION FOR COUNTER-OFFER REJECTION
      const booking = bookingRequests.find(b => b.id === bookingId);
      if (booking) {
        await sendEmailNotification({
          recipientEmail: booking.customer_email,
          recipientName: booking.customer_name,
          senderName: booking.tradesman_name,
          messageText: `${booking.tradesman_name} has declined your counter-offer for "${booking.job_title}". They may provide a new quote or proposal.`,
          replyLink: `https://patchworktrades.com/booking-requests`
        });
      }

    } catch (error) {
      console.error('Error rejecting customer counter:', error);
      alert('Error rejecting customer counter. Please try again.');
    } finally {
      releaseGlobalLock(lockId, 'rejectCustomerCounter');
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
    return <div className="text-center py-8">Loading booking requests...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {userType === 'customer' ? 'My Quote Requests' : 'Incoming Quote Requests'}
        </h1>
        <p className="text-gray-600 mt-2">
          {userType === 'customer' ? 
            'Track your submitted requests and communicate with tradesmen' : 
            'Review customer requests and provide quotes'}
        </p>
        
        {/* Global mutex status indicator for debugging */}
        {window.patchworkBookingMutex.isLocked && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm">
            🔒 System busy - processing booking operation...
          </div>
        )}
      </div>

      {bookingRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500 text-lg">
            {userType === 'customer' ? 
              'No quote requests submitted yet.' : 
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
          {bookingRequests.map(request => (
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
                      {request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)} Priority
                    </span>
                    {/* NEW: Show custom quote OR customer counter status */}
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
                            {request.preferred_dates_list.length > 3 && (
                              <p className="text-xs text-gray-500 ml-3">
                                Customer selected {request.preferred_dates_list.length} available dates
                              </p>
                            )}
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
                              src={image.image}
                              alt={`Job photo ${index + 1}`}
                              className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(image.image, '_blank')}
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
                              onClick={() => updateBookingStatus(request.id, 'Accepted')}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                              disabled={isUpdating.current || window.patchworkBookingMutex.isLocked}
                            >
                              {isUpdating.current || window.patchworkBookingMutex.isLocked ? 'Processing...' : `Accept (£${request.tradesman_hourly_rate || 'Standard Rate'}/hour)`}
                            </button>
                            
                            <button
                              onClick={() => {
                                const customQuote = prompt('Enter your custom quote (e.g., £200 fixed price, or £50/hour):');
                                if (customQuote) {
                                  proposeCustomQuote(request.id, customQuote);
                                }
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                              disabled={isUpdating.current || window.patchworkBookingMutex.isLocked}
                            >
                              Custom Quote
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to reject this request?')) {
                                  updateBookingStatus(request.id, 'Rejected');
                                }
                              }}
                              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                              disabled={isUpdating.current || window.patchworkBookingMutex.isLocked}
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
                                onClick={() => acceptCustomerCounter(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
                              >
                                Accept Counter-Offer
                              </button>
                              <button
                                onClick={() => {
                                  const newQuote = prompt('Enter your new counter-quote:');
                                  if (newQuote) {
                                    proposeCustomQuote(request.id, newQuote);
                                  }
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
                              >
                                New Counter-Quote
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Reject this counter-offer? You can then propose a new quote.')) {
                                    rejectCustomerCounter(request.id);
                                  }
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
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
                                onClick={() => acceptCustomQuote(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
                              >
                                Accept Quote
                              </button>
                              <button
                                onClick={() => {
                                  const counterQuote = prompt('Enter your counter-offer (e.g., £150 fixed price, or £40/hour):');
                                  if (counterQuote) {
                                    const reasoning = prompt('Why this price? (optional - helps with negotiation):') || '';
                                    proposeCustomerCounter(request.id, counterQuote, reasoning);
                                  }
                                }}
                                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
                              >
                                Counter-Offer
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to reject this quote? The job will return to the tradesman.')) {
                                    rejectCustomQuote(request.id);
                                  }
                                }}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                                disabled={window.patchworkBookingMutex.isLocked}
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

              {/* Comments Section */}
              <div className="border-t border-gray-200 bg-gray-50">
                <div className="px-6 py-4">
                  <h3 className="font-medium text-gray-900 mb-3">Discussion</h3>
                  
                  {/* Comments List */}
                  <div className="space-y-3 mb-4">
                    {comments[request.id] && comments[request.id].length > 0 ? (
                      <>
                        {console.log('Displaying comments for booking', request.id, ':', comments[request.id])}
                        {comments[request.id].map(comment => (
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
                        ))}
                      </>
                    ) : (
                      <>
                        {console.log('No comments to display for booking', request.id, 'Comments:', comments[request.id])}
                        <p className="text-gray-500 text-sm italic">No comments yet. Start the conversation!</p>
                      </>
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

export default BookingRequests;

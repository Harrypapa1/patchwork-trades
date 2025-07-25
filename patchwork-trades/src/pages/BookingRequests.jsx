import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Add this import
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BookingRequests = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate(); // Add this hook
  const [bookingRequests, setBookingRequests] = useState([]);
  const [comments, setComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchBookingRequests();
    }
  }, [currentUser, userType]);

  const fetchBookingRequests = async () => {
    try {
      let bookingsQuery;
      
      if (userType === 'customer') {
        // Customers see their own requests
        bookingsQuery = query(
          collection(db, 'bookings'),
          where('customer_id', '==', currentUser.uid),
          where('status', '==', 'Quote Requested')
        );
      } else {
        // Tradesmen see requests for them
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

      console.log('Found booking requests:', requests); // Debug log
      setBookingRequests(requests);

      // Fetch comments for each request
      for (const request of requests) {
        fetchComments(request.id);
      }

    } catch (error) {
      console.error('Error fetching booking requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (bookingId) => {
    try {
      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('booking_id', '==', bookingId)
        // Removed orderBy temporarily to fix the real-time listener
      );

      console.log('Setting up real-time listener for booking:', bookingId); // Debug

      // Use real-time listener for comments - with error handling
      const unsubscribe = onSnapshot(commentsQuery, 
        (snapshot) => {
          const bookingComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Sort manually by timestamp
          bookingComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          
          console.log('Comments updated for booking', bookingId, ':', bookingComments); // Debug
          
          setComments(prev => ({
            ...prev,
            [bookingId]: bookingComments
          }));
        },
        (error) => {
          // Handle collection not existing yet
          console.log('Comments collection may not exist yet, initializing empty:', error);
          setComments(prev => ({
            ...prev,
            [bookingId]: []
          }));
        }
      );

      return unsubscribe;

    } catch (error) {
      console.error('Error fetching comments:', error);
      // Initialize empty comments for this booking
      setComments(prev => ({
        ...prev,
        [bookingId]: []
      }));
    }
  };

  const addComment = async (bookingId) => {
    const commentText = newComments[bookingId]?.trim();
    if (!commentText) return;

    console.log('Adding comment for booking:', bookingId, 'Comment:', commentText); // Debug

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

      console.log('Comment data being saved:', commentData); // Debug

      await addDoc(collection(db, 'booking_comments'), commentData);

      // Clear the input
      setNewComments(prev => ({
        ...prev,
        [bookingId]: ''
      }));

      console.log('Comment saved successfully!'); // Debug

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  const updateBookingStatus = async (bookingId, newStatus, customQuote = null) => {
    try {
      const updateData = { status: newStatus };
      if (customQuote) {
        updateData.custom_quote = customQuote;
        updateData.has_custom_quote = true;
      }

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      
      // Refresh the list
      fetchBookingRequests();
      
      // Add system comment
      try {
        await addDoc(collection(db, 'booking_comments'), {
          booking_id: bookingId,
          user_id: currentUser.uid,
          user_type: 'system',
          user_name: 'System',
          comment: customQuote ? 
            `Custom quote proposed: ${customQuote}` : 
            `Booking ${newStatus.toLowerCase()}`,
          timestamp: new Date().toISOString()
        });
      } catch (commentError) {
        console.log('Could not add system comment (collection may not exist yet):', commentError);
      }

    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Error updating booking. Please try again.');
    }
  };

  // NEW: Handle custom quote proposal (keeps status as Quote Requested)
  const proposeCustomQuote = async (bookingId, customQuote) => {
    try {
      const updateData = {
        custom_quote: customQuote,
        has_custom_quote: true,
        // Keep status as 'Quote Requested' so job stays on this page
        status: 'Quote Requested'
      };

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      
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

    } catch (error) {
      console.error('Error proposing custom quote:', error);
      alert('Error proposing custom quote. Please try again.');
    }
  };

  // NEW: Handle customer accepting custom quote
  const acceptCustomQuote = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Accepted'
      });
      
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

    } catch (error) {
      console.error('Error accepting custom quote:', error);
      alert('Error accepting custom quote. Please try again.');
    }
  };

  // NEW: Handle customer rejecting custom quote (bounce back to tradesman)
  const rejectCustomQuote = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        custom_quote: null,
        has_custom_quote: false,
        customer_counter_quote: null,
        has_customer_counter: false,
        quote_reasoning: null,
        // Keep status as 'Quote Requested' so job stays for negotiation
        status: 'Quote Requested'
      });
      
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

    } catch (error) {
      console.error('Error rejecting custom quote:', error);
      alert('Error rejecting custom quote. Please try again.');
    }
  };

  // NEW: Handle customer counter-offer
  const proposeCustomerCounter = async (bookingId, counterQuote, reasoning) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        customer_counter_quote: counterQuote,
        has_customer_counter: true,
        customer_reasoning: reasoning,
        // Clear tradesman quote since customer is countering
        has_custom_quote: false,
        custom_quote: null,
        // Keep status as 'Quote Requested' so job stays for negotiation
        status: 'Quote Requested'
      });
      
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

    } catch (error) {
      console.error('Error proposing counter-offer:', error);
      alert('Error proposing counter-offer. Please try again.');
    }
  };

  // NEW: Handle tradesman accepting customer counter
  const acceptCustomerCounter = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'Accepted'
      });
      
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

    } catch (error) {
      console.error('Error accepting customer counter:', error);
      alert('Error accepting customer counter. Please try again.');
    }
  };

  // NEW: Handle tradesman rejecting customer counter
  const rejectCustomerCounter = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        customer_counter_quote: null,
        has_customer_counter: false,
        customer_reasoning: null,
        // Keep status as 'Quote Requested' so job stays for negotiation
        status: 'Quote Requested'
      });
      
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

    } catch (error) {
      console.error('Error rejecting customer counter:', error);
      alert('Error rejecting customer counter. Please try again.');
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
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                              Accept (£{request.tradesman_hourly_rate || 'Standard Rate'}/hour)
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
                                  updateBookingStatus(request.id, 'Rejected');
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
                                onClick={() => acceptCustomerCounter(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                              >
                                New Counter-Quote
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Reject this counter-offer? You can then propose a new quote.')) {
                                    rejectCustomerCounter(request.id);
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
                                onClick={() => acceptCustomQuote(request.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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

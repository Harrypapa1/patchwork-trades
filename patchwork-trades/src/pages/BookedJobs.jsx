import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  onSnapshot,
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BookedJobs = () => {
  const { currentUser, userType } = useAuth();
  const [bookedJobs, setBookedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobComments, setSelectedJobComments] = useState({});
  const [newComments, setNewComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchBookedJobs();
    }
  }, [currentUser, userType]);

  useEffect(() => {
    // Auto-load comments for all booked jobs when jobs are loaded
    if (bookedJobs.length > 0) {
      bookedJobs.forEach(job => {
        fetchJobComments(job.id);
      });
    }
  }, [bookedJobs]);

  // Helper function to filter jobs by status
  const getActiveJobs = () => bookedJobs.filter(job => job.status === 'Accepted' || job.status === 'In Progress');
  const getCompletedJobs = () => bookedJobs.filter(job => job.status === 'Completed');
  const getCancelledJobs = () => bookedJobs.filter(job => job.status === 'Cancelled');

  // Helper function to get final agreed price
  const getFinalPrice = (job) => {
    if (job.customer_counter_quote && job.status === 'Accepted') {
      return job.customer_counter_quote;
    } else if (job.custom_quote && job.status === 'Accepted') {
      return job.custom_quote;
    } else if (job.tradesman_hourly_rate) {
      return `£${job.tradesman_hourly_rate}/hour`;
    } else {
      return 'Standard Rate';
    }
  };

  // Helper function to extract numeric price for calculations
  const getNumericPrice = (job) => {
    let priceString = '';
    
    if (job.customer_counter_quote && job.status === 'Accepted') {
      priceString = job.customer_counter_quote;
    } else if (job.custom_quote && job.status === 'Accepted') {
      priceString = job.custom_quote;
    } else {
      // For hourly rates, we'll use a default estimate of 4 hours
      const hourlyRate = job.tradesman_hourly_rate || 50;
      return hourlyRate * 4; // 4 hour estimate
    }
    
    // Extract numeric value from price string
    const priceMatch = priceString.match(/£?(\d+)/);
    return priceMatch ? parseInt(priceMatch[1]) : 200; // Default to £200 if can't parse
  };

  const fetchBookedJobs = async () => {
    if (!currentUser) return;
    
    try {
      let jobsQuery;
      
      if (userType === 'customer') {
        // Show jobs where customer is the current user and status is NOT "Quote Requested"
        jobsQuery = query(
          collection(db, 'bookings'),
          where('customer_id', '==', currentUser.uid)
        );
      } else if (userType === 'tradesman') {
        // Show jobs where tradesman is the current user and status is NOT "Quote Requested"
        jobsQuery = query(
          collection(db, 'bookings'),
          where('tradesman_id', '==', currentUser.uid)
        );
      }

      if (jobsQuery) {
        const querySnapshot = await getDocs(jobsQuery);
        const jobsData = [];

        for (const jobDoc of querySnapshot.docs) {
          const jobData = jobDoc.data();
          
          // Only include jobs that are NOT "Quote Requested" (i.e., agreed/contracted jobs)
          if (jobData.status !== 'Quote Requested') {
            // Get customer name
            const customerDoc = await getDoc(doc(db, 'users', jobData.customer_id));
            const customerName = customerDoc.exists() ? customerDoc.data().name : 'Unknown Customer';
            const customerPhoto = customerDoc.exists() ? customerDoc.data().profilePhoto : null;

            // Get tradesman name
            const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', jobData.tradesman_id));
            const tradesmanName = tradesmanDoc.exists() ? tradesmanDoc.data().name : 'Unknown Tradesman';
            const tradesmanPhoto = tradesmanDoc.exists() ? tradesmanDoc.data().profilePhoto : null;

            jobsData.push({
              id: jobDoc.id,
              ...jobData,
              customerName,
              customerPhoto,
              tradesmanName,
              tradesmanPhoto
            });
          }
        }

        // Sort by creation date (newest first)
        jobsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setBookedJobs(jobsData);
      }
    } catch (error) {
      console.error('Error fetching booked jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobComments = async (jobId) => {
    // Always fetch, don't skip if already loaded (to ensure fresh data)
    setLoadingComments(prev => ({ ...prev, [jobId]: true }));

    try {
      // First try with orderBy, fallback if index doesn't exist
      let commentsQuery;
      try {
        commentsQuery = query(
          collection(db, 'booking_comments'),
          where('booking_id', '==', jobId),
          orderBy('created_at', 'asc')
        );
      } catch (indexError) {
        // Fallback query without orderBy if index doesn't exist
        commentsQuery = query(
          collection(db, 'booking_comments'),
          where('booking_id', '==', jobId)
        );
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
        const commentsData = [];
        
        for (const commentDoc of snapshot.docs) {
          const commentData = commentDoc.data();
          
          // Get commenter details
          let commenterName = 'Unknown';
          let commenterPhoto = null;
          
          if (commentData.user_type === 'customer') {
            try {
              const userDoc = await getDoc(doc(db, 'users', commentData.user_id));
              if (userDoc.exists()) {
                commenterName = userDoc.data().name;
                commenterPhoto = userDoc.data().profilePhoto;
              }
            } catch (userError) {
              console.log('Could not fetch user details:', userError);
            }
          } else if (commentData.user_type === 'tradesman') {
            try {
              const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', commentData.user_id));
              if (tradesmanDoc.exists()) {
                commenterName = tradesmanDoc.data().name;
                commenterPhoto = tradesmanDoc.data().profilePhoto;
              }
            } catch (tradesmanError) {
              console.log('Could not fetch tradesman details:', tradesmanError);
            }
          } else {
            // System comments
            commenterName = 'System';
          }
          
          commentsData.push({
            id: commentDoc.id,
            ...commentData,
            commenterName,
            commenterPhoto
          });
        }

        // Sort manually by created_at if we couldn't use orderBy
        commentsData.sort((a, b) => new Date(a.created_at || a.timestamp || 0) - new Date(b.created_at || b.timestamp || 0));
        
        console.log(`Loaded ${commentsData.length} comments for job ${jobId}:`, commentsData); // Debug log
        
        setSelectedJobComments(prev => ({
          ...prev,
          [jobId]: { comments: commentsData, unsubscribe }
        }));
        setLoadingComments(prev => ({ ...prev, [jobId]: false }));
      }, (error) => {
        console.error('Error in comments listener:', error);
        setLoadingComments(prev => ({ ...prev, [jobId]: false }));
        // Set empty comments array on error
        setSelectedJobComments(prev => ({
          ...prev,
          [jobId]: { comments: [], unsubscribe: null }
        }));
      });

    } catch (error) {
      console.error('Error setting up comments listener:', error);
      setLoadingComments(prev => ({ ...prev, [jobId]: false }));
      // Set empty comments array on error
      setSelectedJobComments(prev => ({
        ...prev,
        [jobId]: { comments: [], unsubscribe: null }
      }));
    }
  };

  const submitComment = async (jobId) => {
    const commentText = newComments[jobId]?.trim();
    if (!commentText) return;

    setSubmittingComment(prev => ({ ...prev, [jobId]: true }));

    try {
      await addDoc(collection(db, 'booking_comments'), {
        booking_id: jobId,
        user_id: currentUser.uid,
        user_type: userType,
        comment: commentText,
        created_at: new Date().toISOString()
      });
      
      // Clear the comment input
      setNewComments(prev => ({ ...prev, [jobId]: '' }));
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Error submitting comment. Please try again.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const updateJobStatus = async (jobId, newStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', jobId), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      
      // Refresh the jobs list
      fetchBookedJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Error updating job status. Please try again.');
    }
  };

  const cancelJob = async (jobId) => {
    try {
      const job = bookedJobs.find(j => j.id === jobId);
      if (!job) return;

      let confirmMessage;
      let cancellationFee = 0;
      let cancellationPercentage = 0;
      const basePrice = getNumericPrice(job); // Calculate once for use throughout

      if (userType === 'customer') {
        // Calculate time until job
        const jobDate = new Date(job.requested_date);
        const currentDate = new Date();
        const timeDiff = jobDate.getTime() - currentDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        // Determine cancellation percentage based on notice period
        if (daysDiff > 7) {
          cancellationPercentage = 10;
        } else if (daysDiff > 2) {
          cancellationPercentage = 20;
        } else {
          cancellationPercentage = 50;
        }

        // Calculate fee based on agreed price
        cancellationFee = Math.round((basePrice * cancellationPercentage) / 100);

        let noticeText;
        if (daysDiff > 7) {
          noticeText = `More than 1 week notice (${daysDiff} days)`;
        } else if (daysDiff > 2) {
          noticeText = `Less than 1 week notice (${daysDiff} days)`;
        } else if (daysDiff >= 0) {
          noticeText = `2 days or less notice (${daysDiff} days)`;
        } else {
          noticeText = `Job date has passed`;
        }

        confirmMessage = `⚠️ JOB CANCELLATION NOTICE ⚠️

Job: ${job.job_title}
Tradesman: ${job.tradesmanName}
Scheduled Date: ${job.requested_date}
Agreed Price: ${getFinalPrice(job)}

CANCELLATION TERMS:
${noticeText}
Cancellation Fee: ${cancellationPercentage}% = £${cancellationFee}

This fee compensates the tradesman for:
• Blocking their calendar
• Turning down other work
• Preparation time invested

The remaining amount (£${basePrice - cancellationFee}) will be refunded to you.

Do you wish to proceed with the cancellation?`;

      } else {
        // Tradesman cancellation
        confirmMessage = `⚠️ TRADESMAN CANCELLATION WARNING ⚠️

Job: ${job.job_title}
Customer: ${job.customerName}
Scheduled Date: ${job.requested_date}

CANCELLATION CONSEQUENCES:
• This cancellation may negatively affect your reviews
• Compensation may be deducted from your next completed job
• Customer will be notified immediately
• This may impact your future booking opportunities

Professional tradesmen honor their commitments. Are you sure you want to cancel this job?

Only proceed if you have a genuine emergency or unavoidable circumstance.`;
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      // Update job status to cancelled
      const updateData = {
        status: 'Cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userType,
        updated_at: new Date().toISOString()
      };

      if (userType === 'customer') {
        updateData.cancellation_fee_applied = cancellationFee;
        updateData.cancellation_percentage = cancellationPercentage;
        updateData.refund_amount = basePrice - cancellationFee;
      }

      await updateDoc(doc(db, 'bookings', jobId), updateData);

      // Add system comment about cancellation
      try {
        let cancellationMessage;
        if (userType === 'customer') {
          cancellationMessage = `Job cancelled by customer with ${cancellationPercentage}% fee (£${cancellationFee}). Refund amount: £${basePrice - cancellationFee}`;
        } else {
          cancellationMessage = 'Job cancelled by tradesman. Customer has been notified. This cancellation may affect future reviews and earnings.';
        }

        await addDoc(collection(db, 'booking_comments'), {
          booking_id: jobId,
          user_id: currentUser.uid,
          user_type: 'system',
          comment: cancellationMessage,
          created_at: new Date().toISOString()
        });
      } catch (commentError) {
        console.error('Error adding cancellation comment:', commentError);
      }

      // Show confirmation message
      if (userType === 'customer') {
        alert(`✅ Job cancelled successfully.

PAYMENT SUMMARY:
• Cancellation fee: £${cancellationFee} (${cancellationPercentage}%)
• Refund amount: £${basePrice - cancellationFee}

The tradesman has been notified and compensated for their time.
Your refund will be processed within 3-5 business days.`);
      } else {
        alert(`⚠️ Job cancelled.

The customer has been notified of the cancellation.

IMPORTANT REMINDERS:
• This cancellation is recorded on your profile
• Future customers may see cancellation history
• Consider offering the customer priority booking for future jobs
• Professional communication is essential for maintaining reputation`);
      }
      
      // Refresh the jobs list
      fetchBookedJobs();
      
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Error cancelling job. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">Loading booked jobs...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Booked Jobs</h1>
        <p className="text-gray-600 mt-2">
          {userType === 'customer' 
            ? 'Your contractually agreed jobs' 
            : 'Jobs you\'ve been hired for'
          }
        </p>
      </div>

      {/* Active Jobs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Jobs</h2>
        {getActiveJobs().length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-lg font-medium">No Active Jobs</h3>
              <p className="text-sm">
                {userType === 'customer' 
                  ? 'Active jobs will appear here once quotes are accepted'
                  : 'Accepted jobs will appear here'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {getActiveJobs().map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            showCompleted 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showCompleted ? 'Hide' : 'Show'} Completed Jobs ({getCompletedJobs().length})
        </button>
        
        <button
          onClick={() => setShowCancelled(!showCancelled)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            showCancelled 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showCancelled ? 'Hide' : 'Show'} Cancelled Jobs ({getCancelledJobs().length})
        </button>
      </div>

      {/* Completed Jobs Section */}
      {showCompleted && (
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Completed Jobs</h2>
            <p className="text-green-700 text-sm">Successfully finished projects</p>
          </div>
          
          {getCompletedJobs().length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No completed jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {getCompletedJobs().map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancelled Jobs Section */}
      {showCancelled && (
        <div className="mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold text-red-800 mb-2">🚫 Cancelled Jobs</h2>
            <p className="text-red-700 text-sm">Jobs that were cancelled before completion</p>
          </div>
          
          {getCancelledJobs().length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No cancelled jobs.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {getCancelledJobs().map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Job Card Component
  function JobCard({ job }) {
    return (
      <div className={`bg-white rounded-lg shadow-md border-l-4 ${
        job.status === 'Completed' ? 'border-green-500' :
        job.status === 'Cancelled' ? 'border-red-500' :
        'border-blue-500'
      }`}>
        <div className="p-6">
          {/* Job Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{job.job_title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-2">
                  {userType === 'customer' ? (
                    <>
                      {job.tradesmanPhoto ? (
                        <img src={job.tradesmanPhoto} alt="Tradesman" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                      )}
                      <span><strong>Tradesman:</strong> {job.tradesmanName}</span>
                    </>
                  ) : (
                    <>
                      {job.customerPhoto ? (
                        <img src={job.customerPhoto} alt="Customer" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                      )}
                      <span><strong>Customer:</strong> {job.customerName}</span>
                    </>
                  )}
                </div>
                <span><strong>Date:</strong> {job.requested_date}</span>
                <span className="text-green-600 font-semibold"><strong>Final Price:</strong> {getFinalPrice(job)}</span>
              </div>

              <div className="text-sm text-gray-500 mb-3">
                <span>Requested: {new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Job Description</h3>
            <p className="text-gray-700 whitespace-pre-line">{job.job_description}</p>
          </div>

          {/* Job Photos - Always visible if they exist */}
          {job.photos && job.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Job Photos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {job.photos.map((photo, index) => (
                  <img 
                    key={index}
                    src={photo} 
                    alt={`Job photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {job.additional_notes && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Additional Notes</h3>
              <p className="text-gray-700 whitespace-pre-line">{job.additional_notes}</p>
            </div>
          )}

          {/* Job Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* Status Update Buttons for Tradesmen */}
            {userType === 'tradesman' && (
              <>
                {job.status === 'Accepted' && (
                  <button
                    onClick={() => updateJobStatus(job.id, 'In Progress')}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                  >
                    Mark In Progress
                  </button>
                )}
                {job.status === 'In Progress' && (
                  <button
                    onClick={() => updateJobStatus(job.id, 'Completed')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Mark Complete
                  </button>
                )}
              </>
            )}

            {/* Cancel Job Button - Available for both user types on active jobs */}
            {job.status !== 'Completed' && job.status !== 'Cancelled' && (
              <button
                onClick={() => cancelJob(job.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors border-2 border-red-600"
              >
                Cancel Job
              </button>
            )}

            {/* Additional Actions for Completed Jobs */}
            {job.status === 'Completed' && (
              <div className="flex gap-2">
                {userType === 'customer' && (
                  <>
                    <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors">
                      Leave Review
                    </button>
                    <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">
                      Hire Again
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Show cancellation details if job was cancelled */}
            {job.status === 'Cancelled' && (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <span className="text-lg">🚫</span>
                  <span className="font-semibold">Job Cancelled</span>
                </div>
                <div className="text-red-700 text-sm space-y-1">
                  <p><strong>Cancelled on:</strong> {new Date(job.cancelled_at || job.updated_at).toLocaleDateString()}</p>
                  <p><strong>Cancelled by:</strong> {job.cancelled_by === 'customer' ? 'Customer' : 'Tradesman'}</p>
                  {job.cancelled_by === 'customer' && job.cancellation_fee_applied > 0 && (
                    <>
                      <p><strong>Cancellation fee:</strong> £{job.cancellation_fee_applied} ({job.cancellation_percentage}%)</p>
                      {job.refund_amount && (
                        <p><strong>Refund amount:</strong> £{job.refund_amount}</p>
                      )}
                    </>
                  )}
                  {job.cancelled_by === 'tradesman' && (
                    <p className="text-orange-700 font-medium">⚠️ Tradesman cancellation may affect future reviews</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Discussion Section - Always Visible */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4">Complete Discussion History</h3>
            
            {selectedJobComments[job.id] ? (
              <>
                <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                  {selectedJobComments[job.id].comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No comments yet for this job.</p>
                  ) : (
                    selectedJobComments[job.id].comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {comment.commenterPhoto ? (
                            <img 
                              src={comment.commenterPhoto} 
                              alt={comment.commenterName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                              {comment.commenterName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">{comment.commenterName}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              comment.user_type === 'customer' ? 'bg-blue-100 text-blue-800' : 
                              comment.user_type === 'tradesman' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {comment.user_type === 'customer' ? 'Customer' : 
                               comment.user_type === 'tradesman' ? 'Tradesman' : 'System'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Comment */}
                <div className="flex gap-3">
                  <textarea
                    value={newComments[job.id] || ''}
                    onChange={(e) => setNewComments(prev => ({ ...prev, [job.id]: e.target.value }))}
                    placeholder="Add a comment about this job..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    disabled={submittingComment[job.id]}
                  />
                  <button
                    onClick={() => submitComment(job.id)}
                    disabled={!newComments[job.id]?.trim() || submittingComment[job.id]}
                    className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors self-end"
                  >
                    {submittingComment[job.id] ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">Loading discussion history...</div>
            )}
          </div>
        </div>
      </div>
    );
  }
      </div>
    );
  }

};

export default BookedJobs;

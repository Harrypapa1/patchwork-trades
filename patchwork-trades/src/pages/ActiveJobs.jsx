import React, { useState, useEffect, useCallback } from 'react';
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
  updateDoc,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import LazyImage from '../components/LazyImage';

const JOBS_PER_PAGE = 5; // Limit initial load

// Review Modal Component (same as your existing)
const ReviewModal = ({ isOpen, onClose, job, onSubmitReview }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a star rating');
      return;
    }
    
    if (comment.trim().length < 10) {
      alert('Please write at least 10 characters for your review');
      return;
    }

    setSubmitting(true);
    
    try {
      await onSubmitReview({
        rating,
        comment: comment.trim(),
        jobId: job.id,
        tradesmanId: job.tradesman_id
      });
      
      // Reset form
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Leave a Review</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Review {job.tradesman_name} for: {job.job_title}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Overall Rating *
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="text-3xl transition-colors focus:outline-none"
                >
                  <span 
                    className={`${
                      star <= (hoveredRating || rating) 
                        ? 'text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600">
                {rating > 0 && (
                  rating === 1 ? 'Poor' :
                  rating === 2 ? 'Fair' :
                  rating === 3 ? 'Good' :
                  rating === 4 ? 'Very Good' :
                  'Excellent'
                )}
              </span>
            </div>
          </div>

          {/* Written Review */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share details of your experience. What did the tradesman do well? How was their communication, punctuality, and quality of work?"
              maxLength="500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/500 characters (minimum 10)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0 || comment.trim().length < 10}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Lightweight JobCard - only load comments when expanded (same structure as your existing)
const JobCard = React.memo(({ 
  job, 
  userType, 
  isExpanded,
  onToggleExpand,
  comments, 
  newComments, 
  setNewComments, 
  submittingComment, 
  onSubmitComment, 
  onUpdateJobStatus, 
  onCancelJob,
  onOpenReviewModal,
  onHireAgain,
  getFinalPrice,
  getStatusColor,
  formatDate 
}) => {
  // Helper function to get job date (updated for new data structure)
  const getJobDate = (job) => {
    if (job.agreed_date) {
      return new Date(job.agreed_date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long' 
      });
    } else if (job.preferred_dates_list?.[0]) {
      return new Date(job.preferred_dates_list[0]).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long' 
      });
    } else {
      return 'Date TBD';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${
      job.status === 'completed' ? 'border-green-500' :
      job.status === 'cancelled' ? 'border-red-500' :
      'border-blue-500'
    }`}>
      <div className="p-6">
        {/* Job Header - Always visible */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{job.job_title}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-2">
                {userType === 'customer' ? (
                  <>
                    {job.tradesman_photo ? (
                      <LazyImage 
                        src={job.tradesman_photo} 
                        alt="Tradesman" 
                        className="w-6 h-6 rounded-full object-cover"
                        width="24px"
                        height="24px"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    )}
                    <span><strong>Tradesman:</strong> {job.tradesman_name}</span>
                  </>
                ) : (
                  <>
                    {job.customer_photo ? (
                      <LazyImage 
                        src={job.customer_photo} 
                        alt="Customer" 
                        className="w-6 h-6 rounded-full object-cover"
                        width="24px"
                        height="24px"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    )}
                    <span><strong>Customer:</strong> {job.customer_name}</span>
                  </>
                )}
              </div>
              <span><strong>Date:</strong> {getJobDate(job)}</span>
              <span className="text-green-600 font-semibold"><strong>Final Price:</strong> {getFinalPrice(job)}</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => onToggleExpand(job.id)}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded mb-4 transition-colors"
        >
          {isExpanded ? '▲ Hide Details' : '▼ Show Details & Comments'}
        </button>

        {/* Expandable Content - Only load when expanded */}
        {isExpanded && (
          <>
            {/* Job Description */}
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">Job Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{job.job_description}</p>
            </div>

            {/* Job Photos - Updated field name */}
            {job.job_images && job.job_images.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Job Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {job.job_images.map((photo, index) => (
                    <LazyImage
                      key={index}
                      src={typeof photo === 'string' ? photo : photo.image} 
                      alt={`Job photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      width="100%"
                      height="96px"  
                      onClick={() => window.open(typeof photo === 'string' ? photo : photo.image, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completion Photos - New field */}
            {job.completion_photos && job.completion_photos.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Completion Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {job.completion_photos.map((photo, index) => (
                    <LazyImage
                      key={index}
                      src={photo} 
                      alt={`Completion photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity border-green-300"
                      width="100%"
                      height="96px"  
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

            {/* Progress Notes - New field */}
            {job.progress_notes && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Progress Notes</h3>
                <p className="text-gray-700 whitespace-pre-line">{job.progress_notes}</p>
              </div>
            )}

            {/* Job Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              {/* Status Update Buttons for Tradesmen */}
              {userType === 'tradesman' && (
                <>
                  {job.status === 'accepted' && (
                    <button
                      onClick={() => onUpdateJobStatus(job.id, 'in_progress')}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
                    >
                      Mark In Progress
                    </button>
                  )}
                  {job.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateJobStatus(job.id, 'pending_approval')}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                    >
                      Submit for Approval
                    </button>
                  )}
                </>
              )}

              {/* Cancel Job Button */}
              {job.status !== 'completed' && job.status !== 'cancelled' && 
               !(userType === 'tradesman' && job.status === 'pending_approval') && (
                <button
                  onClick={() => onCancelJob(job.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors border-2 border-red-600"
                >
                  Cancel Job
                </button>
              )}

              {/* Additional Actions for Completed Jobs */}
              {job.status === 'completed' && (
                <div className="flex gap-2">
                  {userType === 'customer' && (
                    <>
                      {!job.reviewed_by_customer ? (
                        <button 
                          onClick={() => onOpenReviewModal(job)}
                          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
                        >
                          Leave Review
                        </button>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm font-medium">
                          ✅ Review Left
                        </span>
                      )}
                      <button 
                        onClick={() => onHireAgain(job.tradesman_id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                      >
                        Hire Again
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Cancellation details */}
              {job.status === 'cancelled' && (
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
                  </div>
                </div>
              )}
            </div>

            {/* Discussion Section - Only when expanded */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-4">Discussion History</h3>
              
              {/* Comments List */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {comments && comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border">
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
                          {formatDate(comment.timestamp || comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-line">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No comments yet.</p>
                )}
              </div>

              {/* Add New Comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComments[job.id] || ''}
                  onChange={(e) => setNewComments(prev => ({ ...prev, [job.id]: e.target.value }))}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && onSubmitComment(job.id)}
                  disabled={submittingComment[job.id]}
                />
                <button
                  onClick={() => onSubmitComment(job.id)}
                  disabled={!newComments[job.id]?.trim() || submittingComment[job.id]}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {submittingComment[job.id] ? 'Posting...' : 'Comment'}
                </button>
              </div>

              {/* Job Completion Workflow */}
              <div className="mt-4 pt-4 border-t">
                {/* Tradesman: Submit for Customer Approval */}
                {userType === 'tradesman' && job.status === 'in_progress' && (
                  <button
                    onClick={() => onUpdateJobStatus(job.id, 'pending_approval')}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    ✅ Submit Job for Customer Approval
                  </button>
                )}

                {/* Customer: Approve Completion */}
                {userType === 'customer' && job.status === 'pending_approval' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800 mb-3">
                      <span className="text-lg">⏳</span>
                      <span className="font-semibold">Job submitted for your approval</span>
                    </div>
                    <p className="text-yellow-700 text-sm mb-4">
                      The tradesman has marked this job as complete. Please verify the work and approve if satisfied.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => onUpdateJobStatus(job.id, 'completed')}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors font-medium"
                      >
                        ✅ Approve & Mark Complete
                      </button>
                      <button
                        onClick={() => onUpdateJobStatus(job.id, 'in_progress')}
                        className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors"
                      >
                        🔄 Request Changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Pending Approval Status for Tradesman */}
                {userType === 'tradesman' && job.status === 'pending_approval' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <span className="text-lg">⏳</span>
                      <span className="font-semibold">Awaiting customer approval</span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      You've submitted this job for approval. The customer will review and confirm completion.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// 🚀 NEW ACTIVE JOBS COMPONENT - Connected to active_jobs collection
const ActiveJobs = () => {
  const { currentUser, userType } = useAuth();
  const [activeJobs, setActiveJobs] = useState([]); // Renamed from bookedJobs
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({}); 
  const [newComments, setNewComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState({}); // Track which jobs are expanded
  const [commentsListeners, setCommentsListeners] = useState({}); // Track active listeners
  
  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingJob, setReviewingJob] = useState(null);

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
      fetchActiveJobs();
    }
  }, [currentUser, userType]);

  // Only load comments when job is expanded
  const handleToggleExpand = useCallback((jobId) => {
    setExpandedJobs(prev => {
      const isCurrentlyExpanded = prev[jobId];
      const newExpanded = { ...prev, [jobId]: !isCurrentlyExpanded };
      
      // If expanding and don't have comments yet, load them
      if (!isCurrentlyExpanded && !comments[jobId]) {
        fetchJobComments(jobId);
      }
      
      return newExpanded;
    });
  }, [comments]);

  // 🆕 NEW: Handle Hire Again functionality
  const handleHireAgain = useCallback((tradesmanId) => {
    // Redirect to booking page for this specific tradesman
    window.location.href = `/booking-request?tradesman=${tradesmanId}`;
  }, []);

  // Helper functions
  const getActiveJobs = () => activeJobs.filter(job => job.status === 'accepted' || job.status === 'in_progress' || job.status === 'pending_approval');
  const getCompletedJobs = () => activeJobs.filter(job => job.status === 'completed');
  const getCancelledJobs = () => activeJobs.filter(job => job.status === 'cancelled');

  const getFinalPrice = (job) => {
    if (job.final_price) {
      return job.final_price; // New field in active_jobs
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

  const getNumericPrice = (job) => {
    let priceString = getFinalPrice(job);
    
    const priceMatch = priceString.match(/£?(\d+)/);
    return priceMatch ? parseInt(priceMatch[1]) : 200;
  };

  // 🎯 CONNECT TO NEW active_jobs COLLECTION
  const fetchActiveJobs = async () => {
    if (!currentUser) return;
    
    try {
      let jobsQuery;
      
      if (userType === 'customer') {
        jobsQuery = query(
          collection(db, 'active_jobs'), // 🆕 NEW COLLECTION
          where('customer_id', '==', currentUser.uid),
          limit(JOBS_PER_PAGE) // Limit initial load
        );
      } else if (userType === 'tradesman') {
        jobsQuery = query(
          collection(db, 'active_jobs'), // 🆕 NEW COLLECTION
          where('tradesman_id', '==', currentUser.uid),
          limit(JOBS_PER_PAGE) // Limit initial load
        );
      }

      if (jobsQuery) {
        const querySnapshot = await getDocs(jobsQuery);
        const jobsData = [];

        for (const jobDoc of querySnapshot.docs) {
          const jobData = jobDoc.data();
          
          // No need to filter by status - all records in active_jobs are actual jobs
          // No need to fetch user names - they're already in the job data
          jobsData.push({
            id: jobDoc.id,
            ...jobData
          });
        }

        jobsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setActiveJobs(jobsData);
      }
    } catch (error) {
      console.error('Error fetching active jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 ENHANCED COMMENTS FOR NEW ARCHITECTURE
  const fetchJobComments = async (jobId) => {
    try {
      const commentsQuery = query(
        collection(db, 'booking_comments'),
        where('active_job_id', '==', jobId) // 🆕 NEW FIELD
      );

      const unsubscribe = onSnapshot(commentsQuery, 
        (snapshot) => {
          const jobComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          jobComments.sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
          
          setComments(prev => ({
            ...prev,
            [jobId]: jobComments
          }));
        },
        (error) => {
          console.log('Comments collection may not exist yet:', error);
          setComments(prev => ({
            ...prev,
            [jobId]: []
          }));
        }
      );

      // Track listener for cleanup
      setCommentsListeners(prev => ({
        ...prev,
        [jobId]: unsubscribe
      }));

    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(prev => ({
        ...prev,
        [jobId]: []
      }));
    }
  };

  const handleSubmitComment = useCallback(async (jobId) => {
    const commentText = newComments[jobId]?.trim();
    if (!commentText) return;

    setSubmittingComment(prev => ({ ...prev, [jobId]: true }));

    try {
      const job = activeJobs.find(j => j.id === jobId);
      const userName = userType === 'customer' ? job?.customer_name : job?.tradesman_name;
      
      const commentData = {
        active_job_id: jobId, // 🆕 NEW FIELD
        booking_id: null, // Legacy field for backward compatibility
        user_id: currentUser.uid,
        user_type: userType,
        user_name: userName || 'Unknown',
        comment: commentText,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'booking_comments'), commentData);
      setNewComments(prev => ({ ...prev, [jobId]: '' }));

      // EMAIL NOTIFICATION FOR NEW COMMENT
      if (job) {
        const recipientIsCustomer = userType === 'tradesman';
        const recipientEmail = recipientIsCustomer ? job.customer_email : job.tradesman_email;
        const recipientName = recipientIsCustomer ? job.customer_name : job.tradesman_name;
        const senderName = recipientIsCustomer ? job.tradesman_name : job.customer_name;

        await sendEmailNotification({
          recipientEmail: recipientEmail,
          recipientName: recipientName,
          senderName: senderName,
          messageText: `New comment on your job "${job.job_title}": ${commentText}`,
          replyLink: `https://patchworktrades.com/active-jobs`
        });
      }
      
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Error submitting comment. Please try again.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [jobId]: false }));
    }
  }, [newComments, activeJobs, userType, currentUser.uid]);

  const handleUpdateJobStatus = useCallback(async (jobId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Add completion timestamp for completed jobs
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      await updateDoc(doc(db, 'active_jobs', jobId), updateData);
      
      // Add system comment for status changes
      let statusMessage = '';
      if (newStatus === 'pending_approval') {
        statusMessage = 'Tradesman has submitted job for customer approval';
      } else if (newStatus === 'completed') {
        statusMessage = 'Customer approved job completion';
      } else if (newStatus === 'in_progress') {
        statusMessage = 'Customer requested changes - job returned to in progress';
      } else {
        statusMessage = `Job status updated to: ${newStatus.replace('_', ' ')}`;
      }

      await addDoc(collection(db, 'booking_comments'), {
        active_job_id: jobId, // 🆕 NEW FIELD
        booking_id: null, // Legacy field
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: statusMessage,
        timestamp: new Date().toISOString()
      });

      // EMAIL NOTIFICATIONS FOR STATUS CHANGES
      const job = activeJobs.find(j => j.id === jobId);
      if (job) {
        if (newStatus === 'in_progress') {
          await sendEmailNotification({
            recipientEmail: job.customer_email,
            recipientName: job.customer_name,
            senderName: job.tradesman_name,
            messageText: `${job.tradesman_name} has started work on your job "${job.job_title}".`,
            replyLink: `https://patchworktrades.com/active-jobs`
          });
        } else if (newStatus === 'pending_approval') {
          await sendEmailNotification({
            recipientEmail: job.customer_email,
            recipientName: job.customer_name,
            senderName: job.tradesman_name,
            messageText: `${job.tradesman_name} has completed your job "${job.job_title}" and is requesting your approval. Please review the work.`,
            replyLink: `https://patchworktrades.com/active-jobs`
          });
        } else if (newStatus === 'completed') {
          await sendEmailNotification({
            recipientEmail: job.tradesman_email,
            recipientName: job.tradesman_name,
            senderName: job.customer_name,
            messageText: `Congratulations! ${job.customer_name} has approved and marked your job "${job.job_title}" as completed.`,
            replyLink: `https://patchworktrades.com/active-jobs`
          });
        }
      }
      
      fetchActiveJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      alert('Error updating job status. Please try again.');
    }
  }, [currentUser.uid, activeJobs]);

  const handleCancelJob = useCallback(async (jobId) => {
    try {
      const job = activeJobs.find(j => j.id === jobId);
      if (!job) return;

      let confirmMessage;
      let cancellationFee = 0;
      let cancellationPercentage = 0;
      const basePrice = getNumericPrice(job);

      if (userType === 'customer') {
        const jobDate = new Date(job.agreed_date || job.created_at);
        const currentDate = new Date();
        const timeDiff = jobDate.getTime() - currentDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff > 7) {
          cancellationPercentage = 10;
        } else if (daysDiff > 2) {
          cancellationPercentage = 20;
        } else {
          cancellationPercentage = 50;
        }

        cancellationFee = Math.round((basePrice * cancellationPercentage) / 100);

        confirmMessage = `⚠️ JOB CANCELLATION NOTICE ⚠️

Job: ${job.job_title}
Cancellation Fee: ${cancellationPercentage}% = £${cancellationFee}
Refund: £${basePrice - cancellationFee}

Do you wish to proceed?`;

      } else {
        confirmMessage = `⚠️ TRADESMAN CANCELLATION WARNING ⚠️

This may negatively affect your reviews.
Are you sure you want to cancel?`;
      }

      if (!confirm(confirmMessage)) return;

      const updateData = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userType,
        updated_at: new Date().toISOString()
      };

      if (userType === 'customer') {
        updateData.cancellation_fee_applied = cancellationFee;
        updateData.cancellation_percentage = cancellationPercentage;
        updateData.refund_amount = basePrice - cancellationFee;
      }

      await updateDoc(doc(db, 'active_jobs', jobId), updateData);

      // Add system comment
      let cancellationMessage;
      if (userType === 'customer') {
        cancellationMessage = `Job cancelled by customer with ${cancellationPercentage}% fee (£${cancellationFee}). Refund: £${basePrice - cancellationFee}`;
      } else {
        cancellationMessage = 'Job cancelled by tradesman. Customer notified.';
      }

      await addDoc(collection(db, 'booking_comments'), {
        active_job_id: jobId, // 🆕 NEW FIELD
        booking_id: null, // Legacy field
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: cancellationMessage,
        timestamp: new Date().toISOString()
      });

      // EMAIL NOTIFICATIONS FOR JOB CANCELLATION
      const recipientIsCustomer = userType === 'tradesman';
      const recipientEmail = recipientIsCustomer ? job.customer_email : job.tradesman_email;
      const recipientName = recipientIsCustomer ? job.customer_name : job.tradesman_name;
      const senderName = recipientIsCustomer ? job.tradesman_name : job.customer_name;

      let emailMessage;
      if (userType === 'customer') {
        emailMessage = `Your job "${job.job_title}" has been cancelled by ${job.customer_name}. Cancellation fee: ${cancellationPercentage}% (£${cancellationFee}).`;
      } else {
        emailMessage = `Unfortunately, ${job.tradesman_name} has cancelled your job "${job.job_title}". You will receive a full refund.`;
      }

      await sendEmailNotification({
        recipientEmail: recipientEmail,
        recipientName: recipientName,
        senderName: senderName,
        messageText: emailMessage,
        replyLink: `https://patchworktrades.com/active-jobs`
      });

      fetchActiveJobs();
      
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Error cancelling job. Please try again.');
    }
  }, [activeJobs, userType, getNumericPrice, currentUser.uid]);

  // Handle opening review modal
  const handleOpenReviewModal = useCallback((job) => {
    setReviewingJob(job);
    setReviewModalOpen(true);
  }, []);

  // Handle review submission (same as your existing)
  const handleSubmitReview = useCallback(async (reviewData) => {
    try {
      // Get current tradesman profile
      const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', reviewData.tradesmanId));
      
      if (!tradesmanDoc.exists()) {
        throw new Error('Tradesman profile not found');
      }

      const tradesmanData = tradesmanDoc.data();
      const currentReviews = tradesmanData.reviews || [];
      const currentJobsCount = tradesmanData.completed_jobs_count || 0;

      // Create new review object
      const newReview = {
        rating: reviewData.rating,
        comment: reviewData.comment,
        customer_name: activeJobs.find(j => j.id === reviewData.jobId)?.customer_name || 'Anonymous',
        date: new Date().toISOString(),
        job_id: reviewData.jobId
      };

      // Add new review to array
      const updatedReviews = [...currentReviews, newReview];

      // Calculate new average rating
      const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
      const newAverageRating = Number((totalRating / updatedReviews.length).toFixed(1));

      // Update tradesman profile
      await updateDoc(doc(db, 'tradesmen_profiles', reviewData.tradesmanId), {
        reviews: updatedReviews,
        average_rating: newAverageRating,
        completed_jobs_count: currentJobsCount + 1
      });
      
      // Mark job as reviewed to prevent duplicate reviews
      await updateDoc(doc(db, 'active_jobs', reviewData.jobId), {
        reviewed_by_customer: true,
        review_submitted_at: new Date().toISOString()
      });

      // Add system comment
      await addDoc(collection(db, 'booking_comments'), {
        active_job_id: reviewData.jobId, // 🆕 NEW FIELD
        booking_id: null, // Legacy field
        user_id: currentUser.uid,
        user_type: 'system',
        user_name: 'System',
        comment: `Customer left a ${reviewData.rating}-star review: "${reviewData.comment}"`,
        timestamp: new Date().toISOString()
      });

      // EMAIL NOTIFICATION FOR REVIEW SUBMISSION
      const job = activeJobs.find(j => j.id === reviewData.jobId);
      if (job) {
        await sendEmailNotification({
          recipientEmail: job.tradesman_email,
          recipientName: job.tradesman_name,
          senderName: job.customer_name,
          messageText: `Great news! ${job.customer_name} has left you a ${reviewData.rating}-star review for "${job.job_title}": "${reviewData.comment}"`,
          replyLink: `https://patchworktrades.com/tradesman-dashboard`
        });
      }

      // Refresh jobs to show review status
      fetchActiveJobs();
      
      alert('Review submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error; // Re-throw to let modal handle error display
    }
  }, [currentUser.uid, activeJobs]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_approval': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(commentsListeners).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [commentsListeners]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Active Jobs</h1>
        <p className="text-gray-600 mt-2">
          {userType === 'customer' 
            ? 'Your confirmed jobs and their progress' 
            : 'Jobs you\'ve been hired for'
          }
        </p>
      </div>

      {/* Active Jobs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Jobs</h2>
        {getActiveJobs().length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">📋</div>
              <h3 className="text-lg font-medium">No Active Jobs</h3>
              <p className="text-sm">Jobs from accepted quotes will appear here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {getActiveJobs().map((job) => (
              <JobCard 
                key={job.id} 
                job={job}
                userType={userType}
                isExpanded={expandedJobs[job.id]}
                onToggleExpand={handleToggleExpand}
                comments={comments[job.id] || []}
                newComments={newComments}
                setNewComments={setNewComments}
                submittingComment={submittingComment}
                onSubmitComment={handleSubmitComment}
                onUpdateJobStatus={handleUpdateJobStatus}
                onCancelJob={handleCancelJob}
                onOpenReviewModal={handleOpenReviewModal}
                onHireAgain={handleHireAgain}
                getFinalPrice={getFinalPrice}
                getStatusColor={getStatusColor}
                formatDate={formatDate}
              />
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
          {showCompleted ? 'Hide' : 'Show'} Completed ({getCompletedJobs().length})
        </button>
        
        <button
          onClick={() => setShowCancelled(!showCancelled)}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            showCancelled 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showCancelled ? 'Hide' : 'Show'} Cancelled ({getCancelledJobs().length})
        </button>
      </div>

      {/* Completed Jobs Section */}
      {showCompleted && (
        <div className="mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold text-green-800">✅ Completed Jobs</h2>
          </div>
          
          {getCompletedJobs().length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No completed jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {getCompletedJobs().map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job}
                  userType={userType}
                  isExpanded={expandedJobs[job.id]}
                  onToggleExpand={handleToggleExpand}
                  comments={comments[job.id] || []}
                  newComments={newComments}
                  setNewComments={setNewComments}
                  submittingComment={submittingComment}
                  onSubmitComment={handleSubmitComment}
                  onUpdateJobStatus={handleUpdateJobStatus}
                  onCancelJob={handleCancelJob}
                  onOpenReviewModal={handleOpenReviewModal}
                  onHireAgain={handleHireAgain}
                  getFinalPrice={getFinalPrice}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancelled Jobs Section */}
      {showCancelled && (
        <div className="mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold text-red-800">🚫 Cancelled Jobs</h2>
          </div>
          
          {getCancelledJobs().length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No cancelled jobs.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {getCancelledJobs().map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job}
                  userType={userType}
                  isExpanded={expandedJobs[job.id]}
                  onToggleExpand={handleToggleExpand}
                  comments={comments[job.id] || []}
                  newComments={newComments}
                  setNewComments={setNewComments}
                  submittingComment={submittingComment}
                  onSubmitComment={handleSubmitComment}
                  onUpdateJobStatus={handleUpdateJobStatus}
                  onCancelJob={handleCancelJob}
                  onOpenReviewModal={handleOpenReviewModal}
                  onHireAgain={handleHireAgain}
                  getFinalPrice={getFinalPrice}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        job={reviewingJob}
        onSubmitReview={handleSubmitReview}
      />
    </div>
  );
};

export default ActiveJobs;

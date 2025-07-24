import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BookingRequest = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tradesmanId } = location.state || {};

  const [tradesman, setTradesman] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    urgency: 'normal',
    preferredDates: [],
    budgetExpectation: '',
    additionalNotes: '',
    jobImages: []
  });

  useEffect(() => {
    if (!tradesmanId) {
      navigate('/browse');
      return;
    }
    
    fetchTradesmanDetails();
    fetchCustomerProfile();
  }, [tradesmanId, currentUser]);

  const fetchTradesmanDetails = async () => {
    try {
      // Get tradesman profile
      const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', tradesmanId));
      if (tradesmanDoc.exists()) {
        setTradesman({ id: tradesmanDoc.id, ...tradesmanDoc.data() });
      }

      // Get availability
      const availabilityQuery = query(
        collection(db, 'availability'),
        where('tradesman_id', '==', tradesmanId),
        where('is_booked', '==', false)
      );
      const availabilitySnapshot = await getDocs(availabilityQuery);
      const dates = availabilitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableDates(dates);
      
    } catch (error) {
      console.error('Error fetching tradesman details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProfile = async () => {
    if (!currentUser) return;
    
    try {
      const customerDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (customerDoc.exists()) {
        setCustomerProfile(customerDoc.data());
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateSelection = (dateId) => {
    setFormData(prev => ({
      ...prev,
      preferredDates: prev.preferredDates.includes(dateId)
        ? prev.preferredDates.filter(id => id !== dateId)
        : [...prev.preferredDates, dateId]
    }));
  };

  // Image compression function
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Check total images limit
    if (formData.jobImages.length + files.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const newImages = [];
      
      for (const file of files) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Please choose images under 5MB.`);
          continue;
        }
        
        // Compress the image
        const compressedFile = await compressImage(file, 800, 0.8);
        
        // Convert to base64
        const base64 = await fileToBase64(compressedFile);
        
        newImages.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          image: base64,
          filename: file.name,
          uploadedAt: new Date().toISOString()
        });
      }
      
      setFormData(prev => ({
        ...prev,
        jobImages: [...prev.jobImages, ...newImages]
      }));
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Delete image
  const deleteImage = (imageId) => {
    setFormData(prev => ({
      ...prev,
      jobImages: prev.jobImages.filter(img => img.id !== imageId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
      alert('Please fill in the job title and description.');
      return;
    }

    if (formData.preferredDates.length === 0) {
      alert('Please select at least one preferred date.');
      return;
    }

    setSubmitting(true);

    try {
      // Create booking request
      const bookingRequest = {
        customer_id: currentUser.uid,
        customer_name: customerProfile?.name || currentUser.email,
        tradesman_id: tradesmanId,
        tradesman_name: tradesman.name,
        job_title: formData.jobTitle,
        job_description: formData.jobDescription,
        urgency: formData.urgency,
        preferred_dates: formData.preferredDates,
        budget_expectation: formData.budgetExpectation,
        additional_notes: formData.additionalNotes,
        job_images: formData.jobImages,
        status: 'pending_review',
        hourly_rate: tradesman.hourlyRate,
        created_at: new Date().toISOString(),
        conversation_id: null // Will be created when first message is sent
      };

      const docRef = await addDoc(collection(db, 'booking_requests'), bookingRequest);

      // Create initial message in conversations
      const conversationData = {
        booking_request_id: docRef.id,
        customer_id: currentUser.uid,
        customer_name: customerProfile?.name || currentUser.email,
        tradesman_id: tradesmanId,
        tradesman_name: tradesman.name,
        last_message: `New job request: ${formData.jobTitle}`,
        last_message_time: new Date().toISOString(),
        unread_count_customer: 0,
        unread_count_tradesman: 1,
        created_at: new Date().toISOString()
      };

      const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);

      // Send initial message
      await addDoc(collection(db, 'messages'), {
        conversation_id: conversationRef.id,
        sender_id: currentUser.uid,
        sender_name: customerProfile?.name || currentUser.email,
        sender_type: 'customer',
        message: `Hi ${tradesman.name},

I'd like to request a quote for: ${formData.jobTitle}

Job Description:
${formData.jobDescription}

${formData.budgetExpectation ? `Budget Expectation: ${formData.budgetExpectation}` : ''}
${formData.additionalNotes ? `Additional Notes: ${formData.additionalNotes}` : ''}

Urgency: ${formData.urgency}

I'm available on these dates: ${formData.preferredDates.map(dateId => {
          const date = availableDates.find(d => d.id === dateId);
          return date ? new Date(date.date_available).toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
          }) : '';
        }).join(', ')}

${formData.jobImages.length > 0 ? `I've attached ${formData.jobImages.length} photo${formData.jobImages.length > 1 ? 's' : ''} to help show what needs to be done.` : ''}

Please let me know if you're interested and if you need any additional information.

Thanks!`,
        timestamp: new Date().toISOString(),
        read: false,
        message_type: 'booking_request',
        attached_images: formData.jobImages
      });

      // Navigate to messages to continue conversation
      navigate('/messages', {
        state: { 
          success: 'Quote request sent successfully! The tradesman will respond shortly.',
          conversationId: conversationRef.id 
        }
      });

    } catch (error) {
      console.error('Error submitting booking request:', error);
      alert('Error sending request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!tradesman) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Tradesman not found.</p>
        <button 
          onClick={() => navigate('/browse')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Browse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/browse')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Browse
        </button>
        <h1 className="text-3xl font-bold">Request Quote</h1>
      </div>

      {/* Tradesman Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Requesting Quote From:</h2>
        <div className="flex items-center">
          {tradesman.profilePhoto ? (
            <img 
              src={tradesman.profilePhoto} 
              alt={tradesman.name} 
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 mr-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-4">
              No Photo
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{tradesman.name}</h3>
            <p className="text-gray-600">{tradesman.tradeType}</p>
            <p className="text-gray-600">{tradesman.areaCovered}</p>
            <p className="text-blue-600 font-medium">
              {tradesman.hourlyRate ? `£${tradesman.hourlyRate}/hour` : 'Rate on request'}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Request Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6">Job Details</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleInputChange}
              placeholder="e.g. Fix leaking kitchen tap, Install new socket..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description *
            </label>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleInputChange}
              rows="4"
              placeholder="Please describe the job in detail. Include any specific requirements, materials needed, access information, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Job Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Photos (Optional - but recommended)
            </label>
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploadingImages || formData.jobImages.length >= 5}
                className="hidden"
                id="job-images-upload"
              />
              <label 
                htmlFor="job-images-upload"
                className={`inline-block px-4 py-2 rounded cursor-pointer transition-colors ${
                  uploadingImages || formData.jobImages.length >= 5
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {uploadingImages ? 'Uploading...' : 'Add Photos'}
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Max 5 photos, up to 5MB each. Show the tradesman what needs to be fixed!
              </p>
            </div>

            {/* Image Gallery */}
            {formData.jobImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {formData.jobImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img 
                      src={image.image} 
                      alt="Job photo" 
                      className="w-full h-32 object-cover rounded border"
                    />
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      type="button"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                      {image.filename}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low - Can wait a few weeks</option>
              <option value="normal">Normal - Within next week or two</option>
              <option value="high">High - This week if possible</option>
              <option value="urgent">Urgent - ASAP/Emergency</option>
            </select>
          </div>

          {/* Preferred Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Preferred Dates * (Choose at least one)
            </label>
            {availableDates.length === 0 ? (
              <p className="text-gray-500">No dates currently available</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableDates.map(date => (
                  <label
                    key={date.id}
                    className={`cursor-pointer p-3 border rounded-md text-center transition-colors ${
                      formData.preferredDates.includes(date.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.preferredDates.includes(date.id)}
                      onChange={() => handleDateSelection(date.id)}
                      className="sr-only"
                    />
                    {new Date(date.date_available).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Budget Expectation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Expectation (Optional)
            </label>
            <input
              type="text"
              name="budgetExpectation"
              value={formData.budgetExpectation}
              onChange={handleInputChange}
              placeholder="e.g. £200-300, or 'flexible'"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Any other information that might be helpful..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || availableDates.length === 0}
              className={`flex-1 py-3 px-6 rounded-md font-medium ${
                submitting || availableDates.length === 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {submitting ? 'Sending Request...' : 'Send Quote Request'}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/browse')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your request (with photos if added) will be sent to {tradesman.name}</li>
          <li>• They'll review your job details and may ask questions</li>
          <li>• They can accept at their standard rate (£{tradesman.hourlyRate}/hour) or propose a custom quote</li>
          <li>• Once you both agree, you'll proceed to payment and booking confirmation</li>
          <li>• Photos help tradesmen give more accurate quotes!</li>
        </ul>
      </div>
    </div>
  );
};

export default BookingRequest;

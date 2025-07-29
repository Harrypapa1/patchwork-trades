import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const { tradesmanId: urlTradesmanId } = useParams();
  
  // Get tradesman ID from URL params or location state
  const tradesmanId = urlTradesmanId || location.state?.tradesmanId;

  const [tradesman, setTradesman] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Time slot definitions
  const TIME_SLOTS = {
    'morning': { label: 'Morning', time: '9am-1pm', start: '09:00', end: '13:00' },
    'afternoon': { label: 'Afternoon', time: '1pm-5pm', start: '13:00', end: '17:00' },
    'evening': { label: 'Evening', time: '5pm-8pm', start: '17:00', end: '20:00' }
  };

  // Form state - UPDATED for single time slot selection
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    urgency: 'normal',
    selectedTimeSlot: '', // CHANGED: single selection instead of array
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

      // Get availability - UPDATED for time slots
      const availabilityQuery = query(
        collection(db, 'availability'),
        where('tradesman_id', '==', tradesmanId)
      );
      const availabilitySnapshot = await getDocs(availabilityQuery);
      
      // Process availability data to extract individual time slots
      const timeSlots = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      availabilitySnapshot.docs.forEach(doc => {
        const availabilityData = doc.data();
        const date = availabilityData.date;
        const slots = availabilityData.available_slots || [];
        
        // Only include future dates
        const slotDate = new Date(date);
        if (slotDate >= today) {
          slots.forEach(slot => {
            if (!slot.is_booked) {
              timeSlots.push({
                id: `${date}-${slot.slot_id}`,
                date: date,
                slot_id: slot.slot_id,
                start_time: slot.start_time,
                end_time: slot.end_time,
                display_date: new Date(date).toLocaleDateString('en-GB', { 
                  weekday: 'short',
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                }),
                display_time: TIME_SLOTS[slot.slot_id]?.time || `${slot.start_time}-${slot.end_time}`,
                label: TIME_SLOTS[slot.slot_id]?.label || slot.slot_id
              });
            }
          });
        }
      });

      // Sort by date then by time
      timeSlots.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      });
      
      setAvailableTimeSlots(timeSlots);
      
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

  // UPDATED: Handle single time slot selection
  const handleTimeSlotSelection = (slotId) => {
    setFormData(prev => ({
      ...prev,
      selectedTimeSlot: slotId
    }));
  };

  // Image compression function - MORE AGGRESSIVE
  const compressImage = (file, maxWidth = 400, quality = 0.6) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // More aggressive sizing
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress more
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
    if (formData.jobImages.length + files.length > 3) {
      alert('Maximum 3 images allowed (to keep file sizes manageable)');
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const newImages = [];
      
      for (const file of files) {
        // Check file size (max 2MB before compression)
        if (file.size > 2 * 1024 * 1024) {
          alert(`${file.name} is too large. Please choose images under 2MB.`);
          continue;
        }
        
        // Compress the image aggressively
        const compressedFile = await compressImage(file, 400, 0.5);
        
        // Convert to base64
        const base64 = await fileToBase64(compressedFile);
        
        // Check final base64 size (should be under 100KB after compression)
        if (base64.length > 150000) {
          alert(`${file.name} is still too large after compression. Try a smaller/simpler image.`);
          continue;
        }
        
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

    // UPDATED: Check for selected time slot
    if (!formData.selectedTimeSlot) {
      alert('Please select a time slot.');
      return;
    }

    setSubmitting(true);

    try {
      // Find the selected time slot details
      const selectedSlot = availableTimeSlots.find(slot => slot.id === formData.selectedTimeSlot);
      
      // 🆕 NEW: Create quote request instead of booking
      const quoteRequestData = {
        // Customer information
        customer_id: currentUser.uid,
        customer_name: customerProfile?.name || currentUser.email,
        customer_email: currentUser.email,
        customer_photo: customerProfile?.profilePhoto || null,
        
        // Tradesman information
        tradesman_id: tradesmanId,
        tradesman_name: tradesman.name,
        tradesman_email: tradesman.email || tradesman.contactEmail,
        tradesman_photo: tradesman.profilePhoto || null,
        tradesman_hourly_rate: tradesman.hourlyRate,
        
        // Job details
        job_title: formData.jobTitle,
        job_description: formData.jobDescription,
        job_images: formData.jobImages,
        additional_notes: formData.additionalNotes,
        urgency: formData.urgency,
        budget_expectation: formData.budgetExpectation,
        
        // UPDATED: Save selected time slot details instead of preferred dates
        selected_time_slot: {
          id: selectedSlot.id,
          date: selectedSlot.date,
          slot_id: selectedSlot.slot_id,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          display_date: selectedSlot.display_date,
          display_time: selectedSlot.display_time,
          label: selectedSlot.label
        },
        
        // Quote status
        status: 'pending',
        has_custom_quote: false,
        custom_quote: '',
        quote_reasoning: '',
        has_customer_counter: false,
        customer_counter_quote: '',
        customer_reasoning: '',
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };

      console.log('Creating quote request:', quoteRequestData);
      const quoteRef = await addDoc(collection(db, 'quote_requests'), quoteRequestData); // 🆕 NEW COLLECTION

      // Send message using existing message structure (updated for quote reference)
      console.log('Sending message for quote request:', quoteRef.id);
      await addDoc(collection(db, 'messages'), {
        booking_id: quoteRef.id, // Legacy field for backward compatibility
        quote_request_id: quoteRef.id, // New field
        sender_id: currentUser.uid,
        sender_name: customerProfile?.name || currentUser.email,
        receiver_id: tradesmanId,
        receiver_name: tradesman.name,
        message: `Hi ${tradesman.name},

I'd like to request a quote for: ${formData.jobTitle}

Job Description:
${formData.jobDescription}

${formData.budgetExpectation ? `Budget Expectation: ${formData.budgetExpectation}` : ''}
${formData.additionalNotes ? `Additional Notes: ${formData.additionalNotes}` : ''}

Urgency: ${formData.urgency}

I'd like to book this time slot: ${selectedSlot.display_date} - ${selectedSlot.label} (${selectedSlot.display_time})

${formData.jobImages.length > 0 ? `I've attached ${formData.jobImages.length} photo${formData.jobImages.length > 1 ? 's' : ''} to help show what needs to be done.` : ''}

Please let me know if you're interested and if you need any additional information.

Thanks!`,
        timestamp: new Date().toISOString(),
        read: false,
        attached_images: formData.jobImages
      });

      // Navigate to quote requests instead of booking requests
      navigate('/quote-requests', { // 🆕 NEW ROUTE
        state: { 
          success: 'Quote request sent successfully! The tradesman will respond shortly.'
        }
      });

    } catch (error) {
      console.error('Detailed error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Error sending request: ${error.message}. Check console for details.`);
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
                disabled={uploadingImages || formData.jobImages.length >= 3}
                className="hidden"
                id="job-images-upload"
              />
              <label 
                htmlFor="job-images-upload"
                className={`inline-block px-4 py-2 rounded cursor-pointer transition-colors ${
                  uploadingImages || formData.jobImages.length >= 3
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {uploadingImages ? 'Uploading...' : 'Add Photos'}
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Max 3 photos, up to 2MB each. Images automatically compressed for faster sending!
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

          {/* UPDATED: Available Time Slots Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time Slot *
            </label>
            {availableTimeSlots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border">
                <p className="text-gray-500 mb-2">No time slots currently available</p>
                <p className="text-gray-400 text-sm">The tradesman hasn't set any available time slots, or all their slots are booked</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableTimeSlots.map(slot => (
                  <label
                    key={slot.id}
                    className={`cursor-pointer flex items-center p-3 border rounded-md transition-colors ${
                      formData.selectedTimeSlot === slot.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedTimeSlot"
                      value={slot.id}
                      checked={formData.selectedTimeSlot === slot.id}
                      onChange={() => handleTimeSlotSelection(slot.id)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {slot.display_date}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.label} ({slot.display_time})
                      </div>
                    </div>
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
              disabled={submitting || availableTimeSlots.length === 0}
              className={`flex-1 py-3 px-6 rounded-md font-medium ${
                submitting || availableTimeSlots.length === 0
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
          <li>• You'll be taken to the Quote Requests page to track progress</li>
          <li>• The tradesman can ask questions and discuss the job with you</li>
          <li>• They can accept at their standard rate (£{tradesman.hourlyRate}/hour) or propose a custom quote</li>
          <li>• Once you both agree, you'll proceed to payment and booking confirmation</li>
        </ul>
      </div>
    </div>
  );
};

export default BookingRequest;

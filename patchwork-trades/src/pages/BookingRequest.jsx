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
import { detectContactInfo, getViolationWarning, getShortWarning } from '../utils/contactInfoDetector';
import { logViolation, checkUserStatus } from '../utils/violationTracker';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);

  // 🆕 NEW: Suspension check
  const [userStatus, setUserStatus] = useState({ suspended: false, violationCount: 0 });
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(false);

  // 🆕 NEW: Contact info violation tracking
  const [contactViolations, setContactViolations] = useState({
    jobTitle: null,
    jobDescription: null,
    budgetExpectation: null,
    additionalNotes: null
  });

  // Time slot definitions
  const TIME_SLOTS = {
    'morning': { label: 'Morning', time: '9am-1pm', start: '09:00', end: '13:00' },
    'afternoon': { label: 'Afternoon', time: '1pm-5pm', start: '13:00', end: '17:00' },
    'evening': { label: 'Evening', time: '5pm-8pm', start: '17:00', end: '20:00' }
  };

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    jobDescription: '',
    urgency: 'normal',
    selectedTimeSlot: '',
    budgetExpectation: '',
    additionalNotes: '',
    jobImages: []
  });

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

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Make Monday = 0
  };

  const formatDateString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateInPast = (year, month, day) => {
    const today = new Date();
    const checkDate = new Date(year, month, day);
    return checkDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getSlotsForDate = (dateStr) => {
    return availableTimeSlots.filter(slot => slot.date === dateStr);
  };

  const getSlotStatus = (dateStr, slotId) => {
    const slotsForDate = getSlotsForDate(dateStr);
    const hasSlot = slotsForDate.find(slot => slot.slot_id === slotId);
    return hasSlot ? 'available' : 'unavailable';
  };

  const handleTimeSlotSelection = (slotId) => {
    if (formData.selectedTimeSlot === slotId) {
      // Deselect if already selected
      setFormData(prev => ({
        ...prev,
        selectedTimeSlot: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedTimeSlot: slotId
      }));
    }
  };

  // Mobile calendar rendering
  const renderMobileCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day);
      const isPast = isDateInPast(year, month, day);
      const slotsForDate = getSlotsForDate(dateStr);
      
      let className = "aspect-square p-2 rounded-lg border-2 transition-all duration-200 touch-manipulation cursor-pointer ";
      
      if (isPast) {
        className += "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200";
      } else if (slotsForDate.length > 0) {
        className += "bg-white border-blue-300 hover:border-blue-500 active:scale-95";
      } else {
        className += "bg-gray-50 border-gray-200 cursor-not-allowed";
      }

      days.push(
        <button
          key={day}
          className={className}
          onClick={() => {
            if (isPast || slotsForDate.length === 0) return;
            setSelectedDate(dateStr);
            setShowTimeSlotModal(true);
          }}
          style={{ minHeight: '60px' }}
          disabled={isPast || slotsForDate.length === 0}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="font-bold text-lg mb-1">{day}</div>
            <div className="flex gap-1">
              {slotsForDate.length > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {slotsForDate.length > 0 ? `${slotsForDate.length}` : ''}
            </div>
          </div>
        </button>
      );
    }

    return days;
  };

  // Desktop time slots rendering
  const renderTimeSlots = (dateStr, isPast) => {
    const slotsForDate = getSlotsForDate(dateStr);
    
    return (
      <div className="space-y-1 mt-1">
        {Object.keys(TIME_SLOTS).map(slotId => {
          const availableSlot = slotsForDate.find(slot => slot.slot_id === slotId);
          const slotInfo = TIME_SLOTS[slotId];
          const isSelected = formData.selectedTimeSlot === availableSlot?.id;
          
          let className = "w-full text-xs py-1 px-1 rounded transition-colors cursor-pointer ";
          
          if (isPast) {
            className += "bg-gray-100 text-gray-400 cursor-not-allowed";
          } else if (availableSlot) {
            if (isSelected) {
              className += "bg-blue-100 text-blue-800 border border-blue-500";
            } else {
              className += "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300";
            }
          } else {
            className += "bg-white text-gray-400 border border-gray-200 cursor-not-allowed";
          }

          return (
            <button
              key={slotId}
              type="button"
              className={className}
              onClick={() => {
                if (isPast || !availableSlot) return;
                handleTimeSlotSelection(availableSlot.id);
              }}
              disabled={isPast || !availableSlot}
            >
              <div className="font-medium">{slotInfo.time}</div>
              {availableSlot && !isPast && (
                <div className="text-xs">
                  {isSelected ? 'Selected' : 'Available'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Desktop calendar rendering
  const renderDesktopCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Day headers
    dayNames.forEach(day => {
      days.push(
        <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm">
          {day}
        </div>
      );
    });

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day);
      const isPast = isDateInPast(year, month, day);
      
      let className = "p-2 border-2 rounded-lg transition-colors min-h-[120px] ";
      
      if (isPast) {
        className += "bg-gray-50 border-gray-200";
      } else {
        className += "bg-white border-gray-200";
      }

      days.push(
        <div key={day} className={className}>
          <div className="font-medium text-center mb-2">{day}</div>
          {renderTimeSlots(dateStr, isPast)}
        </div>
      );
    }

    return days;
  };

  // Time slot modal for mobile
  const renderTimeSlotModal = () => {
    if (!showTimeSlotModal || !selectedDate) return null;

    const dateDisplay = new Date(selectedDate).toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });

    const slotsForDate = getSlotsForDate(selectedDate);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
        <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{dateDisplay}</h3>
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {Object.keys(TIME_SLOTS).map(slotId => {
              const availableSlot = slotsForDate.find(slot => slot.slot_id === slotId);
              const slotInfo = TIME_SLOTS[slotId];
              const isSelected = formData.selectedTimeSlot === availableSlot?.id;
              
              if (!availableSlot) return null; // Don't show unavailable slots on mobile
              
              let buttonClass = "w-full p-4 rounded-lg text-left transition-colors border-2 ";
              
              if (isSelected) {
                buttonClass += "bg-blue-100 text-blue-800 border-blue-500";
              } else {
                buttonClass += "bg-green-100 text-green-800 border-green-300 hover:bg-green-200";
              }

              return (
                <button
                  key={slotId}
                  className={buttonClass}
                  onClick={() => {
                    handleTimeSlotSelection(availableSlot.id);
                    setShowTimeSlotModal(false);
                  }}
                  style={{ minHeight: '60px' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{slotInfo.label}</div>
                      <div className="text-sm opacity-75">{slotInfo.time}</div>
                    </div>
                    <div className="text-sm font-medium">
                      {isSelected ? '✓ Selected' : 'Select'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          {/* Bottom padding for safe area */}
          <div className="h-4"></div>
        </div>
      </div>
    );
  };

  // 🆕 NEW: Handle input change with contact detection
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check for contact info (only for text fields that matter)
    if (['jobTitle', 'jobDescription', 'budgetExpectation', 'additionalNotes'].includes(name)) {
      const detection = detectContactInfo(value);
      
      setContactViolations(prev => ({
        ...prev,
        [name]: detection.detected ? detection : null
      }));
    }
  };

  // Image compression function
  const compressImage = (file, maxWidth = 400, quality = 0.6) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
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
    
    if (formData.jobImages.length + files.length > 3) {
      alert('Maximum 3 images allowed (to keep file sizes manageable)');
      return;
    }
    
    setUploadingImages(true);
    
    try {
      const newImages = [];
      
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024) {
          alert(`${file.name} is too large. Please choose images under 2MB.`);
          continue;
        }
        
        const compressedFile = await compressImage(file, 400, 0.5);
        const base64 = await fileToBase64(compressedFile);
        
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

  // 🆕 NEW: Enhanced submit with contact detection
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is suspended
    if (userStatus.suspended) {
      alert('⚠️ Your account is suspended.\n\nYou cannot submit quote requests.\n\nPlease contact support@patchworktrades.com to appeal.');
      return;
    }
    
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
      alert('Please fill in the job title and description.');
      return;
    }

    if (!formData.selectedTimeSlot) {
      alert('Please select a time slot.');
      return;
    }

    // 🆕 NEW: Check ALL fields for contact info before submitting
    const fieldsToCheck = [
      { name: 'jobTitle', value: formData.jobTitle, label: 'Job Title' },
      { name: 'jobDescription', value: formData.jobDescription, label: 'Job Description' },
      { name: 'budgetExpectation', value: formData.budgetExpectation, label: 'Budget Expectation' },
      { name: 'additionalNotes', value: formData.additionalNotes, label: 'Additional Notes' }
    ];

    let hasViolation = false;
    let violationDetails = [];

    for (const field of fieldsToCheck) {
      if (field.value) {
        const detection = detectContactInfo(field.value);
        if (detection.detected) {
          hasViolation = true;
          violationDetails.push({
            field: field.label,
            types: detection.violations.map(v => v.type)
          });
        }
      }
    }

    if (hasViolation) {
      // Log the violation
      try {
        const violationTypes = [...new Set(violationDetails.flatMap(v => v.types))];
        const detectedFields = violationDetails.map(v => v.field).join(', ');
        
        const violationResult = await logViolation(
          currentUser.uid,
          currentUser.email,
          customerProfile?.name || currentUser.email,
          'customer',
          {
            location: 'booking_request_form',
            detectedContent: `Fields: ${detectedFields}`,
            violationTypes: violationTypes,
            blockedText: formData.jobDescription.substring(0, 100)
          }
        );

        // Update local user status
        setUserStatus(prev => ({
          ...prev,
          violationCount: violationResult.violationCount,
          suspended: violationResult.suspended
        }));

        // Show appropriate warning
        alert(getViolationWarning(userStatus.violationCount));

        if (violationResult.suspended) {
          setShowSuspensionWarning(true);
        }

        return; // Block submission
      } catch (error) {
        console.error('Error logging violation:', error);
      }
    }

    setSubmitting(true);

    try {
      // Find the selected time slot details
      const selectedSlot = availableTimeSlots.find(slot => slot.id === formData.selectedTimeSlot);
      
      // Create quote request
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
        
        // Save selected time slot details
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
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      console.log('Creating quote request:', quoteRequestData);
      const quoteRef = await addDoc(collection(db, 'quote_requests'), quoteRequestData);

      // Send message
      console.log('Sending message for quote request:', quoteRef.id);
      await addDoc(collection(db, 'messages'), {
        booking_id: quoteRef.id,
        quote_request_id: quoteRef.id,
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

      // Navigate to quote requests
      navigate('/quote-requests', {
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
      {/* 🆕 NEW: Suspension Warning Banner */}
      {showSuspensionWarning && userStatus.suspended && (
        <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">🚫</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Account Suspended</h3>
              <p className="text-red-800 mb-2">
                Your account has been suspended for repeatedly attempting to share contact information before job confirmation.
              </p>
              <p className="text-red-700 text-sm mb-3">
                You cannot submit quote requests or send messages while suspended.
              </p>
              <div className="flex gap-3">
                <a 
                  href="mailto:support@patchworktrades.com"
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium"
                >
                  Contact Support to Appeal
                </a>
                <button
                  onClick={() => navigate('/browse')}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
                >
                  Back to Browse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                contactViolations.jobTitle 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              required
              disabled={userStatus.suspended}
            />
            {contactViolations.jobTitle && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ {contactViolations.jobTitle.message} - {getShortWarning(userStatus.violationCount)}
              </p>
            )}
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                contactViolations.jobDescription 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              required
              disabled={userStatus.suspended}
            />
            {contactViolations.jobDescription && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ {contactViolations.jobDescription.message} - {getShortWarning(userStatus.violationCount)}
              </p>
            )}
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
                disabled={uploadingImages || formData.jobImages.length >= 3 || userStatus.suspended}
                className="hidden"
                id="job-images-upload"
              />
              <label 
                htmlFor="job-images-upload"
                className={`inline-block px-4 py-2 rounded cursor-pointer transition-colors ${
                  uploadingImages || formData.jobImages.length >= 3 || userStatus.suspended
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
              disabled={userStatus.suspended}
            >
              <option value="low">Low - Can wait a few weeks</option>
              <option value="normal">Normal - Within next week or two</option>
              <option value="high">High - This week if possible</option>
              <option value="urgent">Urgent - ASAP/Emergency</option>
            </select>
          </div>

          {/* Calendar-based Time Slot Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time Slot * {formData.selectedTimeSlot && <span className="text-green-600 font-medium">✓ Selected</span>}
            </label>
            
            {availableTimeSlots.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border">
                <p className="text-gray-500 mb-2">No time slots currently available</p>
                <p className="text-gray-400 text-sm">The tradesman hasn't set any available time slots, or all their slots are booked</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                {isMobileView ? (
                  // Mobile Calendar View
                  <div>
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Tap any date</strong> with a blue dot to see available time slots
                      </p>
                    </div>

                    {/* Month navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                      >
                        ← Prev
                      </button>
                      
                      <h3 className="text-lg font-semibold">
                        {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => navigateMonth(1)}
                        className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 text-sm"
                      >
                        Next →
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center font-medium text-gray-600 text-sm py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {renderMobileCalendar()}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Available time slots</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop Calendar View
                  <div>
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Select your preferred time slot:</h4>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• <strong>Green slots</strong> = Available for booking</li>
                        <li>• <strong>Blue slots</strong> = Your selected slot</li>
                        <li>• <strong>Gray slots</strong> = Not available</li>
                        <li>• Click any green time slot to select it</li>
                      </ul>
                    </div>

                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-4">
                      <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        ← Previous
                      </button>
                      
                      <h3 className="text-xl font-bold">
                        {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </h3>
                      
                      <button
                        type="button"
                        onClick={() => navigateMonth(1)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        Next →
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {renderDesktopCalendar()}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                        <span>Available Slot</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-500 rounded"></div>
                        <span>Selected Slot</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                        <span>Not Available</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
                        <span>Past Date</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Time Slot Display */}
          {formData.selectedTimeSlot && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Selected Time Slot:</h4>
              {(() => {
                const selectedSlot = availableTimeSlots.find(slot => slot.id === formData.selectedTimeSlot);
                return selectedSlot ? (
                  <div className="text-green-700">
                    <p><strong>{selectedSlot.display_date}</strong></p>
                    <p>{selectedSlot.label} ({selectedSlot.display_time})</p>
                  </div>
                ) : null;
              })()}
            </div>
          )}

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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                contactViolations.budgetExpectation 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={userStatus.suspended}
            />
            {contactViolations.budgetExpectation && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ {contactViolations.budgetExpectation.message} - {getShortWarning(userStatus.violationCount)}
              </p>
            )}
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                contactViolations.additionalNotes 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={userStatus.suspended}
            />
            {contactViolations.additionalNotes && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ {contactViolations.additionalNotes.message} - {getShortWarning(userStatus.violationCount)}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || availableTimeSlots.length === 0 || userStatus.suspended}
              className={`flex-1 py-3 px-6 rounded-md font-medium ${
                submitting || availableTimeSlots.length === 0 || userStatus.suspended
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {userStatus.suspended ? '🚫 Account Suspended' : submitting ? 'Sending Request...' : 'Send Quote Request'}
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

      {/* Time Slot Modal for Mobile */}
      {renderTimeSlotModal()}

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

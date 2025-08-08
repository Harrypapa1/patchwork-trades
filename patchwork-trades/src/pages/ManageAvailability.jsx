import React, { useState, useEffect } from 'react';
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
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ManageAvailability = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);

  // Time slot definitions
  const TIME_SLOTS = [
    { id: 'morning', label: 'Morning', time: '9am-1pm', start: '09:00', end: '13:00' },
    { id: 'afternoon', label: 'Afternoon', time: '1pm-5pm', start: '13:00', end: '17:00' },
    { id: 'evening', label: 'Evening', time: '5pm-8pm', start: '17:00', end: '20:00' }
  ];

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
    fetchAvailability();
    fetchBookedSlots();
  }, [currentDate, currentUser]);

  const fetchAvailability = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'availability'),
        where('tradesman_id', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const availabilityData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSlots = async () => {
    if (!currentUser) return;
    
    try {
      // Fetch from active_jobs to see what's booked
      const q = query(
        collection(db, 'active_jobs'),
        where('tradesman_id', '==', currentUser.uid),
        where('status', 'in', ['accepted', 'in_progress'])
      );
      const querySnapshot = await getDocs(q);
      const bookedData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookedSlots(bookedData);
    } catch (error) {
      console.error('Error fetching booked slots:', error);
    }
  };

  const toggleTimeSlot = async (dateStr, slotId) => {
    if (!currentUser) return;

    // Check if this specific slot is booked
    const isBooked = bookedSlots.some(booking => 
      booking.agreed_date === dateStr && booking.time_slot === slotId
    );
    
    if (isBooked) {
      // If booked, navigate to job details
      const booking = bookedSlots.find(b => 
        b.agreed_date === dateStr && b.time_slot === slotId
      );
      if (booking) {
        navigate('/active-jobs');
      }
      return;
    }

    // Find existing availability document for this date
    let availabilityDoc = availability.find(item => item.date === dateStr);
    
    if (availabilityDoc) {
      // Update existing document
      const currentSlots = availabilityDoc.available_slots || [];
      const slotIndex = currentSlots.findIndex(slot => slot.slot_id === slotId);
      
      let updatedSlots;
      if (slotIndex >= 0) {
        // Remove slot
        updatedSlots = currentSlots.filter(slot => slot.slot_id !== slotId);
      } else {
        // Add slot
        const slotInfo = TIME_SLOTS.find(s => s.id === slotId);
        updatedSlots = [...currentSlots, {
          slot_id: slotId,
          start_time: slotInfo.start,
          end_time: slotInfo.end,
          is_booked: false,
          booking_id: null
        }];
      }

      if (updatedSlots.length === 0) {
        // Remove document if no slots left
        try {
          await deleteDoc(doc(db, 'availability', availabilityDoc.id));
          setAvailability(prev => prev.filter(item => item.id !== availabilityDoc.id));
        } catch (error) {
          console.error('Error removing availability:', error);
        }
      } else {
        // Update document
        try {
          await updateDoc(doc(db, 'availability', availabilityDoc.id), {
            available_slots: updatedSlots,
            updated_at: new Date().toISOString()
          });
          
          setAvailability(prev => prev.map(item => 
            item.id === availabilityDoc.id 
              ? { ...item, available_slots: updatedSlots }
              : item
          ));
        } catch (error) {
          console.error('Error updating availability:', error);
        }
      }
    } else {
      // Create new availability document
      const slotInfo = TIME_SLOTS.find(s => s.id === slotId);
      const newAvailability = {
        tradesman_id: currentUser.uid,
        date: dateStr,
        available_slots: [{
          slot_id: slotId,
          start_time: slotInfo.start,
          end_time: slotInfo.end,
          is_booked: false,
          booking_id: null
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        const docRef = await addDoc(collection(db, 'availability'), newAvailability);
        setAvailability(prev => [...prev, { id: docRef.id, ...newAvailability }]);
      } catch (error) {
        console.error('Error adding availability:', error);
      }
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const formatDateString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getSlotStatus = (dateStr, slotId) => {
    // Check if slot is booked
    const isBooked = bookedSlots.some(booking => 
      booking.agreed_date === dateStr && booking.time_slot === slotId
    );
    
    if (isBooked) return 'booked';

    // Check if slot is available
    const availabilityDoc = availability.find(item => item.date === dateStr);
    if (availabilityDoc && availabilityDoc.available_slots) {
      const hasSlot = availabilityDoc.available_slots.some(slot => slot.slot_id === slotId);
      return hasSlot ? 'available' : 'unavailable';
    }
    
    return 'unavailable';
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
      
      let className = "aspect-square p-2 rounded-lg border-2 transition-all duration-200 touch-manipulation cursor-pointer ";
      
      if (isPast) {
        className += "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200";
      } else {
        className += "bg-white border-gray-200 hover:border-blue-300 active:scale-95";
      }

      // Count available and booked slots
      const availableSlots = [];
      const bookedSlots_day = [];
      
      TIME_SLOTS.forEach(slot => {
        const status = getSlotStatus(dateStr, slot.id);
        if (status === 'available') availableSlots.push(slot.id);
        if (status === 'booked') bookedSlots_day.push(slot.id);
      });

      days.push(
        <button
          key={day}
          className={className}
          onClick={() => {
            if (isPast) return;
            setSelectedDate(dateStr);
            setShowTimeSlotModal(true);
          }}
          style={{ minHeight: '60px' }} // Ensure minimum touch target
          disabled={isPast}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <div className="font-bold text-lg mb-1">{day}</div>
            <div className="flex gap-1">
              {bookedSlots_day.length > 0 && (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
              {availableSlots.length > 0 && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {availableSlots.length + bookedSlots_day.length > 0 ? 
                `${availableSlots.length + bookedSlots_day.length}` : ''}
            </div>
          </div>
        </button>
      );
    }

    return days;
  };

  // Desktop time slots rendering (original)
  const renderTimeSlots = (dateStr, isPast) => {
    return (
      <div className="space-y-1 mt-1">
        {TIME_SLOTS.map(slot => {
          const status = getSlotStatus(dateStr, slot.id);
          
          let className = "w-full text-xs py-1 px-1 rounded transition-colors cursor-pointer ";
          
          if (isPast) {
            className += "bg-gray-100 text-gray-400 cursor-not-allowed";
          } else {
            switch (status) {
              case 'available':
                className += "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300";
                break;
              case 'booked':
                className += "bg-red-100 text-red-800 hover:bg-red-200 border border-red-300";
                break;
              default:
                className += "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200";
            }
          }

          return (
            <button
              key={slot.id}
              className={className}
              onClick={() => {
                if (isPast) return;
                toggleTimeSlot(dateStr, slot.id);
              }}
              disabled={isPast}
            >
              <div className="font-medium">{slot.time}</div>
              {status === 'available' && !isPast && (
                <div className="text-xs">Available</div>
              )}
              {status === 'booked' && (
                <div className="text-xs">Job Booked</div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Desktop calendar rendering (original)
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
        className += "bg-white border-gray-200 hover:border-blue-300";
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
            {TIME_SLOTS.map(slot => {
              const status = getSlotStatus(selectedDate, slot.id);
              
              let buttonClass = "w-full p-4 rounded-lg text-left transition-colors border-2 ";
              let statusText = "";
              
              switch (status) {
                case 'available':
                  buttonClass += "bg-green-100 text-green-800 border-green-300 hover:bg-green-200";
                  statusText = "Available - Tap to remove";
                  break;
                case 'booked':
                  buttonClass += "bg-red-100 text-red-800 border-red-300 hover:bg-red-200";
                  statusText = "Job Booked - Tap to view";
                  break;
                default:
                  buttonClass += "bg-white text-gray-800 border-gray-300 hover:bg-gray-50";
                  statusText = "Not Available - Tap to add";
              }

              return (
                <button
                  key={slot.id}
                  className={buttonClass}
                  onClick={() => {
                    toggleTimeSlot(selectedDate, slot.id);
                    // Close modal if it was a booking view
                    if (status === 'booked') {
                      setShowTimeSlotModal(false);
                    }
                  }}
                  style={{ minHeight: '60px' }} // Large touch target
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-lg">{slot.label}</div>
                      <div className="text-sm opacity-75">{slot.time}</div>
                    </div>
                    <div className="text-sm font-medium">
                      {status === 'available' && '✓'}
                      {status === 'booked' && '📅'}
                      {status === 'unavailable' && '+'}
                    </div>
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {statusText}
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

  // Calculate stats
  const totalAvailableSlots = availability.reduce((total, day) => 
    total + (day.available_slots?.length || 0), 0
  );
  
  const totalBookedSlots = bookedSlots.filter(booking => 
    booking.status === 'accepted' || booking.status === 'in_progress'
  ).length;

  if (loading) {
    return <div className="text-center py-8">Loading calendar...</div>;
  }

  // Mobile Layout
  if (isMobileView) {
    return (
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm p-4">
          <h1 className="text-2xl font-bold text-center mb-4">Manage Availability</h1>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-700">{totalAvailableSlots}</div>
              <div className="text-xs text-green-600">Available</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-700">{totalBookedSlots}</div>
              <div className="text-xs text-red-600">Booked</div>
            </div>
          </div>
          
          {/* Month display */}
          <div className="text-center">
            <h2 className="text-xl font-bold">
              {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-4">
          <p className="text-blue-800 text-sm">
            <strong>Tap any date</strong> to manage your time slots for that day
          </p>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center font-medium text-gray-600 text-sm py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {renderMobileCalendar()}
          </div>
          
          {/* Legend */}
          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Available time slots</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Booked jobs</span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - THUMB FRIENDLY */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-md mx-auto flex">
            <button
              onClick={() => navigateMonth(-1)}
              className="flex-1 py-4 px-6 text-blue-600 font-medium hover:bg-blue-50 transition-colors"
              style={{ minHeight: '56px' }}
            >
              ← Previous
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="flex-1 py-4 px-6 text-blue-600 font-medium hover:bg-blue-50 transition-colors border-l"
              style={{ minHeight: '56px' }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Time Slot Modal */}
        {renderTimeSlotModal()}

        {/* Bottom padding */}
        <div className="h-16"></div>
      </div>
    );
  }

  // Desktop Layout (Original)
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Your Availability</h1>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">How to use the time slot calendar:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Click time slots</strong> to toggle your availability</li>
          <li>• <strong>Morning:</strong> 9am-1pm (4 hours)</li>
          <li>• <strong>Afternoon:</strong> 1pm-5pm (4 hours)</li>
          <li>• <strong>Evening:</strong> 5pm-8pm (3 hours)</li>
          <li>• <strong>Green slots</strong> = Available for booking</li>
          <li>• <strong>Red slots</strong> = Booked by customers (click to view job)</li>
          <li>• <strong>White slots</strong> = Not available</li>
        </ul>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            ← Previous
          </button>
          
          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
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
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span>Available Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span>Booked Slot (click to view)</span>
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

      {/* Quick Stats */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">
            {totalAvailableSlots}
          </div>
          <div className="text-green-600">Available Time Slots</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">
            {totalBookedSlots}
          </div>
          <div className="text-red-600">Booked Time Slots</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {totalAvailableSlots + totalBookedSlots}
          </div>
          <div className="text-blue-600">Total Time Slots</div>
        </div>
      </div>
    </div>
  );
};

export default ManageAvailability;

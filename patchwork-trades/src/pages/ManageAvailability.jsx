const fetchBookings = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'bookings'),
        where('tradesman_id', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookedDateClick = (dateStr) => {
    // Find the booking for this date
    const booking = bookings.find(b => b.date_booked === dateStr);
    if (booking) {
      navigate(`/messaging/${booking.id}`);
    }
  };import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ManageAvailability = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
    fetchBookings();
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

  const toggleAvailability = async (dateStr) => {
    if (!currentUser) return;

    // Check if date already exists
    const existingDate = availability.find(item => item.date_available === dateStr);
    
    if (existingDate) {
      // If date exists and is not booked, remove it
      if (!existingDate.is_booked) {
        try {
          await deleteDoc(doc(db, 'availability', existingDate.id));
          setAvailability(prev => prev.filter(item => item.id !== existingDate.id));
        } catch (error) {
          console.error('Error removing availability:', error);
        }
      }
    } else {
      // Add new availability
      try {
        const newAvailability = {
          tradesman_id: currentUser.uid,
          date_available: dateStr,
          is_booked: false,
          created_at: new Date().toISOString()
        };
        
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
    return firstDay === 0 ? 6 : firstDay - 1; // Make Monday = 0
  };

  const formatDateString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDateStatus = (dateStr) => {
    const availabilityItem = availability.find(item => item.date_available === dateStr);
    if (!availabilityItem) return 'unavailable';
    return availabilityItem.is_booked ? 'booked' : 'available';
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

  const renderCalendar = () => {
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
      const status = getDateStatus(dateStr);
      const isPast = isDateInPast(year, month, day);
      
      let className = "p-2 text-center cursor-pointer rounded-lg border-2 transition-colors ";
      
      if (isPast) {
        className += "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200";
      } else {
        switch (status) {
          case 'available':
            className += "bg-green-100 text-green-800 border-green-300 hover:bg-green-200";
            break;
          case 'booked':
            className += "bg-red-100 text-red-800 border-red-300 hover:bg-red-200";
            break;
          default:
            className += "bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300";
        }
      }

      days.push(
        <div
          key={day}
          className={className}
          onClick={() => {
            if (isPast) return;
            if (status === 'booked') {
              handleBookedDateClick(dateStr);
            } else {
              toggleAvailability(dateStr);
            }
          }}
        >
          <div className="font-medium">{day}</div>
          {status === 'available' && !isPast && (
            <div className="text-xs mt-1">Available</div>
          )}
          {status === 'booked' && (
            <div className="text-xs mt-1">Click for job</div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return <div className="text-center py-8">Loading calendar...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Your Availability</h1>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">How to use this calendar:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Click any future date</strong> to mark yourself as available</li>
          <li>• <strong>Click available dates again</strong> to remove availability</li>
          <li>• <strong>Click red booked dates</strong> to view job details and message customer</li>
          <li>• <strong>Green dates</strong> = You're available for booking</li>
          <li>• <strong>Red dates</strong> = Already booked by customers</li>
          <li>• <strong>Gray dates</strong> = Past dates (cannot be changed)</li>
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
          {renderCalendar()}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span>Booked (click to view job)</span>
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
            {availability.filter(item => !item.is_booked).length}
          </div>
          <div className="text-green-600">Available Days</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">
            {availability.filter(item => item.is_booked).length}
          </div>
          <div className="text-red-600">Booked Days</div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {availability.length}
          </div>
          <div className="text-blue-600">Total Days Listed</div>
        </div>
      </div>
    </div>
  );
};

export default ManageAvailability;

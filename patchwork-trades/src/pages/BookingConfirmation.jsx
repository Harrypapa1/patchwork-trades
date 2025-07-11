import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  collection 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const BookingConfirmation = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tradesman, setTradesman] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const { tradesmanId, availabilityId } = location.state || {};

  useEffect(() => {
    if (!tradesmanId || !availabilityId) {
      navigate('/browse');
      return;
    }
    
    fetchData();
  }, [tradesmanId, availabilityId]);

  const fetchData = async () => {
    try {
      // Fetch tradesman info
      const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', tradesmanId));
      if (tradesmanDoc.exists()) {
        setTradesman(tradesmanDoc.data());
      }
      
      // Fetch availability info
      const availabilityDoc = await getDoc(doc(db, 'availability', availabilityId));
      if (availabilityDoc.exists()) {
        setAvailability(availabilityDoc.data());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!currentUser || !tradesman || !availability) return;
    
    setBooking(true);
    
    try {
      // Create booking
      await addDoc(collection(db, 'bookings'), {
        customer_id: currentUser.uid,
        tradesman_id: tradesmanId,
        availability_id: availabilityId,
        date_booked: availability.date_available,
        status: 'Pending',
        created_at: new Date().toISOString()
      });
      
      // Update availability to booked
      await updateDoc(doc(db, 'availability', availabilityId), {
        is_booked: true
      });
      
      navigate('/customer-dashboard');
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!tradesman || !availability) {
    return <div className="text-center py-8">Booking information not found.</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Confirm Booking</h1>
      
      <div className="space-y-4 mb-6">
        <div>
          <h3 className="font-semibold text-lg">{tradesman.name}</h3>
          <p className="text-gray-600">{tradesman.tradeType}</p>
          <p className="text-gray-600">{tradesman.areaCovered}</p>
        </div>
        
        <div className="border-t pt-4">
          <p><strong>Date:</strong> {availability.date_available}</p>
          <p><strong>Status:</strong> Available</p>
        </div>
        
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600">
            By confirming this booking, you agree to book this tradesman for the selected date.
          </p>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/browse')}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={confirmBooking}
          disabled={booking}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {booking ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmation;
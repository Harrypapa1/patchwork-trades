import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TradesmanDashboard = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchAvailability();
    fetchBookings();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', currentUser.uid));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data());
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!currentUser) return;
    
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

  const fetchBookings = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'bookings'),
        where('tradesman_id', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData = [];
      
      for (const bookingDoc of querySnapshot.docs) {
        const bookingData = bookingDoc.data();
        
        // Fetch customer name
        const customerDoc = await getDoc(doc(db, 'users', bookingData.customer_id));
        const customerName = customerDoc.exists() ? customerDoc.data().name : 'Unknown Customer';
        
        bookingsData.push({
          id: bookingDoc.id,
          ...bookingData,
          customerName
        });
      }
      
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const addAvailability = async (e) => {
    e.preventDefault();
    if (!newDate || !currentUser) return;

    try {
      await addDoc(collection(db, 'availability'), {
        tradesman_id: currentUser.uid,
        date_available: newDate,
        is_booked: false,
        created_at: new Date().toISOString()
      });
      setNewDate('');
      fetchAvailability();
    } catch (error) {
      console.error('Error adding availability:', error);
    }
  };

  const deleteAvailability = async (availabilityId) => {
    try {
      await deleteDoc(doc(db, 'availability', availabilityId));
      fetchAvailability();
    } catch (error) {
      console.error('Error deleting availability:', error);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus
      });
      fetchBookings(); // Refresh the bookings list
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tradesman Dashboard</h1>
      
      {/* Profile Section */}
      {profile && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Trade Type:</strong> {profile.tradeType}</p>
            </div>
            <div>
              <p><strong>Area Covered:</strong> {profile.areaCovered}</p>
              <p><strong>Bio:</strong> {profile.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Customer Bookings Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Customer Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{booking.customerName}</h3>
                    <p className="text-gray-600">Date: {booking.date_booked}</p>
                    <p className="text-gray-600">Booked: {new Date(booking.created_at).toLocaleDateString()}</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-col">
                    <Link 
                      to={`/messaging/${booking.id}`}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 text-center"
                    >
                      Message Customer
                    </Link>
                    {booking.status === 'Pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'Confirmed')}
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'Cancelled')}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {booking.status === 'Confirmed' && (
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'Completed')}
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Availability */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Availability</h2>
        <form onSubmit={addAvailability} className="flex gap-4">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Add Date
          </button>
        </form>
      </div>

      {/* Availability List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Availability</h2>
        {availability.length === 0 ? (
          <p className="text-gray-500">No availability dates added yet.</p>
        ) : (
          <div className="space-y-2">
            {availability.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{item.date_available}</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    item.is_booked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.is_booked ? 'Booked' : 'Available'}
                  </span>
                </div>
                {!item.is_booked && (
                  <button
                    onClick={() => deleteAvailability(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradesmanDashboard;

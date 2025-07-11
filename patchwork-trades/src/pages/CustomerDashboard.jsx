import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CustomerDashboard = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchBookings();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data());
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBookings = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'bookings'),
        where('customer_id', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const bookingsData = [];
      
      for (const bookingDoc of querySnapshot.docs) {
        const bookingData = bookingDoc.data();
        
        // Fetch tradesman name
        const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', bookingData.tradesman_id));
        const tradesmanName = tradesmanDoc.exists() ? tradesmanDoc.data().name : 'Unknown';
        
        bookingsData.push({
          id: bookingDoc.id,
          ...bookingData,
          tradesmanName
        });
      }
      
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Customer Dashboard</h1>
      
      {/* Profile Section */}
      {profile && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Member since:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <Link 
          to="/browse"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
        >
          Browse Tradesmen
        </Link>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet. <Link to="/browse" className="text-blue-600 hover:underline">Browse tradesmen</Link> to get started.</p>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{booking.tradesmanName}</h3>
                    <p className="text-gray-600">Date: {booking.date_booked}</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link 
                      to={`/messaging/${booking.id}`}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      Message
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
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
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CustomerDashboard = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // Image compression function
  const compressImage = (file, maxWidth = 400, quality = 0.7) => {
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

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please choose an image under 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      // Compress the image
      const compressedFile = await compressImage(file, 400, 0.7);
      
      // Convert to base64
      const base64 = await fileToBase64(compressedFile);

      // Update profile in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        profilePhoto: base64
      });

      // Update local state
      setProfile(prev => ({ ...prev, profilePhoto: base64 }));
      
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Error uploading photo. Please try again.');
    } finally {
      setUploadingImage(false);
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
          
          {/* Profile Photo Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Profile Photo</h3>
            <div className="flex items-center gap-4">
              {profile.profilePhoto ? (
                <img 
                  src={profile.profilePhoto} 
                  alt="Profile" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Photo
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  disabled={uploadingImage}
                  className="hidden"
                  id="profile-photo-upload"
                />
                <label 
                  htmlFor="profile-photo-upload"
                  className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                </label>
                <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
              </div>
            </div>
          </div>

          {/* Basic Profile Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p><strong>Name:</strong> {profile.name}</p>
              <p><strong>Email:</strong> {profile.email}</p>
            </div>
            <div>
              <p><strong>Member since:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
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

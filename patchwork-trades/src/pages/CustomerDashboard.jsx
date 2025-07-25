import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

const CustomerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchProfile();
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
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

      {/* Legal & Support Links */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Information & Support</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            to="/terms"
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 text-center transition-colors border border-gray-300"
          >
            <div className="text-lg mb-1">📋</div>
            <div className="text-sm font-medium">Terms of Service</div>
          </Link>
          <Link 
            to="/privacy"
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 text-center transition-colors border border-gray-300"
          >
            <div className="text-lg mb-1">🔒</div>
            <div className="text-sm font-medium">Privacy Policy</div>
          </Link>
          <Link 
            to="/cookies"
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 text-center transition-colors border border-gray-300"
          >
            <div className="text-lg mb-1">🍪</div>
            <div className="text-sm font-medium">Cookie Policy</div>
          </Link>
          <Link 
            to="/contact"
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-200 text-center transition-colors border border-gray-300"
          >
            <div className="text-lg mb-1">❓</div>
            <div className="text-sm font-medium">Contact & Help</div>
          </Link>
        </div>
      </div>

      {/* Logout Button */}
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default CustomerDashboard;

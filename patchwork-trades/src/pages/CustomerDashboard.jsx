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
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setProfile(profileData);
        setProfileForm(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get coordinates from postcode
  const getCoordinatesFromPostcode = async (postcode) => {
    try {
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
      const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
      const data = await response.json();
      
      if (data.status === 200) {
        return {
          latitude: data.result.latitude,
          longitude: data.result.longitude
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      return null;
    }
  };

  // Update profile
  const updateProfile = async (e) => {
    e.preventDefault();
    
    try {
      let updateData = { ...profileForm };
      
      // If postcode changed, get new coordinates
      if (profileForm.postcode && profileForm.postcode !== profile.postcode) {
        const coords = await getCoordinatesFromPostcode(profileForm.postcode);
        if (coords) {
          updateData.latitude = coords.latitude;
          updateData.longitude = coords.longitude;
        } else {
          alert('Invalid postcode. Please check and try again.');
          return;
        }
      }

      await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      setProfile(updateData);
      setEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  // Image compression function
  const compressImage = (file, maxWidth = 400, quality = 0.7) => {
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

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please choose an image under 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      const compressedFile = await compressImage(file, 400, 0.7);
      const base64 = await fileToBase64(compressedFile);

      await updateDoc(doc(db, 'users', currentUser.uid), {
        profilePhoto: base64
      });

      setProfile(prev => ({ ...prev, profilePhoto: base64 }));
      setProfileForm(prev => ({ ...prev, profilePhoto: base64 }));
      
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {editingProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          
          {editingProfile ? (
            /* Edit Profile Form */
            <form onSubmit={updateProfile} className="space-y-6">
              {/* Profile Photo Section - NOW IN EDIT MODE */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Profile Photo</h3>
                <div className="flex items-center gap-4">
                  {profileForm.profilePhoto ? (
                    <img 
                      src={profileForm.profilePhoto} 
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
                      id="profile-photo-upload-edit"
                    />
                    <label 
                      htmlFor="profile-photo-upload-edit"
                      className={`bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 inline-block ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </label>
                    <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={profileForm.name || ''}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={profileForm.postcode || ''}
                      onChange={(e) => setProfileForm({...profileForm, postcode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. M1 1AA"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to find tradespeople near you
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Display Profile */
            <div>
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
                      className={`bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 inline-block ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium mb-3">{profile.name}</p>
                  
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Postcode</p>
                  <p className="font-medium mb-3">{profile.postcode || 'Not specified'}</p>
                  
                  <p className="text-sm text-gray-600">Member since</p>
                  <p className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
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

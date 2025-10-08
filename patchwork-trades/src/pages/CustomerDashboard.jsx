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
import { detectContactInfo, getViolationWarning, getShortWarning } from '../utils/contactInfoDetector';
import { logViolation, checkUserStatus } from '../utils/violationTracker';

const CustomerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [imageExpanded, setImageExpanded] = useState(false);

  // 🆕 NEW: Suspension check
  const [userStatus, setUserStatus] = useState({ suspended: false, violationCount: 0 });
  const [showSuspensionWarning, setShowSuspensionWarning] = useState(false);

  // 🆕 NEW: Contact violation tracking
  const [nameViolation, setNameViolation] = useState(null);

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

  // 🆕 NEW: Handle profile form input with contact detection
  const handleProfileInputChange = (field, value) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));

    // Only check name field for contact info
    if (field === 'name') {
      const detection = detectContactInfo(value);
      setNameViolation(detection.detected ? detection : null);
    }
  };

  // 🆕 NEW: Enhanced updateProfile with contact detection
  const updateProfile = async (e) => {
    e.preventDefault();

    // Check if user is suspended
    if (userStatus.suspended) {
      alert('⚠️ Your account is suspended.\n\nYou cannot update your profile.\n\nPlease contact support@patchworktrades.com to appeal.');
      return;
    }

    // 🆕 NEW: Check name field for contact info
    if (profileForm.name) {
      const detection = detectContactInfo(profileForm.name);
      if (detection.detected) {
        try {
          const violationTypes = detection.violations.map(v => v.type);
          
          const violationResult = await logViolation(
            currentUser.uid,
            currentUser.email,
            profileForm.name,
            'customer',
            {
              location: 'customer_profile_name',
              detectedContent: detection.message,
              violationTypes: violationTypes,
              blockedText: profileForm.name.substring(0, 100)
            }
          );

          setUserStatus(prev => ({
            ...prev,
            violationCount: violationResult.violationCount,
            suspended: violationResult.suspended
          }));

          alert(getViolationWarning(userStatus.violationCount));

          if (violationResult.suspended) {
            setShowSuspensionWarning(true);
          }

          return;
        } catch (error) {
          console.error('Error logging violation:', error);
        }
      }
    }
    
    try {
      let updateData = { ...profileForm };
      
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
      setNameViolation(null);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

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

  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

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
      {/* 🆕 NEW: Suspension Warning Banner */}
      {showSuspensionWarning && userStatus.suspended && (
        <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">🚫</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Account Suspended</h3>
              <p className="text-red-800 mb-2">
                Your account has been suspended for policy violations.
              </p>
              <p className="text-red-700 text-sm mb-3">
                You can view your profile but cannot edit it while suspended.
              </p>
              <a 
                href="mailto:support@patchworktrades.com"
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm font-medium inline-block"
              >
                Contact Support to Appeal
              </a>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-6">Customer Dashboard</h1>
      
      {/* Image Expanded Modal */}
      {imageExpanded && (profileForm.profilePhoto || profile.profilePhoto) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImageExpanded(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={editingProfile ? profileForm.profilePhoto : profile.profilePhoto}
              alt="Profile expanded" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setImageExpanded(false)}
              className="absolute top-4 right-4 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200 font-bold text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Profile Section */}
      {profile && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Profile Information</h2>
            <button
              onClick={() => {
                if (userStatus.suspended) {
                  alert('⚠️ Your account is suspended. You cannot edit your profile.');
                  return;
                }
                setEditingProfile(!editingProfile);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={userStatus.suspended}
            >
              {editingProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          
          {editingProfile ? (
            /* Edit Profile Form */
            <form onSubmit={updateProfile} className="space-y-6">
              {/* Profile Photo Section */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Profile Photo</h3>
                <div className="flex items-center gap-4">
                  {profileForm.profilePhoto ? (
                    <img 
                      src={profileForm.profilePhoto} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setImageExpanded(true)}
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
                    <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG • Click photo to expand</p>
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
                      onChange={(e) => handleProfileInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        nameViolation 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {nameViolation && (
                      <p className="text-red-600 text-sm mt-1">
                        ⚠️ {nameViolation.message} - {getShortWarning(userStatus.violationCount)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={profileForm.postcode || ''}
                      onChange={(e) => handleProfileInputChange('postcode', e.target.value)}
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
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                  disabled={nameViolation !== null}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setNameViolation(null);
                  }}
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
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setImageExpanded(true)}
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
                      disabled={uploadingImage || userStatus.suspended}
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <label 
                      htmlFor="profile-photo-upload"
                      className={`bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 inline-block ${
                        uploadingImage || userStatus.suspended ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </label>
                    <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG • Click photo to expand</p>
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

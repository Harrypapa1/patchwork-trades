import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

const TradesmanDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [imageExpanded, setImageExpanded] = useState(false);
  const [expandedPortfolioImage, setExpandedPortfolioImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;
    
    try {
      const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', currentUser.uid));
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

  // Share profile function
  const shareProfile = () => {
    const profileUrl = `https://patchworktrades.com/tradesman/${currentUser.uid}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${profile.name} - ${profile.tradeType}`,
        text: `Check out my professional tradesman profile on Patchwork Trades`,
        url: profileUrl
      });
    } else {
      navigator.clipboard.writeText(profileUrl).then(() => {
        alert('Profile link copied to clipboard!');
      });
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

  // Update profile with enhanced fields
  const updateProfile = async (e) => {
    e.preventDefault();
    
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

      await updateDoc(doc(db, 'tradesmen_profiles', currentUser.uid), updateData);
      setProfile(updateData);
      setEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  // Image compression function
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
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

      await updateDoc(doc(db, 'tradesmen_profiles', currentUser.uid), {
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

  // Handle portfolio image upload
  const handlePortfolioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Please choose an image under 5MB.');
      return;
    }

    setUploadingImage(true);

    try {
      const compressedFile = await compressImage(file, 800, 0.8);
      const base64 = await fileToBase64(compressedFile);

      const currentPortfolio = profile?.portfolio || [];
      const updatedPortfolio = [...currentPortfolio, {
        id: Date.now().toString(),
        image: base64,
        uploadedAt: new Date().toISOString()
      }];

      await updateDoc(doc(db, 'tradesmen_profiles', currentUser.uid), {
        portfolio: updatedPortfolio
      });

      setProfile(prev => ({ ...prev, portfolio: updatedPortfolio }));
      
      alert('Portfolio image added successfully!');
    } catch (error) {
      console.error('Error uploading portfolio image:', error);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Delete portfolio image
  const deletePortfolioImage = async (imageId) => {
    try {
      const updatedPortfolio = profile.portfolio.filter(img => img.id !== imageId);
      
      await updateDoc(doc(db, 'tradesmen_profiles', currentUser.uid), {
        portfolio: updatedPortfolio
      });

      setProfile(prev => ({ ...prev, portfolio: updatedPortfolio }));
    } catch (error) {
      console.error('Error deleting portfolio image:', error);
      alert('Error deleting image. Please try again.');
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

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }
    
    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">★</span>);
    }
    
    return stars;
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tradesman Dashboard</h1>
      
      {/* Profile Photo Expanded Modal */}
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

      {/* Portfolio Image Expanded Modal */}
      {expandedPortfolioImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedPortfolioImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={expandedPortfolioImage}
              alt="Portfolio expanded" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setExpandedPortfolioImage(null)}
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
            <div className="flex gap-2">
              <button
                onClick={shareProfile}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Share Profile
              </button>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {editingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
          
          {editingProfile ? (
            /* Edit Profile Form */
            <form onSubmit={updateProfile} className="space-y-6">
              {/* Profile Photo Section - IN EDIT MODE */}
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

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Basic Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      value={profileForm.yearsExperience || ''}
                      onChange={(e) => setProfileForm({...profileForm, yearsExperience: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (£)</label>
                    <input
                      type="number"
                      value={profileForm.hourlyRate || ''}
                      onChange={(e) => setProfileForm({...profileForm, hourlyRate: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 45"
                    />
                  </div>
                </div>
              </div>

              {/* Location Section */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
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
                      Used to calculate distance to customers
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area Covered</label>
                    <input
                      type="text"
                      value={profileForm.areaCovered || ''}
                      onChange={(e) => setProfileForm({...profileForm, areaCovered: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Manchester, Salford"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Details */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Professional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certifications & Qualifications</label>
                    <textarea
                      value={profileForm.certifications || ''}
                      onChange={(e) => setProfileForm({...profileForm, certifications: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="e.g. City & Guilds Level 3, Part P Certified, Gas Safe Registered"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specializations</label>
                    <textarea
                      value={profileForm.specializations || ''}
                      onChange={(e) => setProfileForm({...profileForm, specializations: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="e.g. Kitchen installations, Bathroom renovations, Emergency repairs"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Status</label>
                    <select
                      value={profileForm.insuranceStatus || ''}
                      onChange={(e) => setProfileForm({...profileForm, insuranceStatus: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select insurance status</option>
                      <option value="Fully Insured">Fully Insured (Public Liability & Professional Indemnity)</option>
                      <option value="Public Liability Only">Public Liability Insurance Only</option>
                      <option value="Not Insured">Not Currently Insured</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Services Offered */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700">Services Offered</h3>
                <textarea
                  value={profileForm.servicesOffered || ''}
                  onChange={(e) => setProfileForm({...profileForm, servicesOffered: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="List all services you provide, e.g.:
• Complete bathroom installations
• Kitchen electrical work
• Emergency call-outs
• Socket and switch installations
• Consumer unit upgrades"
                />
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
                      id="profile-photo-upload"
                    />
                    <label 
                      htmlFor="profile-photo-upload"
                      className={`bg-blue-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-600 inline-block ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    </label>
                    <p className="text-sm text-gray-500 mt-1">Max 5MB, JPG/PNG • Click photo to expand</p>
                  </div>
                </div>
              </div>

              {/* Basic Profile Info */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Trade Type</p>
                    <p className="font-medium">{profile.tradeType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Years of Experience</p>
                    <p className="font-medium">
                      {profile.yearsExperience ? `${profile.yearsExperience} years` : 'Not specified'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Postcode</p>
                    <p className="font-medium">{profile.postcode || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Area Covered</p>
                    <p className="font-medium">{profile.areaCovered}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Hourly Rate</p>
                    <p className="font-medium">
                      {profile.hourlyRate ? `£${profile.hourlyRate}/hour` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Insurance Status</p>
                    <p className="font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        profile.insuranceStatus === 'Fully Insured' ? 'bg-green-100 text-green-800' :
                        profile.insuranceStatus === 'Public Liability Only' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {profile.insuranceStatus || 'Not specified'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-1">Bio</p>
                <p className="font-medium">{profile.bio}</p>
              </div>

              {/* Professional Details */}
              {(profile.certifications || profile.specializations) && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Professional Details</h3>
                  {profile.certifications && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Certifications & Qualifications</p>
                      <p className="font-medium whitespace-pre-line">{profile.certifications}</p>
                    </div>
                  )}
                  {profile.specializations && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Specializations</p>
                      <p className="font-medium whitespace-pre-line">{profile.specializations}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Services Offered */}
              {profile.servicesOffered && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Services Offered</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-line">{profile.servicesOffered}</p>
                  </div>
                </div>
              )}

              {/* Portfolio Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Work Portfolio</h3>
                
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePortfolioUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="portfolio-upload"
                  />
                  <label 
                    htmlFor="portfolio-upload"
                    className={`bg-green-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-600 inline-block ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingImage ? 'Uploading...' : 'Add Portfolio Image'}
                  </label>
                  <p className="text-sm text-gray-500 mt-1">Show examples of your work • Click images to expand</p>
                </div>

                {profile.portfolio && profile.portfolio.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {profile.portfolio.map((portfolioItem) => (
                      <div key={portfolioItem.id} className="relative group">
                        <img 
                          src={portfolioItem.image} 
                          alt="Portfolio work" 
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setExpandedPortfolioImage(portfolioItem.image)}
                        />
                        <button
                          onClick={() => deletePortfolioImage(portfolioItem.id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No portfolio images uploaded yet.</p>
                )}
              </div>

              {/* Reviews Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Customer Reviews</h3>
                
                {profile.reviews && profile.reviews.length > 0 ? (
                  <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex text-xl">{renderStars(profile.average_rating || 0)}</div>
                            <span className="text-2xl font-bold text-blue-800">
                              {profile.average_rating || 0}/5
                            </span>
                          </div>
                          <p className="text-blue-700 text-sm">
                            Based on {profile.reviews.length} customer review{profile.reviews.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {profile.completed_jobs_count || 0}
                          </div>
                          <p className="text-green-700 text-sm">Jobs Completed</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {profile.reviews
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((review, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex text-lg">{renderStars(review.rating)}</div>
                              <span className="font-medium text-gray-900">
                                ({review.rating}/5)
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{review.customer_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(review.date).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            "{review.comment}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-2">★</div>
                    <h4 className="text-lg font-medium text-gray-600 mb-1">No Reviews Yet</h4>
                    <p className="text-gray-500 text-sm">
                      Customer reviews will appear here after you complete jobs and customers leave feedback.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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

export default TradesmanDashboard;

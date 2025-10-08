import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { trackProfileView, endProfileView } from '../utils/profileViewTracker'; // 🆕 NEW IMPORT

const TradesmanPublicProfile = () => {
  const { tradesmanId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userType } = useAuth(); // 🆕 ADDED userType
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTradesmanProfile();
  }, [tradesmanId]);

  // 🆕 NEW: Track profile view when component mounts
  useEffect(() => {
    if (profile && tradesmanId) {
      // Determine viewer info
      const viewerId = currentUser ? currentUser.uid : null;
      const viewerUserType = currentUser ? userType : 'anonymous';
      
      // Track the view
      trackProfileView(
        tradesmanId,
        profile.name,
        viewerId,
        viewerUserType
      );
      
      console.log('📊 Profile view tracked for:', profile.name);
    }
    
    // 🆕 NEW: End tracking when component unmounts (user leaves page)
    return () => {
      endProfileView();
    };
  }, [profile, tradesmanId, currentUser, userType]);

  const fetchTradesmanProfile = async () => {
    try {
      const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', tradesmanId));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data());
      } else {
        setError('Tradesman not found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (currentUser) {
      // If logged in, go directly to booking
      navigate(`/booking-request/${tradesmanId}`);
    } else {
      // If not logged in, redirect to login with return path
      navigate('/login', { 
        state: { 
          returnTo: `/booking-request/${tradesmanId}`,
          message: 'Please log in to book this tradesman'
        }
      });
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/browse-tradesmen" className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600">
            Browse All Tradesmen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/browse-tradesmen" className="text-blue-500 hover:text-blue-600 flex items-center">
              ← Back to Browse
            </Link>
            <button
              onClick={handleBookNow}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium"
            >
              Book This Tradesman
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {profile.profilePhoto ? (
                <img 
                  src={profile.profilePhoto} 
                  alt={profile.name} 
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-2xl border-4 border-gray-200">
                  {profile.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-grow">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{profile.name}</h1>
              <p className="text-xl text-blue-600 font-medium mb-2">{profile.tradeType}</p>
              <p className="text-gray-600 mb-4">{profile.bio}</p>
              
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {profile.yearsExperience || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
                <div className="text-center bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    £{profile.hourlyRate || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Per Hour</div>
                </div>
                <div className="text-center bg-gray-50 p-3 rounded">
                  <div className="flex justify-center text-xl mb-1">
                    {profile.average_rating ? renderStars(profile.average_rating) : '★★★★★'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {profile.average_rating ? profile.average_rating.toFixed(1) : 'No ratings yet'}
                  </div>
                </div>
                <div className="text-center bg-gray-50 p-3 rounded">
                  <div className="text-2xl font-bold text-purple-600">
                    {profile.completed_jobs_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">Jobs Done</div>
                </div>
              </div>
            </div>
          </div>

          {/* Insurance Badge */}
          <div className="mt-6 flex justify-center">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              profile.insuranceStatus === 'Fully Insured' ? 'bg-green-100 text-green-800' :
              profile.insuranceStatus === 'Public Liability Only' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              🛡️ {profile.insuranceStatus || 'Insurance status not specified'}
            </span>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contact & Coverage</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Area Covered</p>
              <p className="font-medium">{profile.areaCovered}</p>
            </div>
          </div>
        </div>

        {/* Professional Details */}
        {(profile.certifications || profile.specializations) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Professional Details</h2>
            
            {profile.certifications && (
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Certifications & Qualifications</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="whitespace-pre-line">{profile.certifications}</p>
                </div>
              </div>
            )}
            
            {profile.specializations && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Specializations</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="whitespace-pre-line">{profile.specializations}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services Offered */}
        {profile.servicesOffered && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Services Offered</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-line">{profile.servicesOffered}</p>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolio && profile.portfolio.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Work Portfolio</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profile.portfolio.map((portfolioItem) => (
                <div key={portfolioItem.id} className="relative group">
                  <img 
                    src={portfolioItem.image} 
                    alt="Portfolio work" 
                    className="w-full h-32 md:h-40 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
          
          {profile.reviews && profile.reviews.length > 0 ? (
            <div>
              {/* Overall Rating Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="flex justify-center text-3xl mb-2">
                    {renderStars(profile.average_rating || 0)}
                  </div>
                  <div className="text-3xl font-bold text-blue-800 mb-1">
                    {profile.average_rating || 0}/5
                  </div>
                  <p className="text-blue-700">
                    Based on {profile.reviews.length} customer review{profile.reviews.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-4">
                {profile.reviews
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((review, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex text-lg">{renderStars(review.rating)}</div>
                        <span className="font-medium text-gray-900">
                          ({review.rating}/5)
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{review.customer_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(review.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      "{review.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">★</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Reviews Yet</h3>
              <p className="text-gray-500">Be the first to book and review this tradesman!</p>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-6">
            Book {profile.name} for your next project and experience professional trade services.
          </p>
          <button
            onClick={handleBookNow}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 font-bold text-lg shadow-lg"
          >
            Book {profile.name} Now
          </button>
          <p className="text-blue-100 text-sm mt-3">
            {!currentUser && 'Quick registration required • '}No upfront payment • 5% platform fee
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradesmanPublicProfile;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import LazyImage from '../components/LazyImage';

const BrowseTradesmen = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tradesmen, setTradesmen] = useState([]);
  const [filteredTradesmen, setFilteredTradesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  
  // Search filters
  const [searchName, setSearchName] = useState('');
  const [searchTrade, setSearchTrade] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [searchServices, setSearchServices] = useState('');

  useEffect(() => {
    fetchTradesmen();
  }, []);

  // Filter tradesmen when search terms change
  useEffect(() => {
    filterTradesmen();
  }, [tradesmen, searchName, searchTrade, searchArea, searchServices]);

  const fetchTradesmen = async () => {
    try {
      const tradesmenSnapshot = await getDocs(collection(db, 'tradesmen_profiles'));
      const tradesmenData = [];
      
      for (const tradesmanDoc of tradesmenSnapshot.docs) {
        const tradesmanData = tradesmanDoc.data();
        
        // Fetch availability for this tradesman
        const availabilityQuery = query(
          collection(db, 'availability'),
          where('tradesman_id', '==', tradesmanDoc.id),
          where('is_booked', '==', false)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        const availableDates = availabilitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        tradesmenData.push({
          id: tradesmanDoc.id,
          ...tradesmanData,
          availableDates,
          // Add default values for new fields if they don't exist
          completed_jobs_count: tradesmanData.completed_jobs_count || 0,
          portfolio_images: tradesmanData.portfolio_images || [],
          reviews: tradesmanData.reviews || [],
          average_rating: tradesmanData.average_rating || 0
        });
      }
      
      setTradesmen(tradesmenData);
    } catch (error) {
      console.error('Error fetching tradesmen:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTradesmen = () => {
    let filtered = tradesmen;

    // Filter by name
    if (searchName.trim()) {
      filtered = filtered.filter(tradesman =>
        tradesman.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // Filter by trade type
    if (searchTrade.trim()) {
      filtered = filtered.filter(tradesman =>
        tradesman.tradeType.toLowerCase().includes(searchTrade.toLowerCase())
      );
    }

    // Filter by area
    if (searchArea.trim()) {
      filtered = filtered.filter(tradesman =>
        tradesman.areaCovered.toLowerCase().includes(searchArea.toLowerCase())
      );
    }

    // Filter by services/jobs
    if (searchServices.trim()) {
      filtered = filtered.filter(tradesman => {
        const searchTerm = searchServices.toLowerCase();
        
        // Search in various fields where services might be listed
        const searchFields = [
          tradesman.services || '',
          tradesman.specializations || '',
          tradesman.servicesOffered || '',
          tradesman.bio || '',
          tradesman.description || ''
        ];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(searchTerm)
        );
      });
    }

    setFilteredTradesmen(filtered);
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchTrade('');
    setSearchArea('');
    setSearchServices('');
  };

  const handleBooking = (tradesmanId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    navigate('/booking-request', {
      state: { tradesmanId }
    });
  };

  const toggleExpanded = (tradesmanId) => {
    setExpandedCard(expandedCard === tradesmanId ? null : tradesmanId);
  };

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

  const renderPortfolioGallery = (images) => {
    if (!images || images.length === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
          No portfolio images available
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {images.slice(0, 6).map((image, index) => (
          <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <LazyImage
              src={image}
              alt={`Portfolio ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
        ))}
        {images.length > 6 && (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
            +{images.length - 6} more
          </div>
        )}
      </div>
    );
  };

  const renderReviews = (reviews) => {
    if (!reviews || reviews.length === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-500">
          No reviews available yet
        </div>
      );
    }

    const recentReviews = reviews.slice(0, 3);

    return (
      <div className="space-y-3">
        {recentReviews.map((review, index) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="flex">{renderStars(review.rating)}</div>
                <span className="text-sm text-gray-600">({review.rating}/5)</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-1">"{review.comment}"</p>
            <p className="text-xs text-gray-500">- {review.customer_name}</p>
          </div>
        ))}
        {reviews.length > 3 && (
          <p className="text-sm text-gray-500 text-center">
            +{reviews.length - 3} more reviews
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading tradesmen...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Browse Tradesmen</h1>
      
      {/* Search Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Search & Filter</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search by Name
            </label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Enter tradesman name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade Type
            </label>
            <input
              type="text"
              value={searchTrade}
              onChange={(e) => setSearchTrade(e.target.value)}
              placeholder="e.g. Electrician, Plumber..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <input
              type="text"
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              placeholder="e.g. London, Manchester..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Services/Jobs
            </label>
            <input
              type="text"
              value={searchServices}
              onChange={(e) => setSearchServices(e.target.value)}
              placeholder="e.g. change plugs, fix toilet..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredTradesmen.length} of {tradesmen.length} tradesmen
          </p>
          
          {(searchName || searchTrade || searchArea || searchServices) && (
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredTradesmen.length === 0 ? (
        <div className="text-center py-8">
          {tradesmen.length === 0 ? (
            <p className="text-gray-500">No tradesmen available at the moment.</p>
          ) : (
            <div>
              <p className="text-gray-500 mb-2">No tradesmen match your search criteria.</p>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters to see all tradesmen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTradesmen.map(tradesman => {
            const isExpanded = expandedCard === tradesman.id;
            
            return (
              <div key={tradesman.id} className={`bg-white rounded-lg shadow-md transition-all duration-300 ${
                isExpanded ? 'md:col-span-2 lg:col-span-3' : ''
              }`}>
                {/* Basic Card View */}
                <div className="p-6">
                  {/* Profile Header */}
                  <div className="flex items-center mb-4">
                    {tradesman.profilePhoto ? (
                      <LazyImage 
                        src={tradesman.profilePhoto} 
                        alt={tradesman.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3 text-xs">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{tradesman.name}</h3>
                      <p className="text-gray-600">{tradesman.tradeType}</p>
                    </div>
                    
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleExpanded(tradesman.id)}
                      className="text-blue-600 hover:text-blue-800 ml-2 p-2"
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm">
                      {/* Job Count */}
                      <div className="flex items-center space-x-1">
                        <span className="text-green-600 font-medium">
                          {tradesman.completed_jobs_count} jobs
                        </span>
                      </div>
                      
                      {/* Star Rating */}
                      {tradesman.average_rating > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="flex">{renderStars(tradesman.average_rating)}</div>
                          <span className="text-gray-600">
                            ({tradesman.reviews.length})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Details */}
                  <div className="mb-4 space-y-2">
                    <p className="text-gray-600"><strong>Area:</strong> {tradesman.areaCovered}</p>
                    
                    {/* Hourly Rate - Prominent Display */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-blue-800 font-semibold">
                        {tradesman.hourlyRate ? `£${tradesman.hourlyRate}/hour` : 'Rate on request'}
                      </p>
                      {tradesman.yearsExperience && (
                        <p className="text-blue-600 text-sm">{tradesman.yearsExperience} years experience</p>
                      )}
                    </div>

                    {/* Insurance Badge */}
                    {tradesman.insuranceStatus && (
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tradesman.insuranceStatus === 'Fully Insured' ? 'bg-green-100 text-green-800' :
                          tradesman.insuranceStatus === 'Public Liability Only' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tradesman.insuranceStatus}
                        </span>
                      </div>
                    )}

                    {/* Bio Preview */}
                    <p className="text-gray-600 text-sm">
                      {isExpanded ? tradesman.bio : `${tradesman.bio?.slice(0, 100)}...`}
                    </p>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t pt-4 space-y-6">
                      {/* Full Services */}
                      {tradesman.servicesOffered && (
                        <div>
                          <h4 className="font-medium mb-2">Services Offered:</h4>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            {tradesman.servicesOffered}
                          </p>
                        </div>
                      )}

                      {/* Portfolio Gallery */}
                      <div>
                        <h4 className="font-medium mb-3">Work Portfolio:</h4>
                        {renderPortfolioGallery(tradesman.portfolio_images)}
                      </div>

                      {/* Recent Reviews */}
                      <div>
                        <h4 className="font-medium mb-3">Recent Reviews:</h4>
                        {renderReviews(tradesman.reviews)}
                      </div>
                    </div>
                  )}
                  
                  {/* Available Dates & Booking */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Next Available:</h4>
                    {tradesman.availableDates.length === 0 ? (
                      <p className="text-gray-500 text-sm mb-3">No dates available</p>
                    ) : (
                      <div className="mb-3">
                        <ul className="text-sm text-green-600 space-y-1">
                          {tradesman.availableDates.slice(0, 3).map(date => (
                            <li key={date.id} className="flex items-center">
                              <span className="w-1 h-1 bg-green-600 rounded-full mr-2"></span>
                              {new Date(date.date_available).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'long' 
                              })}
                            </li>
                          ))}
                          {tradesman.availableDates.length > 3 && (
                            <li className="text-gray-500 text-xs ml-3">
                              +{tradesman.availableDates.length - 3} more dates
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    
                    {/* Request Quote Button */}
                    <button
                      onClick={() => handleBooking(tradesman.id)}
                      className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                        tradesman.availableDates.length > 0 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      }`}
                      disabled={tradesman.availableDates.length === 0}
                    >
                      {tradesman.availableDates.length > 0 ? 'Request Quote' : 'No Availability'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BrowseTradesmen;

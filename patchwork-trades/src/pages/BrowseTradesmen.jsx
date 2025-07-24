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

const BrowseTradesmen = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tradesmen, setTradesmen] = useState([]);
  const [filteredTradesmen, setFilteredTradesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
          availableDates
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
          {filteredTradesmen.map(tradesman => (
            <div key={tradesman.id} className="bg-white rounded-lg shadow-md p-6">
              {/* Profile Photo */}
              <div className="flex items-center mb-4">
                {tradesman.profilePhoto ? (
                  <img 
                    src={tradesman.profilePhoto} 
                    alt={tradesman.name} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 mr-3"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3 text-xs">
                    No Photo
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{tradesman.name}</h3>
                  <p className="text-gray-600">{tradesman.tradeType}</p>
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

                {/* Bio */}
                <p className="text-gray-600 text-sm">{tradesman.bio}</p>

                {/* Services Preview */}
                {tradesman.servicesOffered && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    <strong>Services:</strong> {tradesman.servicesOffered.slice(0, 100)}...
                  </div>
                )}
              </div>
              
              {/* Available Dates */}
              <div className="border-t pt-4">
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
                  onClick={() => handleBooking(tradesman.id, null)}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseTradesmen;

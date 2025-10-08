import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import LazyImage from '../components/LazyImage';

// Distance calculation function (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
};

const BrowseTradesmen = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tradesmen, setTradesmen] = useState([]);
  const [filteredTradesmen, setFilteredTradesmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  const [detailedData, setDetailedData] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Filter states
  const [insuranceFilter, setInsuranceFilter] = useState('any');
  const [minRatingFilter, setMinRatingFilter] = useState('any');
  const [sortByPrice, setSortByPrice] = useState('default');
  
  // NEW: Location states
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState('any');

  const TIME_SLOTS = {
    'morning': { label: 'Morning', time: '9am-1pm' },
    'afternoon': { label: 'Afternoon', time: '1pm-5pm' },
    'evening': { label: 'Evening', time: '5pm-8pm' }
  };

  const TRADE_KEYWORDS = {
    'Electrician': ['electric', 'electrician', 'wire', 'wiring', 'light', 'lighting', 'socket', 'fuse', 'rewire', 'power', 'electrical'],
    'Plumber': ['plumb', 'plumber', 'tap', 'leak', 'pipe', 'drain', 'toilet', 'sink', 'bathroom', 'boiler', 'heating', 'water'],
    'Tiler': ['tile', 'tiles', 'tiler', 'tiling', 'grout', 'bathroom', 'kitchen', 'floor', 'wall'],
    'Carpenter': ['carpenter', 'wood', 'cabinet', 'door', 'shelf', 'shelving', 'deck', 'fence', 'carpentry'],
    'Painter': ['paint', 'painter', 'painting', 'decorator', 'decorate', 'wall', 'ceiling', 'redecorate'],
    'Gardener': ['garden', 'gardener', 'lawn', 'grass', 'hedge', 'tree', 'landscaping', 'outdoor'],
    'Cleaner': ['clean', 'cleaner', 'cleaning', 'tidy', 'deep clean', 'domestic'],
    'Handyman': ['handyman', 'odd jobs', 'fix', 'repair', 'general', 'maintenance'],
    'Roofer': ['roof', 'roofer', 'roofing', 'gutter', 'tiles', 'slate', 'leak'],
    'Builder': ['builder', 'building', 'extension', 'renovation', 'construction', 'brick', 'wall'],
    'Locksmith': ['lock', 'locksmith', 'key', 'door', 'security', 'broken lock'],
    'Decorator': ['decorator', 'decorate', 'wallpaper', 'paint', 'interior'],
    'Flooring Specialist': ['floor', 'flooring', 'laminate', 'carpet', 'vinyl', 'wood floor']
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchUserLocation();
    fetchTradesmen();
  }, []);

  useEffect(() => {
    filterTradesmen();
  }, [tradesmen, searchQuery, selectedDates, insuranceFilter, minRatingFilter, sortByPrice, maxDistance, userLocation]);

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // NEW: Fetch user's location from Firebase
  const fetchUserLocation = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.latitude && userData.longitude) {
          setUserLocation({
            postcode: userData.postcode,
            latitude: userData.latitude,
            longitude: userData.longitude
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user location:', error);
    }
  };

  const fetchTradesmen = async () => {
    try {
      const tradesmenSnapshot = await getDocs(collection(db, 'tradesmen_profiles'));
      const tradesmenData = [];
      
      for (const tradesmanDoc of tradesmenSnapshot.docs) {
        const tradesmanData = tradesmanDoc.data();
        
        const availabilityQuery = query(
          collection(db, 'availability'),
          where('tradesman_id', '==', tradesmanDoc.id)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        
        const availableTimeSlots = [];
        
        availabilitySnapshot.docs.forEach(doc => {
          const availabilityData = doc.data();
          const date = availabilityData.date;
          const slots = availabilityData.available_slots || [];
          
          const slotDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (slotDate >= today) {
            slots.forEach(slot => {
              if (!slot.is_booked) {
                availableTimeSlots.push({
                  date: date,
                  slot_id: slot.slot_id,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  display_time: TIME_SLOTS[slot.slot_id]?.time || `${slot.start_time}-${slot.end_time}`
                });
              }
            });
          }
        });

        availableTimeSlots.sort((a, b) => {
          const dateCompare = new Date(a.date) - new Date(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.start_time.localeCompare(b.start_time);
        });
        
        tradesmenData.push({
          id: tradesmanDoc.id,
          name: tradesmanData.name,
          email: tradesmanData.email,
          tradeType: tradesmanData.tradeType,
          areaCovered: tradesmanData.areaCovered,
          bio: tradesmanData.bio,
          hourlyRate: tradesmanData.hourlyRate,
          yearsExperience: tradesmanData.yearsExperience,
          insuranceStatus: tradesmanData.insuranceStatus,
          profilePhoto: tradesmanData.profilePhoto,
          servicesOffered: tradesmanData.servicesOffered,
          availableTimeSlots,
          completed_jobs_count: tradesmanData.completed_jobs_count || 0,
          average_rating: tradesmanData.average_rating || 0,
          review_count: tradesmanData.reviews?.length || 0,
          // NEW: Location data
          postcode: tradesmanData.postcode,
          latitude: tradesmanData.latitude,
          longitude: tradesmanData.longitude
        });
      }
      
      setTradesmen(tradesmenData);
      setFilteredTradesmen(tradesmenData);
    } catch (error) {
      console.error('Error fetching tradesmen:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTradesmanDetails = async (tradesmanId) => {
    if (detailedData[tradesmanId]) {
      return detailedData[tradesmanId];
    }

    setLoadingDetails(true);
    
    try {
      const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', tradesmanId));
      
      if (tradesmanDoc.exists()) {
        const data = tradesmanDoc.data();
        const details = {
          portfolio_images: data.portfolio ? data.portfolio.map(item => item.image) : [],
          reviews: data.reviews || []
        };
        
        setDetailedData(prev => ({
          ...prev,
          [tradesmanId]: details
        }));
        
        return details;
      }
    } catch (error) {
      console.error('Error fetching tradesman details:', error);
    } finally {
      setLoadingDetails(false);
    }
    
    return { portfolio_images: [], reviews: [] };
  };

  const matchTradesByKeywords = (query) => {
    const lowerQuery = query.toLowerCase();
    const matchedTrades = [];
    
    Object.entries(TRADE_KEYWORDS).forEach(([trade, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerQuery.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > 0) {
        matchedTrades.push({ trade, score });
      }
    });
    
    return matchedTrades.sort((a, b) => b.score - a.score).map(m => m.trade);
  };

  const filterTradesmen = () => {
    let filtered = tradesmen;

    // Calculate distances if user has location
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      filtered = filtered.map(tradesman => {
        if (tradesman.latitude && tradesman.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            tradesman.latitude,
            tradesman.longitude
          );
          return { ...tradesman, distance: distance };
        }
        return { ...tradesman, distance: null };
      });
    }

    // Distance filter
    if (maxDistance !== 'any' && userLocation) {
      const maxDist = parseFloat(maxDistance);
      filtered = filtered.filter(tradesman => {
        return tradesman.distance !== null && tradesman.distance <= maxDist;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const matchedTrades = matchTradesByKeywords(searchQuery);
      
      if (matchedTrades.length > 0) {
        filtered = filtered.filter(tradesman =>
          matchedTrades.some(trade => 
            tradesman.tradeType.toLowerCase().includes(trade.toLowerCase())
          ) ||
          tradesman.servicesOffered?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tradesman.bio?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else {
        filtered = filtered.filter(tradesman =>
          tradesman.tradeType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tradesman.servicesOffered?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tradesman.bio?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    // Date filter
    if (selectedDates.length > 0) {
      filtered = filtered.filter(tradesman => {
        return selectedDates.some(selectedDate => {
          return tradesman.availableTimeSlots.some(slot => slot.date === selectedDate);
        });
      });
    }

    // Insurance filter
    if (insuranceFilter !== 'any') {
      filtered = filtered.filter(tradesman => {
        if (insuranceFilter === 'fully-insured') {
          return tradesman.insuranceStatus === 'Fully Insured';
        } else if (insuranceFilter === 'public-liability') {
          return tradesman.insuranceStatus === 'Public Liability Only';
        } else if (insuranceFilter === 'not-insured') {
          return tradesman.insuranceStatus === 'Not Insured' || !tradesman.insuranceStatus;
        }
        return true;
      });
    }

    // Minimum rating filter
    if (minRatingFilter !== 'any') {
      const minRating = parseFloat(minRatingFilter);
      filtered = filtered.filter(tradesman => {
        return tradesman.review_count > 0 && tradesman.average_rating >= minRating;
      });
    }

    // Sort by price or distance
    if (sortByPrice === 'distance' && userLocation) {
      filtered = [...filtered].sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortByPrice !== 'default') {
      filtered = [...filtered].sort((a, b) => {
        const aRate = a.hourlyRate;
        const bRate = b.hourlyRate;
        
        if (!aRate && !bRate) return 0;
        if (!aRate) return 1;
        if (!bRate) return -1;
        
        if (sortByPrice === 'low-to-high') {
          return aRate - bRate;
        } else if (sortByPrice === 'high-to-low') {
          return bRate - aRate;
        }
        return 0;
      });
    }

    setFilteredTradesmen(filtered);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.trim().length === 0) {
      setHasSearched(false);
      return;
    }
    
    const newTimeout = setTimeout(() => {
      if (query.trim().length > 0) {
        setHasSearched(true);
      }
    }, 1000);
    
    setSearchTimeout(newTimeout);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setShowDateFilter(false);
    setSelectedDates([]);
    setInsuranceFilter('any');
    setMinRatingFilter('any');
    setSortByPrice('default');
    setMaxDistance('any');
  };

  const toggleDate = (dateStr) => {
    setSelectedDates(prev => 
      prev.includes(dateStr)
        ? prev.filter(date => date !== dateStr)
        : [...prev, dateStr]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedDates([]);
    setHasSearched(false);
    setShowDateFilter(false);
    setInsuranceFilter('any');
    setMinRatingFilter('any');
    setSortByPrice('default');
    setMaxDistance('any');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedDates.length > 0) count++;
    if (insuranceFilter !== 'any') count++;
    if (minRatingFilter !== 'any') count++;
    if (sortByPrice !== 'default') count++;
    if (maxDistance !== 'any') count++;
    return count;
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const formatDateString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isDateInPast = (year, month, day) => {
    const today = new Date();
    const checkDate = new Date(year, month, day);
    return checkDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const hasAvailabilityOnDate = (dateStr) => {
    return filteredTradesmen.some(tradesman => 
      tradesman.availableTimeSlots.some(slot => slot.date === dateStr)
    );
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    
    const days = [];
    const dayNames = isMobileView ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    dayNames.forEach(day => {
      days.push(
        <div key={day} className="p-2 text-center font-semibold text-gray-600 text-xs">
          {day}
        </div>
      );
    });

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(year, month, day);
      const isPast = isDateInPast(year, month, day);
      const hasAvailability = hasAvailabilityOnDate(dateStr);
      const isSelected = selectedDates.includes(dateStr);
      
      let className = "p-2 text-center cursor-pointer rounded-lg border-2 transition-all ";
      
      if (isPast) {
        className += "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200";
      } else if (isSelected) {
        className += "bg-blue-500 text-white border-blue-600 font-bold";
      } else if (hasAvailability) {
        className += "bg-green-50 text-green-800 border-green-300 hover:bg-green-100";
      } else {
        className += "bg-white text-gray-400 border-gray-200 cursor-not-allowed";
      }

      days.push(
        <div
          key={day}
          className={className}
          onClick={() => {
            if (isPast || !hasAvailability) return;
            toggleDate(dateStr);
          }}
          style={{ minHeight: isMobileView ? '40px' : '50px' }}
        >
          <div className="font-medium">{day}</div>
          {hasAvailability && !isPast && (
            <div className="text-xs mt-1">
              {isSelected ? '✓' : '•'}
            </div>
          )}
        </div>
      );
    }

    return days;
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

  const toggleExpanded = async (tradesmanId) => {
    if (expandedCard === tradesmanId) {
      setExpandedCard(null);
    } else {
      setExpandedCard(tradesmanId);
      await fetchTradesmanDetails(tradesmanId);
    }
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

  const renderPortfolioGallery = (images, isLoading) => {
    if (isLoading) {
      return (
        <div className="bg-gray-50 p-2 rounded text-center text-gray-500 text-sm">
          Loading portfolio...
        </div>
      );
    }

    if (!images || images.length === 0) {
      return (
        <div className="bg-gray-50 p-2 rounded text-center text-gray-500 text-sm">
          No portfolio images available
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {images.slice(0, 6).map((image, index) => (
          <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
            <LazyImage
              src={image}
              alt={`Portfolio ${index + 1}`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
        ))}
        {images.length > 6 && (
          <div className="aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs">
            +{images.length - 6} more
          </div>
        )}
      </div>
    );
  };

  const renderReviews = (reviews, isLoading) => {
    if (isLoading) {
      return (
        <div className="bg-gray-50 p-2 rounded text-center text-gray-500 text-sm">
          Loading reviews...
        </div>
      );
    }

    if (!reviews || reviews.length === 0) {
      return (
        <div className="bg-gray-50 p-2 rounded text-center text-gray-500 text-sm">
          No reviews available yet
        </div>
      );
    }

    const recentReviews = reviews.slice(0, 3);

    return (
      <div className="space-y-2">
        {recentReviews.map((review, index) => (
          <div key={index} className="bg-gray-50 p-2 rounded">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <div className="flex text-sm">{renderStars(review.rating)}</div>
                <span className="text-xs text-gray-600">({review.rating}/5)</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(review.date).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-gray-700 mb-1">"{review.comment}"</p>
            <p className="text-xs text-gray-500">- {review.customer_name}</p>
          </div>
        ))}
        {reviews.length > 3 && (
          <p className="text-xs text-gray-500 text-center">
            +{reviews.length - 3} more reviews
          </p>
        )}
      </div>
    );
  };

  const renderAvailableTimeSlots = (tradesman) => {
    if (tradesman.availableTimeSlots.length === 0) {
      return <p className="text-gray-500 text-sm mb-3">No time slots available</p>;
    }

    const slotsByDate = {};
    tradesman.availableTimeSlots.slice(0, 6).forEach(slot => {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push(slot);
    });

    return (
      <div className="mb-3 space-y-2">
        {Object.entries(slotsByDate).map(([date, slots]) => (
          <div key={date} className="text-sm">
            <div className="font-medium text-gray-700 mb-1">
              {new Date(date).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short',
                weekday: 'short'
              })}
            </div>
            <div className="flex flex-wrap gap-1">
              {slots.map((slot, index) => (
                <span 
                  key={index}
                  className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                >
                  {slot.display_time}
                </span>
              ))}
            </div>
          </div>
        ))}
        
        {tradesman.availableTimeSlots.length > 6 && (
          <p className="text-xs text-gray-500">
            +{tradesman.availableTimeSlots.length - 6} more time slots available
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tradespeople...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!hasSearched ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 text-center">
            Find a Tradesperson
          </h1>
          <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl">
            Search by describing what you need done
          </p>
          
          {/* Show user location if available */}
          {userLocation && (
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                Searching near <span className="font-medium">{userLocation.postcode}</span>
              </p>
              <button
                onClick={() => navigate('/customer-dashboard')}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Not at this address?
              </button>
            </div>
          )}
          
          <div className="relative w-full max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="e.g., 'fix my leaky tap', 'paint bedroom', 'tile my bathroom'..."
              className="w-full px-6 py-5 text-lg border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none shadow-lg hover:shadow-xl transition-shadow"
              style={{ minHeight: '64px' }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-3">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Plumber', 'Electrician', 'Painter', 'Gardener', 'Carpenter'].map(trade => (
                <button
                  key={trade}
                  onClick={() => {
                    setSearchQuery(trade.toLowerCase());
                    setHasSearched(true);
                    filterTradesmen();
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {trade}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${isMobileView ? 'max-w-full px-4' : 'max-w-7xl mx-auto px-6'} py-8`}>
          <div className="mb-8">
            <div className="relative max-w-3xl">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="e.g., 'fix my leaky tap', 'paint bedroom', 'tile my bathroom'..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full focus:border-blue-500 focus:outline-none shadow-sm"
                style={{ minHeight: '56px' }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              )}
            </div>
            
            {/* Show user location */}
            {userLocation && (
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <span>Searching near <span className="font-medium">{userLocation.postcode}</span></span>
                <button
                  onClick={() => navigate('/customer-dashboard')}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Not at this address?
                </button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="mb-4">
              <p className="text-lg font-medium text-gray-900">
                {filteredTradesmen.length} {filteredTradesmen.length === 1 ? 'tradesperson' : 'tradespeople'} found
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>
            
            {/* Horizontal Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Date Filter Button */}
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                style={{ minHeight: '44px' }}
              >
                <span>{showDateFilter ? 'Hide' : 'Filter by'} dates</span>
                {selectedDates.length > 0 && (
                  <span className="bg-blue-800 px-2 py-1 rounded-full text-xs">
                    {selectedDates.length}
                  </span>
                )}
              </button>

              {/* Distance Filter - only show if user has location */}
              {userLocation && (
                <div className="relative">
                  <select
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white cursor-pointer appearance-none pr-10"
                    style={{ minHeight: '44px' }}
                  >
                    <option value="any">Any Distance</option>
                    <option value="5">Within 5 miles</option>
                    <option value="10">Within 10 miles</option>
                    <option value="25">Within 25 miles</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Insurance Filter */}
              <div className="relative">
                <select
                  value={insuranceFilter}
                  onChange={(e) => setInsuranceFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white cursor-pointer appearance-none pr-10"
                  style={{ minHeight: '44px' }}
                >
                  <option value="any">Any Insurance</option>
                  <option value="fully-insured">Fully Insured</option>
                  <option value="public-liability">Public Liability</option>
                  <option value="not-insured">Not Insured</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="relative">
                <select
                  value={minRatingFilter}
                  onChange={(e) => setMinRatingFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white cursor-pointer appearance-none pr-10"
                  style={{ minHeight: '44px' }}
                >
                  <option value="any">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Sort by Price/Distance */}
              <div className="relative">
                <select
                  value={sortByPrice}
                  onChange={(e) => setSortByPrice(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white cursor-pointer appearance-none pr-10"
                  style={{ minHeight: '44px' }}
                >
                  <option value="default">Sort by</option>
                  {userLocation && <option value="distance">Nearest First</option>}
                  <option value="low-to-high">Price: Low to High</option>
                  <option value="high-to-low">Price: High to Low</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Clear all filters button */}
              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear all filters ({getActiveFilterCount()})
                </button>
              )}
            </div>

            {/* Active Filter Badges */}
            {getActiveFilterCount() > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDates.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''}
                    <button
                      onClick={() => setSelectedDates([])}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {maxDistance !== 'any' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    Within {maxDistance} miles
                    <button
                      onClick={() => setMaxDistance('any')}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {insuranceFilter !== 'any' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {insuranceFilter === 'fully-insured' ? 'Fully Insured' : 
                        insuranceFilter === 'public-liability' ? 'Public Liability' : 'Not Insured'}
                    <button
                      onClick={() => setInsuranceFilter('any')}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {minRatingFilter !== 'any' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {minRatingFilter}+ Stars
                    <button
                      onClick={() => setMinRatingFilter('any')}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {sortByPrice !== 'default' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {sortByPrice === 'distance' ? 'Nearest First' : 
                        sortByPrice === 'low-to-high' ? 'Low to High' : 'High to Low'}
                    <button
                      onClick={() => setSortByPrice('default')}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Date Filter Calendar */}
            {showDateFilter && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Select dates you need work done</h3>
                  {selectedDates.length > 0 && (
                    <button
                      onClick={() => setSelectedDates([])}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Clear dates
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ← Prev
                  </button>
                  
                  <h4 className="text-lg font-medium">
                    {currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </h4>
                  
                  <button
                    onClick={() => navigateMonth(1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Next →
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-4">
                  {renderCalendar()}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded"></div>
                    <span>Selected</span>
                  </div>
                </div>

                {selectedDates.length > 0 && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Selected dates ({selectedDates.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDates.map(dateStr => (
                        <span 
                          key={dateStr} 
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {new Date(dateStr).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short'
                          })}
                          <button
                            onClick={() => toggleDate(dateStr)}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredTradesmen.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xl text-gray-600 mb-4">
                  No tradespeople found matching your filters
                </p>
                <p className="text-gray-500 mb-6">Try adjusting your filters or clearing them</p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          ) : (
            <div className={`grid gap-6 ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredTradesmen.map(tradesman => {
                const isExpanded = expandedCard === tradesman.id;
                const details = detailedData[tradesman.id] || { portfolio_images: [], reviews: [] };
                
                return (
                  <div key={tradesman.id} className="relative">
                    {isExpanded && (
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-10"
                        onClick={() => setExpandedCard(null)}
                      ></div>
                    )}
                    
                    <div className={`bg-white rounded-lg shadow-md transition-all duration-300 ${
                      isExpanded ? 'relative z-20 transform scale-105 shadow-2xl ring-4 ring-blue-500' : ''
                    }`}>
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={(e) => {
                          if (!e.target.closest('button')) {
                            toggleExpanded(tradesman.id);
                          }
                        }}
                      >
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
                            {/* Show distance if available */}
                            {tradesman.distance !== undefined && tradesman.distance !== null && (
                              <p className="text-sm text-blue-600">
                                {tradesman.distance.toFixed(1)} miles away
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(tradesman.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 ml-2 p-2 rounded-full hover:bg-blue-50"
                            style={{ minHeight: '44px', minWidth: '44px' }}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <span className="text-green-600 font-medium">
                                {tradesman.completed_jobs_count} jobs
                              </span>
                            </div>
                            
                            {tradesman.average_rating > 0 && (
                              <div className="flex items-center space-x-1">
                                <div className="flex">{renderStars(tradesman.average_rating)}</div>
                                <span className="text-gray-600">
                                  ({tradesman.review_count})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mb-4 space-y-2">
                          <p className="text-gray-600"><strong>Area:</strong> {tradesman.areaCovered}</p>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 font-semibold">
                              {tradesman.hourlyRate ? `£${tradesman.hourlyRate}/hour` : 'Rate on request'}
                            </p>
                            {tradesman.yearsExperience && (
                              <p className="text-blue-600 text-sm">{tradesman.yearsExperience} years experience</p>
                            )}
                          </div>

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

                          <p className="text-gray-600 text-sm">
                            {isExpanded ? tradesman.bio : `${tradesman.bio?.slice(0, 100)}...`}
                          </p>
                        </div>

                        {isExpanded && (
                          <div className="border-t pt-3 space-y-4">
                            {tradesman.servicesOffered && (
                              <div>
                                <h4 className="font-medium mb-2 text-sm">Services Offered:</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  {tradesman.servicesOffered}
                                </p>
                              </div>
                            )}

                            <div>
                              <h4 className="font-medium mb-2 text-sm">Work Portfolio:</h4>
                              {renderPortfolioGallery(details.portfolio_images, loadingDetails)}
                            </div>

                            <div>
                              <h4 className="font-medium mb-2 text-sm">Recent Reviews:</h4>
                              {renderReviews(details.reviews, loadingDetails)}
                            </div>
                          </div>
                        )}
                        
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-medium mb-2">Available Time Slots:</h4>
                          {renderAvailableTimeSlots(tradesman)}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBooking(tradesman.id);
                            }}
                            className={`w-full py-3 px-4 rounded font-medium transition-colors ${
                              tradesman.availableTimeSlots.length > 0 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-400 text-white cursor-not-allowed'
                            }`}
                            style={{ minHeight: '48px' }}
                            disabled={tradesman.availableTimeSlots.length === 0}
                          >
                            {tradesman.availableTimeSlots.length > 0 ? 'Request Quote' : 'No Time Slots Available'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {isMobileView && <div className="h-20"></div>}
        </div>
      )}
    </div>
  );
};

export default BrowseTradesmen;

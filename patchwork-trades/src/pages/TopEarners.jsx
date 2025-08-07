import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';

// Mock hooks and components for demo purposes
const useAuth = () => ({
  currentUser: { uid: 'demo-user-123' },
  userType: 'tradesman'
});

const useNavigate = () => (path) => console.log(`Navigate to: ${path}`);

// Mock Firebase config
const db = {};

const TopEarners = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [topEarners, setTopEarners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });

  useEffect(() => {
    // Demo data for the Top Earners page
    const mockTopEarners = [
      {
        tradesman_id: 'trader-1',
        tradesman_name: 'Sarah Thompson',
        trade_type: 'Electrician',
        area_covered: 'Hackney, N16',
        total_earnings: 2850,
        job_count: 8,
        rank: 1,
        average_rating: 4.9,
        completed_jobs_total: 47,
        profile_photo: null
      },
      {
        tradesman_id: 'trader-2',
        tradesman_name: 'Marcus Johnson',
        trade_type: 'Plumber',
        area_covered: 'Camden, NW1',
        total_earnings: 2340,
        job_count: 6,
        rank: 2,
        average_rating: 4.8,
        completed_jobs_total: 33,
        profile_photo: null
      },
      {
        tradesman_id: 'trader-3',
        tradesman_name: 'Emma Davies',
        trade_type: 'Carpenter',
        area_covered: 'Islington, N1',
        total_earnings: 1890,
        job_count: 5,
        rank: 3,
        average_rating: 4.7,
        completed_jobs_total: 29,
        profile_photo: null
      },
      {
        tradesman_id: 'trader-4',
        tradesman_name: 'James Wilson',
        trade_type: 'Painter',
        area_covered: 'Shoreditch, E2',
        total_earnings: 1650,
        job_count: 7,
        rank: 4,
        average_rating: 4.6,
        completed_jobs_total: 22,
        profile_photo: null
      },
      {
        tradesman_id: 'trader-5',
        tradesman_name: 'Lisa Garcia',
        trade_type: 'Tiler',
        area_covered: 'Clapham, SW4',
        total_earnings: 1420,
        job_count: 4,
        rank: 5,
        average_rating: 4.8,
        completed_jobs_total: 18,
        profile_photo: null
      }
    ];

    const mockCurrentUserStats = {
      earnings: 920,
      jobCount: 3,
      rank: null // Not in top 5
    };

    const getCurrentWeekRange = () => {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      
      return {
        start: startOfWeek.toISOString(),
        end: endOfWeek.toISOString(),
        displayStart: startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
        displayEnd: endOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      };
    };

    // Simulate loading delay
    setTimeout(() => {
      setTopEarners(mockTopEarners);
      setCurrentUserStats(mockCurrentUserStats);
      setWeekRange(getCurrentWeekRange());
      setLoading(false);
    }, 1000);
  }, []);

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatEarnings = (amount) => {
    return `£${amount.toLocaleString('en-GB')}`;
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading top earners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Top Earners</h1>
        <p className="text-gray-600">
          Weekly leaderboard for {weekRange.displayStart} - {weekRange.displayEnd}
        </p>
      </div>

      {/* Weekly Winner Reward Banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎉 Weekly Top Earner Bonus!</h2>
            <p className="text-lg">
              Each week's #1 tradesperson gets an <strong>invite to the exclusive end-of-year Patchwork Christmas Party</strong>
            </p>
            <p className="text-sm mt-2 opacity-90">
              Network with top professionals, enjoy great food, and celebrate your success!
            </p>
          </div>
          <div className="text-6xl">
            🎄
          </div>
        </div>
      </div>

      {/* Current User Stats (for tradesmen) */}
      {currentUser && userType === 'tradesman' && currentUserStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Your Week So Far</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatEarnings(currentUserStats.earnings)}</div>
              <p className="text-sm text-blue-700">Weekly Earnings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentUserStats.jobCount}</div>
              <p className="text-sm text-blue-700">Jobs Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentUserStats.rank ? `#${currentUserStats.rank}` : 'Top 25%'}
              </div>
              <p className="text-sm text-blue-700">Current Ranking</p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-blue-600 mb-3">Want to climb the leaderboard?</p>
            <button
              onClick={() => navigate('/manage-availability')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Your Availability →
            </button>
          </div>
        </div>
      )}

      {/* Top 5 Leaderboard */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">🏅 Weekly Leaderboard</h2>
          <div className="text-sm text-gray-500">
            Updated in real-time
          </div>
        </div>

        <div className="space-y-4">
          {topEarners.map((earner, index) => (
            <div 
              key={earner.tradesman_id}
              className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                earner.rank === 1 ? 'border-yellow-300 bg-yellow-50' :
                earner.rank === 2 ? 'border-gray-300 bg-gray-50' :
                earner.rank === 3 ? 'border-orange-300 bg-orange-50' :
                'border-gray-200 bg-white'
              }`}
            >
              {earner.rank === 1 && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  🏆 Invited
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`text-3xl font-bold ${
                    earner.rank === 1 ? 'text-yellow-600' :
                    earner.rank === 2 ? 'text-gray-600' :
                    earner.rank === 3 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {getRankEmoji(earner.rank)}
                  </div>
                  
                  {/* Profile Photo */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium border-2 border-gray-300">
                    {earner.tradesman_name.charAt(0)}
                  </div>
                  
                  {/* Tradesman Details */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {earner.tradesman_name.split(' ')[0]} {earner.tradesman_name.split(' ')[1]?.charAt(0)}.
                      </h3>
                      {earner.average_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex text-sm">{renderStars(earner.average_rating)}</div>
                          <span className="text-sm text-gray-600">({earner.average_rating})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{earner.trade_type}</span>
                      <span>📍 {earner.area_covered}</span>
                      <span>{earner.job_count} job{earner.job_count !== 1 ? 's' : ''} completed</span>
                    </div>
                  </div>
                </div>
                
                {/* Earnings */}
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    earner.rank === 1 ? 'text-yellow-600' :
                    earner.rank === 2 ? 'text-gray-600' :
                    earner.rank === 3 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {formatEarnings(earner.total_earnings)}
                  </div>
                  <p className="text-sm text-gray-500">This Week</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Habits Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-800 mb-4">💡 Success Habits of Top Earners</h3>
        <p className="text-green-700 text-sm mb-4">
          Common behaviors we've observed from our highest-earning tradespeople:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">⚡</span>
            <span className="text-green-800">Respond to quotes within 1 hour</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">📸</span>
            <span className="text-green-800">Upload 5+ high-quality profile photos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">⭐</span>
            <span className="text-green-800">Maintain 4.8★ average rating or higher</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">📅</span>
            <span className="text-green-800">Update availability regularly</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">💬</span>
            <span className="text-green-800">Communicate clearly with customers</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">🔧</span>
            <span className="text-green-800">Complete portfolio with work examples</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/quote-requests')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          📋 View Quote Requests
        </button>
        <button
          onClick={() => navigate('/tradesman-dashboard')}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          👤 Update Your Profile
        </button>
        <button
          onClick={() => navigate('/manage-availability')}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          📅 Manage Availability
        </button>
      </div>
    </div>
  );
};

export default TopEarners;

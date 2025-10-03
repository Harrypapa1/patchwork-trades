import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TopEarners = () => {
  const { currentUser, userType, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [topEarners, setTopEarners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });

  // 🔒 AUTHENTICATION CHECK - Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log('🚫 No authenticated user, redirecting to login...');
      navigate('/login');
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    // Don't set up listener until we know auth state
    if (authLoading) {
      console.log('⏳ Waiting for auth to initialize...');
      return;
    }

    if (!currentUser) {
      console.log('❌ No user found after auth loaded');
      return;
    }

    let unsubscribe = null;
    
    const setupRealTimeListener = () => {
      const weekRange = getCurrentWeekRange();
      setWeekRange(weekRange);

      console.log('🔴 Setting up real-time Top Earners listener...');

      // 🆕 NEW: Query completed_jobs collection instead of filtering active_jobs
      const completedJobsQuery = query(
        collection(db, 'completed_jobs'),
        where('completed_at', '>=', weekRange.start),
        where('completed_at', '<=', weekRange.end)
      );

      unsubscribe = onSnapshot(
        completedJobsQuery,
        async (snapshot) => {
          console.log('📊 Top Earners data updated - processing changes...');
          
          const completedJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('✅ Found completed jobs this week:', completedJobs.length);

          // Group jobs by tradesman and calculate earnings
          const tradesmanEarnings = {};

          completedJobs.forEach(job => {
            const tradesmanId = job.tradesman_id;
            if (!tradesmanEarnings[tradesmanId]) {
              tradesmanEarnings[tradesmanId] = {
                tradesman_id: tradesmanId,
                tradesman_name: job.tradesman_name,
                trade_type: job.tradesman_trade_type || job.trade_type || 'Tradesman',
                area: job.tradesman_area || job.area_covered || 'London',
                total_earnings: 0,
                job_count: 0,
                jobs: []
              };
            }

            const jobEarnings = parseFloat(job.final_price?.replace(/£|,/g, '') || '0');
            tradesmanEarnings[tradesmanId].total_earnings += jobEarnings;
            tradesmanEarnings[tradesmanId].job_count += 1;
            tradesmanEarnings[tradesmanId].jobs.push(job);
          });

          // Convert to array and sort by earnings
          const sortedEarners = Object.values(tradesmanEarnings)
            .sort((a, b) => b.total_earnings - a.total_earnings)
            .slice(0, 5); // Top 5

          console.log('💰 Top earners calculated:', sortedEarners.length);

          // Get additional profile data for top earners
          const enrichedEarners = await Promise.all(
            sortedEarners.map(async (earner, index) => {
              try {
                const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', earner.tradesman_id));
                const profileData = profileDoc.exists() ? profileDoc.data() : {};
                
                return {
                  ...earner,
                  rank: index + 1,
                  average_rating: profileData.average_rating || 0,
                  completed_jobs_total: profileData.completed_jobs_count || 0,
                  profile_photo: profileData.profilePhoto,
                  area_covered: profileData.areaCovered || earner.area
                };
              } catch (error) {
                console.warn(`Error fetching profile for ${earner.tradesman_id}:`, error);
                return {
                  ...earner,
                  rank: index + 1,
                  average_rating: 0,
                  completed_jobs_total: 0
                };
              }
            })
          );

          console.log('🚀 Real-time Top Earners updated!');
          setTopEarners(enrichedEarners);
          setLoading(false);

          // Update current user stats if they're a tradesman
          if (currentUser && userType === 'tradesman') {
            updateCurrentUserStats(enrichedEarners, completedJobs);
          }
        },
        (error) => {
          console.error('Error in real-time Top Earners listener:', error);
          setLoading(false);
        }
      );
    };

    setupRealTimeListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up Top Earners real-time listener');
        unsubscribe();
      }
    };
  }, [currentUser, userType, authLoading]);

  const getCurrentWeekRange = () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6)); // Saturday
    
    return {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString(),
      displayStart: startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
      displayEnd: endOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    };
  };

  const updateCurrentUserStats = (earners, allJobs) => {
    if (!currentUser || userType !== 'tradesman') return;

    // Find current user's jobs
    const userJobs = allJobs.filter(job => job.tradesman_id === currentUser.uid);
    
    const totalEarnings = userJobs.reduce((sum, job) => {
      const jobEarnings = parseFloat(job.final_price?.replace(/£|,/g, '') || '0');
      return sum + jobEarnings;
    }, 0);

    // Calculate user's rank
    const userRank = earners.findIndex(earner => earner.tradesman_id === currentUser.uid) + 1;
    
    setCurrentUserStats({
      earnings: totalEarnings,
      jobCount: userJobs.length,
      rank: userRank || null
    });
  };

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

  // Show loading while auth is initializing
  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading real-time top earners...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header with Real-time Indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">🏆 Top Earners</h1>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 font-medium">Live</span>
          </div>
        </div>
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

        {topEarners.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">💰</div>
            <h3 className="text-lg font-medium text-gray-600 mb-1">No Completed Jobs This Week</h3>
            <p className="text-gray-500 text-sm">
              Be the first to complete a job and claim the top spot!
            </p>
          </div>
        ) : (
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
                    {earner.profile_photo ? (
                      <img 
                        src={earner.profile_photo} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium border-2 border-gray-300">
                        {earner.tradesman_name.charAt(0)}
                      </div>
                    )}
                    
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
                        <span className="font-medium text-blue-600">{earner.trade_type}</span>
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
        )}
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
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:purple-700 transition-colors font-medium"
        >
          📅 Manage Availability
        </button>
      </div>
    </div>
  );
};

export default TopEarners;

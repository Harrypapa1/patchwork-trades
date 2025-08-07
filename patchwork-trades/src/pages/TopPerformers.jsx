import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';

// Mock hooks for demo
const useAuth = () => ({
  currentUser: { uid: 'demo-customer-123' },
  userType: 'customer'
});

const useNavigate = () => (path) => console.log(`Navigate to: ${path}`);

const db = {};

const TopPerformers = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekRange, setWeekRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchTopPerformers();
  }, [currentUser, userType]);

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

  const fetchTopPerformers = async () => {
    try {
      const weekRange = getCurrentWeekRange();
      setWeekRange(weekRange);

      // Get all completed jobs from this week
      const jobsQuery = query(
        collection(db, 'active_jobs'),
        where('status', '==', 'completed'),
        where('completed_at', '>=', weekRange.start),
        where('completed_at', '<=', weekRange.end)
      );

      const jobsSnapshot = await getDocs(jobsQuery);
      const completedJobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Group jobs by tradesman and calculate performance metrics
      const tradesmanMetrics = {};

      completedJobs.forEach(job => {
        const tradesmanId = job.tradesman_id;
        if (!tradesmanMetrics[tradesmanId]) {
          tradesmanMetrics[tradesmanId] = {
            tradesman_id: tradesmanId,
            tradesman_name: job.tradesman_name,
            trade_type: job.tradesman_trade_type || 'Tradesman',
            area: job.tradesman_area || 'London',
            total_earnings: 0,
            job_count: 0,
            jobs: []
          };
        }

        const jobEarnings = parseFloat(job.final_price?.replace(/£|,/g, '') || job.customer_counter_quote?.replace(/£|,/g, '') || '0');
        tradesmanMetrics[tradesmanId].total_earnings += jobEarnings;
        tradesmanMetrics[tradesmanId].job_count += 1;
        tradesmanMetrics[tradesmanId].jobs.push(job);
      });

      // Convert to array and sort by a combination of jobs completed and quality metrics
      const sortedPerformers = Object.values(tradesmanMetrics)
        .sort((a, b) => {
          // Sort primarily by job count, then by total value
          if (b.job_count !== a.job_count) {
            return b.job_count - a.job_count;
          }
          return b.total_earnings - a.total_earnings;
        })
        .slice(0, 5); // Top 5

      // Get additional profile data for top performers
      const enrichedPerformers = await Promise.all(
        sortedPerformers.map(async (performer, index) => {
          try {
            const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', performer.tradesman_id));
            const profileData = profileDoc.exists() ? profileDoc.data() : {};
            
            return {
              ...performer,
              rank: index + 1,
              average_rating: profileData.average_rating || 0,
              total_jobs_completed: profileData.completed_jobs_count || 0,
              profile_photo: profileData.profilePhoto,
              area_covered: profileData.areaCovered || performer.area,
              years_experience: profileData.yearsExperience || 0,
              reviews_count: profileData.reviews?.length || 0
            };
          } catch (error) {
            console.warn(`Error fetching profile for ${performer.tradesman_id}:`, error);
            return {
              ...performer,
              rank: index + 1,
              average_rating: 0,
              total_jobs_completed: 0,
              years_experience: 0,
              reviews_count: 0
            };
          }
        })
      );

      setTopPerformers(enrichedPerformers);
    } catch (error) {
      console.error('Error fetching top performers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
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

  const getPerformanceBadge = (performer) => {
    if (performer.average_rating >= 4.8 && performer.job_count >= 5) {
      return { text: 'Elite Performer', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    } else if (performer.average_rating >= 4.5 && performer.job_count >= 3) {
      return { text: 'Top Quality', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (performer.job_count >= 5) {
      return { text: 'Most Active', color: 'bg-green-100 text-green-800 border-green-200' };
    } else {
      return { text: 'Rising Star', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading top performers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⭐ Top Performers</h1>
        <p className="text-gray-600">
          Our most reliable and highest-rated tradespeople this week ({weekRange.displayStart} - {weekRange.displayEnd})
        </p>
      </div>

      {/* Quality Promise Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-lg shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">✅ Quality Guaranteed</h2>
            <p className="text-lg">
              These tradespeople have proven themselves with <strong>exceptional work quality and customer service</strong>
            </p>
            <p className="text-sm mt-2 opacity-90">
              All jobs come with our satisfaction guarantee and customer protection
            </p>
          </div>
          <div className="text-6xl">
            🛡️
          </div>
        </div>
      </div>

      {/* Top 5 Performers */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">🏅 This Week's Top Performers</h2>
          <div className="text-sm text-gray-500">
            Based on jobs completed & customer satisfaction
          </div>
        </div>

        {topPerformers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <h3 className="text-lg font-medium text-gray-600 mb-1">No Completed Jobs This Week</h3>
            <p className="text-gray-500 text-sm">
              Check back soon to see our top-performing tradespeople.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {topPerformers.map((performer, index) => {
              const badge = getPerformanceBadge(performer);
              return (
                <div 
                  key={performer.tradesman_id}
                  className={`relative p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                    performer.rank === 1 ? 'border-yellow-300 bg-yellow-50' :
                    performer.rank === 2 ? 'border-gray-300 bg-gray-50' :
                    performer.rank === 3 ? 'border-orange-300 bg-orange-50' :
                    'border-gray-200 bg-white'
                  }`}
                  onClick={() => navigate(`/tradesman/${performer.tradesman_id}`)}
                >
                  {performer.rank === 1 && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ⭐ Featured
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`text-3xl font-bold ${
                        performer.rank === 1 ? 'text-yellow-600' :
                        performer.rank === 2 ? 'text-gray-600' :
                        performer.rank === 3 ? 'text-orange-600' :
                        'text-gray-500'
                      }`}>
                        {getRankEmoji(performer.rank)}
                      </div>
                      
                      {/* Profile Photo */}
                      {performer.profile_photo ? (
                        <img 
                          src={performer.profile_photo} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-300"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-medium border-2 border-gray-300">
                          {performer.tradesman_name.charAt(0)}
                        </div>
                      )}
                      
                      {/* Tradesman Details */}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-xl">
                            {performer.tradesman_name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-1">
                          {performer.average_rating > 0 && (
                            <>
                              <div className="flex text-lg">{renderStars(performer.average_rating)}</div>
                              <span className="font-medium text-gray-900">({performer.average_rating})</span>
                              <span className="text-sm text-gray-500">• {performer.reviews_count} reviews</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-medium text-blue-600">{performer.trade_type}</span>
                          <span>📍 {performer.area_covered}</span>
                          {performer.years_experience > 0 && (
                            <span>🔧 {performer.years_experience} years exp</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Performance Stats */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {performer.job_count} jobs
                      </div>
                      <p className="text-sm text-gray-500 mb-2">This Week</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/booking-request/${performer.tradesman_id}`);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Why These Matter Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-green-800 mb-4">🎯 What Makes These Tradespeople Stand Out</h3>
        <p className="text-green-700 text-sm mb-4">
          Our top performers consistently demonstrate these key qualities:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">⭐</span>
            <span className="text-green-800">Consistently high customer ratings (4.5+ stars)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">⚡</span>
            <span className="text-green-800">Quick response times to customer requests</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">✅</span>
            <span className="text-green-800">High job completion rates</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">🛠️</span>
            <span className="text-green-800">Professional work quality and attention to detail</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">💬</span>
            <span className="text-green-800">Clear communication throughout the job</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 text-xl">🕐</span>
            <span className="text-green-800">Reliable and punctual service</span>
          </div>
        </div>
      </div>

      {/* Customer Benefits Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">🛡️ Your Protection When Booking</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">💳</div>
            <h4 className="font-semibold text-blue-800 mb-1">Secure Payments</h4>
            <p className="text-blue-700 text-sm">Your payment is protected until job completion</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📋</div>
            <h4 className="font-semibold text-blue-800 mb-1">Quality Guarantee</h4>
            <p className="text-blue-700 text-sm">All work comes with our satisfaction guarantee</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🆘</div>
            <h4 className="font-semibold text-blue-800 mb-1">24/7 Support</h4>
            <p className="text-blue-700 text-sm">Get help whenever you need it</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/browse')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          🔍 Browse All Tradespeople
        </button>
        <button
          onClick={() => navigate('/customer-dashboard')}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          📋 View Your Jobs
        </button>
      </div>
    </div>
  );
};

export default TopPerformers;

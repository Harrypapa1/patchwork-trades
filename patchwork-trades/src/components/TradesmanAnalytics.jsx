import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTopViewedTradesmen } from '../utils/profileViewTracker';
import { getTopReferrers } from '../utils/referralTracker';

const AdminAnalytics = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('traffic');
  
  // Traffic Stats
  const [trafficStats, setTrafficStats] = useState({
    totalPageViews: 0,
    uniqueVisitors: 0,
    thisMonthViews: 0,
    todayViews: 0,
    pageViewsByPage: [],
    viewsByDay: []
  });

  // Profile View Stats
  const [profileViewStats, setProfileViewStats] = useState([]);
  
  // Referral Stats
  const [referralStats, setReferralStats] = useState([]);

  // Password-based admin access
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const ADMIN_PASSWORD = 'FruitsOfTheDark2025';

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordError('');
      sessionStorage.setItem('admin_authenticated', 'true');
    } else {
      setPasswordError('Incorrect password. Access denied.');
      setPasswordInput('');
    }
  };

  // Check for existing admin session
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('admin_authenticated');
    if (isAuthenticated === 'true') {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
    }
  }, []);

  // Fetch Traffic Stats
  useEffect(() => {
    if (!isAdmin) return;

    const fetchTrafficStats = async () => {
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const today = now.toISOString().split('T')[0];

        const allViewsQuery = query(collection(db, 'page_views'));
        const allViewsSnapshot = await getDocs(allViewsQuery);
        const allViews = allViewsSnapshot.docs.map(doc => doc.data());

        const totalPageViews = allViews.length;
        const uniqueVisitorIds = new Set(allViews.map(view => view.visitor_id));
        const uniqueVisitors = uniqueVisitorIds.size;
        const thisMonthViews = allViews.filter(view => 
          view.year === currentYear && view.month === currentMonth
        ).length;
        const todayViews = allViews.filter(view => view.date === today).length;

        const pageViewCounts = {};
        allViews.forEach(view => {
          const page = view.page_path || 'unknown';
          pageViewCounts[page] = (pageViewCounts[page] || 0) + 1;
        });
        const pageViewsByPage = Object.entries(pageViewCounts)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const viewCount = allViews.filter(view => view.date === dateStr).length;
          last30Days.push({
            date: dateStr,
            views: viewCount,
            displayDate: date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          });
        }

        setTrafficStats({
          totalPageViews,
          uniqueVisitors,
          thisMonthViews,
          todayViews,
          pageViewsByPage,
          viewsByDay: last30Days
        });

      } catch (error) {
        console.error('Error fetching traffic stats:', error);
      }
    };

    fetchTrafficStats();
    const interval = setInterval(fetchTrafficStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fetch Profile View Stats
  useEffect(() => {
    if (!isAdmin) return;

    const fetchProfileViews = async () => {
      try {
        const topViewed = await getTopViewedTradesmen(20);
        setProfileViewStats(topViewed);
      } catch (error) {
        console.error('Error fetching profile views:', error);
      }
    };

    fetchProfileViews();
    const interval = setInterval(fetchProfileViews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fetch Referral Stats
  useEffect(() => {
    if (!isAdmin) return;

    const fetchReferrals = async () => {
      try {
        const topReferrers = await getTopReferrers(20);
        setReferralStats(topReferrers);
      } catch (error) {
        console.error('Error fetching referrals:', error);
      }
    };

    fetchReferrals();
    const interval = setInterval(fetchReferrals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
            <p className="text-gray-600">Enter the admin password to continue</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin password"
                required
              />
            </div>
            
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{passwordError}</p>
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Access Analytics
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Unauthorized access is prohibited
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">Authentication failed. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Traffic, profile views, and referral analytics</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Operations
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_authenticated');
                setIsAdmin(false);
                setShowPasswordPrompt(true);
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              🔓 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
        {[
          { id: 'traffic', label: '📊 Traffic' },
          { id: 'profileViews', label: '👁️ Profile Views' },
          { id: 'referrals', label: '🔗 Referrals' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeView === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Traffic Tab */}
      {activeView === 'traffic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-blue-600 mr-4">👁️</div>
                <div>
                  <p className="text-gray-600 text-sm">Total Page Views</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trafficStats.totalPageViews.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-green-600 mr-4">👥</div>
                <div>
                  <p className="text-gray-600 text-sm">Unique Visitors</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trafficStats.uniqueVisitors.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-purple-600 mr-4">📅</div>
                <div>
                  <p className="text-gray-600 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trafficStats.thisMonthViews.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-orange-600 mr-4">🔥</div>
                <div>
                  <p className="text-gray-600 text-sm">Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {trafficStats.todayViews.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Pages</h3>
                <p className="text-gray-600 text-sm">Most visited pages on your site</p>
              </div>
              <div className="p-6">
                {trafficStats.pageViewsByPage.length > 0 ? (
                  <div className="space-y-3">
                    {trafficStats.pageViewsByPage.map((page, index) => (
                      <div key={page.page} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="text-lg font-bold text-gray-400 mr-3">#{index + 1}</span>
                          <div>
                            <p className="font-medium text-gray-900">{page.page}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{page.count.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No page view data yet</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Last 30 Days</h3>
                <p className="text-gray-600 text-sm">Daily page views trend</p>
              </div>
              <div className="p-6">
                {trafficStats.viewsByDay.length > 0 ? (
                  <div className="space-y-2">
                    {trafficStats.viewsByDay.map((day) => {
                      const maxViews = Math.max(...trafficStats.viewsByDay.map(d => d.views));
                      const barWidth = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                      
                      return (
                        <div key={day.date} className="flex items-center gap-3">
                          <div className="text-xs text-gray-600 w-16 flex-shrink-0">
                            {day.displayDate}
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full flex items-center justify-end pr-2"
                              style={{ width: `${Math.max(barWidth, 2)}%` }}
                            >
                              {day.views > 0 && (
                                <span className="text-xs text-white font-medium">{day.views}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No data yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Views Tab */}
      {activeView === 'profileViews' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Viewed Tradesmen</h3>
              <p className="text-gray-600 text-sm">Tradesmen profiles with the most views</p>
            </div>
            <div className="p-6">
              {profileViewStats.length > 0 ? (
                <div className="space-y-3">
                  {profileViewStats.map((tradesman, index) => (
                    <div key={tradesman.tradesman_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{tradesman.tradesman_name}</p>
                          <p className="text-sm text-gray-600">ID: {tradesman.tradesman_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{tradesman.total_views.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">total views</p>
                        <p className="text-sm text-green-600 font-medium mt-1">
                          {tradesman.this_month_views} this month
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl text-gray-300 mb-4">👁️</div>
                  <p className="text-gray-500">No profile views yet</p>
                  <p className="text-sm text-gray-400">Profile view data will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Referrals Tab */}
      {activeView === 'referrals' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Top Referrers</h3>
              <p className="text-gray-600 text-sm">Users who've referred the most people</p>
            </div>
            <div className="p-6">
              {referralStats.length > 0 ? (
                <div className="space-y-3">
                  {referralStats.map((referrer, index) => (
                    <div key={referrer.referrer_id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-green-600">#{index + 1}</span>
                          <div>
                            <p className="font-semibold text-gray-900">{referrer.referrer_name}</p>
                            <p className="text-sm text-gray-600">{referrer.referrer_email}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              referrer.referrer_type === 'tradesman' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {referrer.referrer_type}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600">{referrer.total_referrals}</p>
                          <p className="text-xs text-gray-500">total referrals</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-green-200">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{referrer.this_month_referrals}</p>
                          <p className="text-xs text-gray-600">This Month</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-purple-600">{referrer.customer_referrals}</p>
                          <p className="text-xs text-gray-600">Customers</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-orange-600">{referrer.tradesman_referrals}</p>
                          <p className="text-xs text-gray-600">Tradesmen</p>
                        </div>
                      </div>
                      
                      {referrer.total_value > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-sm text-gray-600">Revenue Generated: 
                            <span className="font-bold text-green-600 ml-2">{formatCurrency(referrer.total_value)}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl text-gray-300 mb-4">🔗</div>
                  <p className="text-gray-500">No referrals yet</p>
                  <p className="text-sm text-gray-400">Referral data will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalJobs: 0,
    activeUsers: 0,
    completionRate: 0
  });
  
  // Real-time data
  const [liveActivity, setLiveActivity] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tradesmen, setTradesmen] = useState([]);
  const [disputedJobs, setDisputedJobs] = useState([]);
  const [dismissedQuotes, setDismissedQuotes] = useState([]);
  
  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [tradesmanSearch, setTradesmanSearch] = useState('');

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

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribes = [];

    // 1. Live Activity Feed
    const activityQuery = query(
      collection(db, 'user_activity'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const activityUnsubscribe = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLiveActivity(activities);
    });
    unsubscribes.push(activityUnsubscribe);

    // 2. Active Bookings
    const bookingsQuery = query(
      collection(db, 'booking_sessions'),
      where('status', 'in', ['started', 'in_progress', 'photos_uploaded', 'details_completed']),
      orderBy('started_at', 'desc')
    );
    
    const bookingsUnsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveBookings(bookings);
    });
    unsubscribes.push(bookingsUnsubscribe);

    // 3. Recent Jobs
    const jobsQuery = query(
      collection(db, 'active_jobs'),
      orderBy('created_at', 'desc'),
      limit(20)
    );
    
    const jobsUnsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentJobs(jobs);
      
      const totalRevenue = jobs.reduce((sum, job) => sum + (job.platform_fee || 0), 0);
      const thisMonth = jobs.filter(job => {
        const jobDate = new Date(job.created_at);
        const now = new Date();
        return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
      });
      const monthlyRevenue = thisMonth.reduce((sum, job) => sum + (job.platform_fee || 0), 0);
      
      setStats(prev => ({
        ...prev,
        totalRevenue,
        monthlyRevenue,
        totalJobs: jobs.length
      }));
    });
    unsubscribes.push(jobsUnsubscribe);

    // 4. Users - Fetch both collections separately
    const fetchAllUsers = async () => {
      try {
        // Get customers
        const customersSnapshot = await getDocs(collection(db, 'users'));
        const customersData = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Get tradesmen
        const tradesmenSnapshot = await getDocs(collection(db, 'tradesmen_profiles'));
        const tradesmenData = tradesmenSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCustomers(customersData);
        setTradesmen(tradesmenData);
        setStats(prev => ({ 
          ...prev, 
          activeUsers: customersData.length + tradesmenData.length 
        }));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    
    // Initial fetch
    fetchAllUsers();
    
    // Set up real-time listeners for both collections
    const customersUnsubscribe = onSnapshot(collection(db, 'users'), () => {
      fetchAllUsers();
    });
    const tradesmenUnsubscribe = onSnapshot(collection(db, 'tradesmen_profiles'), () => {
      fetchAllUsers();
    });
    
    unsubscribes.push(customersUnsubscribe, tradesmenUnsubscribe);

    // 5. Disputes
    const disputesQuery = query(
      collection(db, 'active_jobs'),
      where('status', '==', 'disputed')
    );
    
    const disputesUnsubscribe = onSnapshot(disputesQuery, (snapshot) => {
      const disputes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDisputedJobs(disputes);
    });
    unsubscribes.push(disputesUnsubscribe);

    // 6. Dismissed Quotes
    const dismissedQuery = query(
      collection(db, 'quote_requests'),
      where('status', 'in', ['dismissed_by_customer', 'rejected'])
    );
    
    const dismissedUnsubscribe = onSnapshot(dismissedQuery, (snapshot) => {
      const dismissed = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDismissedQuotes(dismissed);
    });
    unsubscribes.push(dismissedUnsubscribe);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [isAdmin]);

  const suspendUser = async (userId, userType) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      const collectionName = userType === 'tradesman' ? 'tradesmen_profiles' : 'users';
      await updateDoc(doc(db, collectionName, userId), {
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        suspended_by: 'admin'
      });
    }
  };
  
  const unsuspendUser = async (userId, userType) => {
    if (window.confirm('Are you sure you want to unsuspend this user?')) {
      const collectionName = userType === 'tradesman' ? 'tradesmen_profiles' : 'users';
      await updateDoc(doc(db, collectionName, userId), {
        status: 'active',
        unsuspended_at: new Date().toISOString(),
        unsuspended_by: 'admin'
      });
    }
  };
  
  // Filter functions
  const filteredCustomers = customers.filter(customer => {
    const searchLower = customerSearch.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.id?.toLowerCase().includes(searchLower)
    );
  });
  
  const filteredTradesmen = tradesmen.filter(tradesman => {
    const searchLower = tradesmanSearch.toLowerCase();
    return (
      tradesman.name?.toLowerCase().includes(searchLower) ||
      tradesman.email?.toLowerCase().includes(searchLower) ||
      tradesman.areaCovered?.toLowerCase().includes(searchLower) ||
      tradesman.business_type?.toLowerCase().includes(searchLower) ||
      tradesman.certifications?.toLowerCase().includes(searchLower) ||
      tradesman.id?.toLowerCase().includes(searchLower)
    );
  });

  const resolveDispute = async (jobId, resolution) => {
    await updateDoc(doc(db, 'active_jobs', jobId), {
      status: resolution === 'customer' ? 'refunded' : 'completed',
      dispute_resolved_at: new Date().toISOString(),
      dispute_resolution: resolution,
      resolved_by: currentUser.uid
    });
  };

  const restoreDismissedQuote = async (quoteId) => {
    if (window.confirm('Restore this dismissed quote? It will become active again for both parties.')) {
      await updateDoc(doc(db, 'quote_requests', quoteId), {
        status: 'pending',
        dismissed_by_customer: false,
        dismissed_by_tradesman: false,
        restored_by_admin: true,
        restored_at: new Date().toISOString(),
        restored_by: currentUser.uid,
        updated_at: new Date().toISOString()
      });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
              Access Dashboard
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Platform operations and management</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/admin-analytics"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              📊 View Analytics
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
          { id: 'overview', label: 'Overview' },
          { id: 'live', label: '🔴 Live Activity' },
          { id: 'jobs', label: 'Jobs' },
          { id: 'customers', label: 'Customers' },
          { id: 'tradesmen', label: 'Tradesmen' },
          { id: 'disputes', label: 'Disputes' },
          { id: 'dismissed', label: '🗑️ Dismissed Quotes' }
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

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-green-600 mr-4">💰</div>
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-blue-600 mr-4">📈</div>
                <div>
                  <p className="text-gray-600 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-purple-600 mr-4">🛠️</div>
                <div>
                  <p className="text-gray-600 text-sm">Total Jobs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="text-3xl text-orange-600 mr-4">👥</div>
                <div>
                  <p className="text-gray-600 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Bookings in Progress */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Active Booking Sessions</h3>
                <p className="text-gray-600 text-sm">Users currently creating jobs</p>
              </div>
              <div className="p-6">
                {activeBookings.length > 0 ? (
                  <div className="space-y-3">
                    {activeBookings.slice(0, 5).map(booking => (
                      <div key={booking.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium">{booking.customer_name || 'Customer'}</p>
                          <p className="text-sm text-gray-600">{booking.job_category} • Step: {booking.current_step}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-600 font-medium">{booking.status}</p>
                          <p className="text-xs text-gray-500">{formatTime(booking.last_activity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No active booking sessions</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-gray-600 text-sm">Latest platform actions</p>
              </div>
              <div className="p-6">
                {liveActivity.length > 0 ? (
                  <div className="space-y-3">
                    {liveActivity.slice(0, 5).map(activity => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          activity.type === 'job_completed' ? 'bg-green-500' :
                          activity.type === 'payment_received' ? 'bg-blue-500' :
                          activity.type === 'user_registered' ? 'bg-purple-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Activity Tab */}
      {activeView === 'live' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">🔴 Live Activity Feed</h3>
                <p className="text-gray-600 text-sm">Real-time user activity and job creation tracking</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {liveActivity.map(activity => (
                <div key={activity.id} className={`p-4 rounded-lg border-l-4 ${
                  activity.type === 'booking_started' ? 'bg-blue-50 border-blue-500' :
                  activity.type === 'booking_abandoned' ? 'bg-red-50 border-red-500' :
                  activity.type === 'payment_completed' ? 'bg-green-50 border-green-500' :
                  activity.type === 'photos_uploaded' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-gray-50 border-gray-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span>User: {activity.user_name || activity.user_id}</span>
                        {activity.job_category && <span>Category: {activity.job_category}</span>}
                        {activity.amount && <span>Amount: {formatCurrency(activity.amount)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatTime(activity.timestamp)}</p>
                      {activity.session_duration && (
                        <p className="text-xs text-gray-500">Duration: {activity.session_duration}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {liveActivity.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">📊</div>
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400">Activity will appear here in real-time</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {activeView === 'jobs' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
            <p className="text-gray-600 text-sm">All platform jobs and their status</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tradesman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{job.job_title}</p>
                        <p className="text-sm text-gray-600">{job.job_category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{job.customer_name}</p>
                      <p className="text-sm text-gray-600">{job.customer_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{job.tradesman_name}</p>
                      <p className="text-sm text-gray-600">{job.tradesman_email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{formatCurrency(job.agreed_price)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-green-600">{formatCurrency(job.platform_fee)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(job.created_at).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeView === 'customers' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customer Management</h3>
                <p className="text-gray-600 text-sm">Manage customer accounts ({customers.length} total)</p>
              </div>
              <div className="w-96">
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs Posted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                        <p className="text-xs text-gray-400 mt-1">ID: {customer.id.substring(0, 12)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.total_jobs || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {formatCurrency(customer.total_spent || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        customer.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {customer.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {customer.status === 'suspended' ? (
                        <button
                          onClick={() => unsuspendUser(customer.id, 'customer')}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => suspendUser(customer.id, 'customer')}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">👤</div>
                <p className="text-gray-500">
                  {customerSearch ? 'No customers found matching your search' : 'No customers yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tradesmen Tab */}
      {activeView === 'tradesmen' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Tradesman Management</h3>
                <p className="text-gray-600 text-sm">Manage tradesman accounts ({tradesmen.length} total)</p>
              </div>
              <div className="w-96">
                <input
                  type="text"
                  placeholder="Search by name, location, job type, certifications..."
                  value={tradesmanSearch}
                  onChange={(e) => setTradesmanSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tradesman</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jobs Done</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTradesmen.map(tradesman => (
                  <tr key={tradesman.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{tradesman.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{tradesman.email}</p>
                        {tradesman.certifications && (
                          <p className="text-xs text-blue-600 mt-1">🏅 {tradesman.certifications}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {tradesman.business_type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tradesman.areaCovered || 'Not specified'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">⭐</span>
                        <span className="text-sm font-medium">{tradesman.average_rating || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tradesman.completed_jobs_count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {tradesman.hourlyRate ? `£${tradesman.hourlyRate}/hr` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tradesman.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        tradesman.payment_enabled ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tradesman.status === 'suspended' ? 'suspended' :
                         tradesman.payment_enabled ? 'active' : 'pending setup'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tradesman.status === 'suspended' ? (
                        <button
                          onClick={() => unsuspendUser(tradesman.id, 'tradesman')}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          onClick={() => suspendUser(tradesman.id, 'tradesman')}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredTradesmen.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">🔨</div>
                <p className="text-gray-500">
                  {tradesmanSearch ? 'No tradesmen found matching your search' : 'No tradesmen yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {activeView === 'disputes' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Job Disputes</h3>
            <p className="text-gray-600 text-sm">Resolve conflicts between customers and tradesmen</p>
          </div>
          
          <div className="p-6">
            {disputedJobs.length > 0 ? (
              <div className="space-y-6">
                {disputedJobs.map(dispute => (
                  <div key={dispute.id} className="border border-red-200 rounded-lg p-6 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">{dispute.job_title}</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Customer: {dispute.customer_name}</p>
                            <p className="text-sm text-gray-600">Tradesman: {dispute.tradesman_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Amount: {formatCurrency(dispute.agreed_price)}</p>
                            <p className="text-sm text-gray-600">Date: {new Date(dispute.created_at).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                        {dispute.dispute_reason && (
                          <div className="bg-white p-3 rounded border">
                            <p className="text-sm font-medium text-gray-900 mb-1">Dispute Reason:</p>
                            <p className="text-sm text-gray-700">{dispute.dispute_reason}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-6 space-y-2">
                        <button
                          onClick={() => resolveDispute(dispute.id, 'customer')}
                          className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                        >
                          Refund Customer
                        </button>
                        <button
                          onClick={() => resolveDispute(dispute.id, 'tradesman')}
                          className="block w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
                        >
                          Pay Tradesman
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">✅</div>
                <p className="text-gray-500">No active disputes</p>
                <p className="text-sm text-gray-400">All jobs are running smoothly</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dismissed Quotes Tab */}
      {activeView === 'dismissed' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Dismissed Quote Requests</h3>
            <p className="text-gray-600 text-sm">Track quotes that were dismissed by customers or rejected by tradesmen</p>
          </div>
          
          <div className="p-6">
            {dismissedQuotes.length > 0 ? (
              <div className="space-y-6">
                {dismissedQuotes.map(quote => (
                  <div key={quote.id} className={`border rounded-lg p-6 ${
                    quote.status === 'dismissed_by_customer' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{quote.job_title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            quote.status === 'dismissed_by_customer' 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {quote.status === 'dismissed_by_customer' ? 'Customer Dismissed' : 'Tradesman Rejected'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Customer: {quote.customer_name}</p>
                            <p className="text-sm text-gray-600">Email: {quote.customer_email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tradesman: {quote.tradesman_name}</p>
                            <p className="text-sm text-gray-600">Email: {quote.tradesman_email}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Submitted:</p>
                            <p className="text-sm font-medium">{new Date(quote.created_at).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dismissed/Rejected:</p>
                            <p className="text-sm font-medium">{new Date(quote.dismissed_at || quote.rejected_at).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Budget Expected:</p>
                            <p className="text-sm font-medium">{quote.budget_expectation || 'Not specified'}</p>
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm font-medium text-gray-900 mb-1">Job Description:</p>
                          <p className="text-sm text-gray-700">{quote.job_description}</p>
                        </div>
                        
                        {quote.additional_notes && (
                          <div className="bg-white p-3 rounded border mt-2">
                            <p className="text-sm font-medium text-gray-900 mb-1">Additional Notes:</p>
                            <p className="text-sm text-gray-700">{quote.additional_notes}</p>
                          </div>
                        )}
                        
                        {quote.status === 'dismissed_by_customer' && (
                          <div className="bg-orange-100 p-3 rounded border border-orange-200 mt-2">
                            <p className="text-sm font-medium text-orange-900 mb-1">Customer Dismissal Details:</p>
                            <p className="text-sm text-orange-800 mb-2">
                              Customer dismissed this quote request. It was removed from both customer and tradesman views.
                            </p>
                            {quote.dismissal_reason && (
                              <div className="bg-orange-50 p-2 rounded border border-orange-300">
                                <p className="text-sm font-medium text-orange-900">Reason provided:</p>
                                <p className="text-sm text-orange-800 italic">"{quote.dismissal_reason}"</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {quote.status === 'rejected' && (
                          <div className="bg-red-100 p-3 rounded border border-red-200 mt-2">
                            <p className="text-sm font-medium text-red-900 mb-1">Rejection Details:</p>
                            <p className="text-sm text-red-800">
                              Tradesman rejected this quote request and customer was notified.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Admin Actions */}
                      <div className="ml-6 space-y-2">
                        <button
                          onClick={() => restoreDismissedQuote(quote.id)}
                          className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                        >
                          Restore Quote
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Permanently delete this quote? This action cannot be undone.')) {
                              deleteDoc(doc(db, 'quote_requests', quote.id));
                            }
                          }}
                          className="block w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl text-gray-300 mb-4">📝</div>
                <p className="text-gray-500">No dismissed quote requests</p>
                <p className="text-sm text-gray-400">Dismissed and rejected quotes will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

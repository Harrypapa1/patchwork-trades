import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Mail, Eye, TrendingUp, Clock, MapPin, ExternalLink, MessageSquare, Award, Briefcase } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';

const TradesmanAnalytics = () => {
  const { tradesmanId } = useParams();
  const [tradesmanData, setTradesmanData] = useState(null);
  const [profileViews, setProfileViews] = useState([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    uniqueVisitors: 0,
    lastViewed: null
  });
  const [trafficSources, setTrafficSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tradesmanId) {
      loadAnalytics();
    }
  }, [tradesmanId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // 1. Get tradesman profile data
      const profileDoc = await getDoc(doc(db, 'tradesmen_profiles', tradesmanId));
      if (profileDoc.exists()) {
        setTradesmanData(profileDoc.data());
      }

      // 2. Get profile views for this tradesman
      const viewsQuery = query(
        collection(db, 'profile_views'),
        where('tradesman_id', '==', tradesmanId),
        orderBy('timestamp', 'desc')
      );
      const viewsSnapshot = await getDocs(viewsQuery);
      
      const viewsData = [];
      const uniqueVisitors = new Set();
      let lastViewTime = null;

      viewsSnapshot.forEach((doc) => {
        const data = doc.data();
        viewsData.push(data);
        if (data.viewer_id) {
          uniqueVisitors.add(data.viewer_id);
        }
        if (!lastViewTime && data.timestamp) {
          lastViewTime = data.timestamp;
        }
      });

      // 3. Process views by date (last 7 days)
      const viewsByDate = processViewsByDate(viewsData);
      setProfileViews(viewsByDate);

      // 4. Calculate traffic sources
      const sources = processTrafficSources(viewsData);
      setTrafficSources(sources);

      // 5. Set stats
      setStats({
        totalViews: viewsData.length,
        uniqueVisitors: uniqueVisitors.size,
        lastViewed: lastViewTime ? formatTimeAgo(lastViewTime) : 'No views yet'
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processViewsByDate = (viewsData) => {
    const last7Days = [];
    const today = new Date();
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayViews = viewsData.filter(view => {
        const viewDate = new Date(view.timestamp).toISOString().split('T')[0];
        return viewDate === dateStr;
      });

      const uniqueViewersForDay = new Set(
        dayViews.map(v => v.viewer_id).filter(Boolean)
      );

      last7Days.push({
        date: dateStr,
        views: dayViews.length,
        uniqueVisitors: uniqueViewersForDay.size
      });
    }
    
    return last7Days;
  };

  const processTrafficSources = (viewsData) => {
    const sources = {};
    
    viewsData.forEach(view => {
      const source = view.referrer || 'direct';
      const sourceName = source === 'direct' ? 'Direct' : 
                        source.includes('google') ? 'Google Search' :
                        source.includes('facebook') || source.includes('instagram') ? 'Social Media' :
                        'Referral';
      
      sources[sourceName] = (sources[sourceName] || 0) + 1;
    });

    return Object.entries(sources).map(([name, value]) => ({
      name,
      value
    }));
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!tradesmanData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Tradesman not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics for {tradesmanData.name}
          </h1>
          <p className="text-gray-600 mt-1">
            {tradesmanData.business_type} • {tradesmanData.areaCovered}
          </p>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Tradesman Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <a href={`mailto:${tradesmanData.email}`} className="text-blue-600 hover:underline">
                  {tradesmanData.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Area Covered</p>
                <p className="text-gray-900">{tradesmanData.areaCovered}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-gray-900">{tradesmanData.average_rating} ⭐ ({tradesmanData.completed_jobs_count} jobs)</p>
              </div>
            </div>
          </div>

          {tradesmanData.bio && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Bio</p>
              <p className="text-gray-900">{tradesmanData.bio}</p>
            </div>
          )}
          
          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <MessageSquare className="w-4 h-4" />
              Send Message
            </button>
            <a 
              href={`/tradesman/${tradesmanData.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <ExternalLink className="w-4 h-4" />
              View Profile
            </a>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Views</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</p>
              </div>
              <Eye className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Visitors</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.uniqueVisitors}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Viewed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.lastViewed}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Profile Views Over Time */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Profile Views (Last 7 Days)</h3>
            {profileViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profileViews}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Total Views" />
                  <Line type="monotone" dataKey="uniqueVisitors" stroke="#10b981" strokeWidth={2} name="Unique Visitors" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No view data available yet
              </div>
            )}
          </div>

          {/* Traffic Sources */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Traffic Sources</h3>
            {trafficSources.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No traffic source data available yet
              </div>
            )}
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Business Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Hourly Rate</p>
              <p className="text-2xl font-bold text-gray-900">£{tradesmanData.hourlyRate}/hr</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Insurance Status</p>
              <p className="text-lg text-gray-900">{tradesmanData.insuranceStatus}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Certifications</p>
              <p className="text-lg text-gray-900">{tradesmanData.certifications}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Payment Status</p>
              <p className="text-lg text-gray-900">
                {tradesmanData.payment_enabled ? '✅ Enabled' : '❌ Not Enabled'}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TradesmanAnalytics;

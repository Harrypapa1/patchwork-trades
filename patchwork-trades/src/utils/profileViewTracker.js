// Profile View Tracking System
// Tracks when users view tradesman profiles and for how long

import { addDoc, collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Track a profile view
 * @param {string} tradesmanId - ID of the tradesman being viewed
 * @param {string} tradesmanName - Name of the tradesman
 * @param {string} viewerId - ID of the viewer (or null if not logged in)
 * @param {string} viewerType - 'customer', 'tradesman', or 'anonymous'
 */
export const trackProfileView = async (tradesmanId, tradesmanName, viewerId = null, viewerType = 'anonymous') => {
  try {
    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0]; // YYYY-MM-DD
    
    // Create profile view record
    const viewData = {
      tradesman_id: tradesmanId,
      tradesman_name: tradesmanName,
      viewer_id: viewerId,
      viewer_type: viewerType,
      timestamp: timestamp,
      date: date,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      
      // Session tracking
      session_start: timestamp,
      session_end: null,
      duration_seconds: null,
      
      // Device info
      device_type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      user_agent: navigator.userAgent,
      
      // Page info
      referrer: document.referrer || 'direct',
      page_url: window.location.href
    };
    
    // Save to Firestore
    const docRef = await addDoc(collection(db, 'profile_views'), viewData);
    
    // Store the view ID in sessionStorage so we can update duration when they leave
    sessionStorage.setItem('current_profile_view_id', docRef.id);
    sessionStorage.setItem('profile_view_start_time', Date.now().toString());
    
    // Update tradesman's total view count
    const tradesmanRef = doc(db, 'tradesmen_profiles', tradesmanId);
    await updateDoc(tradesmanRef, {
      total_profile_views: increment(1),
      last_viewed_at: timestamp
    });
    
    console.log('📊 Profile view tracked:', tradesmanId);
    
    return docRef.id;
    
  } catch (error) {
    console.error('Error tracking profile view:', error);
  }
};

/**
 * Update profile view duration when user leaves
 * Call this when component unmounts or user navigates away
 */
export const endProfileView = async () => {
  try {
    const viewId = sessionStorage.getItem('current_profile_view_id');
    const startTime = sessionStorage.getItem('profile_view_start_time');
    
    if (!viewId || !startTime) return;
    
    const endTime = Date.now();
    const durationMs = endTime - parseInt(startTime);
    const durationSeconds = Math.floor(durationMs / 1000);
    
    // Only update if they spent at least 1 second (avoid accidental clicks)
    if (durationSeconds >= 1) {
      const viewRef = doc(db, 'profile_views', viewId);
      await updateDoc(viewRef, {
        session_end: new Date().toISOString(),
        duration_seconds: durationSeconds
      });
      
      console.log(`⏱️ Profile view ended: ${durationSeconds} seconds`);
    }
    
    // Clear session storage
    sessionStorage.removeItem('current_profile_view_id');
    sessionStorage.removeItem('profile_view_start_time');
    
  } catch (error) {
    console.error('Error ending profile view:', error);
  }
};

/**
 * Get profile view statistics for a tradesman
 * @param {string} tradesmanId - ID of the tradesman
 * @returns {Promise<Object>} View statistics
 */
export const getProfileViewStats = async (tradesmanId) => {
  try {
    const viewsQuery = query(
      collection(db, 'profile_views'),
      where('tradesman_id', '==', tradesmanId)
    );
    
    const viewsSnapshot = await getDocs(viewsQuery);
    const allViews = viewsSnapshot.docs.map(doc => doc.data());
    
    // Calculate stats
    const totalViews = allViews.length;
    
    // This month's views
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const thisMonthViews = allViews.filter(view => 
      view.month === currentMonth && view.year === currentYear
    ).length;
    
    // Today's views
    const today = now.toISOString().split('T')[0];
    const todayViews = allViews.filter(view => view.date === today).length;
    
    // Average duration (only count views with duration data)
    const viewsWithDuration = allViews.filter(view => view.duration_seconds !== null);
    const totalDuration = viewsWithDuration.reduce((sum, view) => sum + (view.duration_seconds || 0), 0);
    const avgDuration = viewsWithDuration.length > 0 
      ? Math.floor(totalDuration / viewsWithDuration.length) 
      : 0;
    
    // Viewer breakdown
    const viewerTypes = {
      customer: allViews.filter(v => v.viewer_type === 'customer').length,
      tradesman: allViews.filter(v => v.viewer_type === 'tradesman').length,
      anonymous: allViews.filter(v => v.viewer_type === 'anonymous').length
    };
    
    // Device breakdown
    const devices = {
      mobile: allViews.filter(v => v.device_type === 'mobile').length,
      desktop: allViews.filter(v => v.device_type === 'desktop').length
    };
    
    // Views by day (last 30 days)
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
    
    return {
      totalViews,
      thisMonthViews,
      todayViews,
      avgDurationSeconds: avgDuration,
      avgDurationFormatted: formatDuration(avgDuration),
      viewerTypes,
      devices,
      last30Days,
      rawViews: allViews
    };
    
  } catch (error) {
    console.error('Error getting profile view stats:', error);
    return {
      totalViews: 0,
      thisMonthViews: 0,
      todayViews: 0,
      avgDurationSeconds: 0,
      avgDurationFormatted: '0s',
      viewerTypes: { customer: 0, tradesman: 0, anonymous: 0 },
      devices: { mobile: 0, desktop: 0 },
      last30Days: [],
      rawViews: []
    };
  }
};

/**
 * Format duration in seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2m 30s")
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Get top viewed tradesmen (for admin dashboard)
 * @param {number} limit - Number of top tradesmen to return
 * @returns {Promise<Array>} Array of tradesmen with view counts
 */
export const getTopViewedTradesmen = async (limit = 10) => {
  try {
    // Get all profile views
    const viewsSnapshot = await getDocs(collection(db, 'profile_views'));
    const allViews = viewsSnapshot.docs.map(doc => doc.data());
    
    // Count views per tradesman
    const viewCounts = {};
    allViews.forEach(view => {
      const id = view.tradesman_id;
      if (!viewCounts[id]) {
        viewCounts[id] = {
          tradesman_id: id,
          tradesman_name: view.tradesman_name,
          total_views: 0,
          this_month_views: 0
        };
      }
      viewCounts[id].total_views++;
      
      // Count this month
      const now = new Date();
      if (view.month === now.getMonth() + 1 && view.year === now.getFullYear()) {
        viewCounts[id].this_month_views++;
      }
    });
    
    // Convert to array and sort by total views
    const topTradesmen = Object.values(viewCounts)
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, limit);
    
    return topTradesmen;
    
  } catch (error) {
    console.error('Error getting top viewed tradesmen:', error);
    return [];
  }
};

export default {
  trackProfileView,
  endProfileView,
  getProfileViewStats,
  getTopViewedTradesmen
};

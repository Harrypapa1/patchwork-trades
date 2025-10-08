// Traffic Tracking Utility
// Tracks page views, unique visitors, and session data

import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Get or create a unique visitor ID
 * Stored in localStorage to track returning visitors
 */
const getVisitorId = () => {
  let visitorId = localStorage.getItem('patchwork_visitor_id');
  
  if (!visitorId) {
    // Generate unique ID: timestamp + random string
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('patchwork_visitor_id', visitorId);
  }
  
  return visitorId;
};

/**
 * Get or create a session ID
 * Stored in sessionStorage - new session on each browser tab/window
 */
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('patchwork_session_id');
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('patchwork_session_id', sessionId);
    sessionStorage.setItem('session_start', new Date().toISOString());
  }
  
  return sessionId;
};

/**
 * Track a page view
 * @param {string} pagePath - The page path (e.g., '/browse', '/login')
 * @param {string} pageTitle - The page title
 * @param {Object} additionalData - Any extra data to track
 */
export const trackPageView = async (pagePath, pageTitle = '', additionalData = {}) => {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const timestamp = new Date().toISOString();
    
    // Get referrer (where they came from)
    const referrer = document.referrer || 'direct';
    
    // Get device/browser info
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    // Get screen resolution
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Create page view record
    const pageViewData = {
      // Core tracking
      visitor_id: visitorId,
      session_id: sessionId,
      timestamp: timestamp,
      
      // Page info
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_url: window.location.href,
      
      // Traffic source
      referrer: referrer,
      referrer_domain: referrer !== 'direct' ? new URL(referrer).hostname : 'direct',
      
      // Device info
      device_type: deviceType,
      screen_resolution: `${screenWidth}x${screenHeight}`,
      user_agent: userAgent,
      
      // Time info
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for easy queries
      hour: new Date().getHours(),
      day_of_week: new Date().getDay(), // 0 = Sunday, 6 = Saturday
      month: new Date().getMonth() + 1, // 1-12
      year: new Date().getFullYear(),
      
      // Additional data
      ...additionalData
    };
    
    // Save to Firestore
    await addDoc(collection(db, 'page_views'), pageViewData);
    
    console.log('📊 Page view tracked:', pagePath);
    
  } catch (error) {
    // Fail silently - don't disrupt user experience if tracking fails
    console.error('Error tracking page view:', error);
  }
};

/**
 * Track a custom event (like button clicks, form submissions, etc.)
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Data about the event
 */
export const trackEvent = async (eventName, eventData = {}) => {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const timestamp = new Date().toISOString();
    
    const eventRecord = {
      visitor_id: visitorId,
      session_id: sessionId,
      timestamp: timestamp,
      event_name: eventName,
      event_data: eventData,
      page_path: window.location.pathname,
      date: new Date().toISOString().split('T')[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    };
    
    await addDoc(collection(db, 'events'), eventRecord);
    
    console.log('🎯 Event tracked:', eventName);
    
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Check if this is a new visitor (first time on site)
 * @returns {boolean}
 */
export const isNewVisitor = () => {
  return !localStorage.getItem('patchwork_visitor_id');
};

/**
 * Check if this is a new session
 * @returns {boolean}
 */
export const isNewSession = () => {
  return !sessionStorage.getItem('patchwork_session_id');
};

/**
 * Get session duration in seconds
 * @returns {number}
 */
export const getSessionDuration = () => {
  const sessionStart = sessionStorage.getItem('session_start');
  if (!sessionStart) return 0;
  
  const start = new Date(sessionStart);
  const now = new Date();
  const durationMs = now - start;
  
  return Math.floor(durationMs / 1000); // Convert to seconds
};

export default {
  trackPageView,
  trackEvent,
  isNewVisitor,
  isNewSession,
  getSessionDuration
};

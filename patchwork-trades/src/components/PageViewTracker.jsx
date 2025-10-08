import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/trafficTracker';

/**
 * PageViewTracker Component
 * Automatically tracks page views whenever the route changes
 * Place this component in your App.jsx to track all pages
 */
const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever location changes
    trackPageView(location.pathname, document.title);
  }, [location]);

  // This component renders nothing
  return null;
};

export default PageViewTracker;

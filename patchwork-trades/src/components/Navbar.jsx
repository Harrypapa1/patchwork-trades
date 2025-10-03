import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

const Navbar = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isCustomerDashboardOpen, setIsCustomerDashboardOpen] = useState(false);
  
  // Notification counts
  const [notifications, setNotifications] = useState({
    quoteRequests: 0,
    activeJobs: 0
  });

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when clicking outside or on route change
  useEffect(() => {
    const handleClickOutside = () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Enhanced notification listeners
  useEffect(() => {
    if (!currentUser) {
      setNotifications({ quoteRequests: 0, activeJobs: 0 });
      return;
    }

    const unsubscribes = [];

    try {
      // 1. Quote Requests Listener
      let quotesQuery;
      if (userType === 'customer') {
        quotesQuery = query(
          collection(db, 'quote_requests'),
          where('customer_id', '==', currentUser.uid),
          where('status', 'in', ['pending', 'quoted', 'counter_offered'])
        );
      } else if (userType === 'tradesman') {
        quotesQuery = query(
          collection(db, 'quote_requests'),
          where('tradesman_id', '==', currentUser.uid),
          where('status', 'in', ['pending', 'customer_counter'])
        );
      }

      if (quotesQuery) {
        const quoteUnsubscribe = onSnapshot(
          quotesQuery,
          (snapshot) => {
            setNotifications(prev => ({
              ...prev,
              quoteRequests: snapshot.docs.length
            }));
          },
          (error) => {
            console.error('Error listening to quote requests:', error);
          }
        );
        unsubscribes.push(quoteUnsubscribe);
      }

      // 2. Active Jobs Listener - Look for status changes
      let jobsQuery;
      if (userType === 'customer') {
        jobsQuery = query(
          collection(db, 'active_jobs'),
          where('customer_id', '==', currentUser.uid),
          where('status', 'in', ['in_progress', 'completed', 'pending_approval'])
        );
      } else if (userType === 'tradesman') {
        jobsQuery = query(
          collection(db, 'active_jobs'),
          where('tradesman_id', '==', currentUser.uid),
          where('status', 'in', ['accepted'])
        );
      }

      if (jobsQuery) {
        const jobsUnsubscribe = onSnapshot(
          jobsQuery,
          (snapshot) => {
            // Count jobs with recent updates (last 24 hours)
            const recentJobs = snapshot.docs.filter(doc => {
              const data = doc.data();
              const updatedAt = data.updated_at;
              if (!updatedAt) return false;
              
              const updateTime = new Date(updatedAt);
              const now = new Date();
              const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
              
              return updateTime > dayAgo;
            });

            setNotifications(prev => ({
              ...prev,
              activeJobs: recentJobs.length
            }));
          },
          (error) => {
            console.error('Error listening to active jobs:', error);
          }
        );
        unsubscribes.push(jobsUnsubscribe);
      }

    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }

    // Cleanup function
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [currentUser, userType]);

  // Handle logout function
  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsDashboardOpen(false);
    setIsCustomerDashboardOpen(false);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
  };

  // Clear notifications when clicking nav links
  const clearNotifications = (type) => {
    setNotifications(prev => ({
      ...prev,
      [type]: 0
    }));
  };

  // Notification badge component
  const NotificationBadge = ({ count }) => {
    if (count === 0) return null;
    
    return (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center z-10">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
            <img 
              src="/patchwork-logo.png" 
              alt="Patchwork Trades Logo" 
              className="h-10 w-10 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="text-xl font-bold">Patchwork Trades</span>
          </Link>
          
          {/* Desktop Menu - Only show on desktop */}
          {!isMobile && (
            <div className="flex items-center space-x-4">
              {!currentUser ? (
                <>
                  <Link to="/login" className="hover:text-blue-200 transition-colors">
                    Login
                  </Link>
                  <Link to="/register-customer" className="hover:text-blue-200 transition-colors">
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {userType !== 'tradesman' && (
                    <Link to="/browse" className="hover:text-blue-200 transition-colors">
                      Browse Tradesmen
                    </Link>
                  )}
                  
                  {/* MOVED TO FIRST: Manage Availability - Tradesman Only */}
                  {userType === 'tradesman' && (
                    <Link to="/manage-availability" className="hover:text-blue-200 transition-colors">
                      Manage Availability
                    </Link>
                  )}
                  
                  {/* Quote Requests with Notification */}
                  <Link 
                    to="/quote-requests" 
                    className="hover:text-blue-200 transition-colors relative"
                    onClick={() => clearNotifications('quoteRequests')}
                  >
                    Quote Requests
                    <NotificationBadge count={notifications.quoteRequests} />
                  </Link>

                  {/* Weekly Jobs */}
                  <Link to="/weekly-jobs" className="hover:text-blue-200 transition-colors">
                    Weekly Jobs
                  </Link>

                  {/* Active Jobs with Notification */}
                  <Link to="/active-jobs" className="hover:text-blue-200 transition-colors relative" onClick={() => clearNotifications('activeJobs')}>
                    Active Jobs
                    <NotificationBadge count={notifications.activeJobs} />
                  </Link>
                  
                  {/* Customer Dashboard with Dropdown */}
                  {userType === 'customer' && (
                    <div className="relative group">
                      <Link to="/customer-dashboard" className="hover:text-blue-200 transition-colors flex items-center">
                        Dashboard
                        <span className="ml-1 text-xs">▼</span>
                      </Link>
                      <div className="absolute top-full left-0 bg-blue-700 rounded-md shadow-lg py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <Link to="/customer-dashboard" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Dashboard Home
                        </Link>
                        <Link to="/customer-how-it-works" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          How It Works
                        </Link>
                        <Link to="/top-performers" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Top Performers
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {/* Tradesman Dashboard with Top Earners */}
                  {userType === 'tradesman' && (
                    <div className="relative group">
                      <Link to="/tradesman-dashboard" className="hover:text-blue-200 transition-colors flex items-center">
                        Dashboard
                        <span className="ml-1 text-xs">▼</span>
                      </Link>
                      <div className="absolute top-full left-0 bg-blue-700 rounded-md shadow-lg py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <Link to="/tradesman-dashboard" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Dashboard Home
                        </Link>
                        <Link to="/tradesman-how-it-works" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          How It Works
                        </Link>
                        <Link to="/top-earners" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Top Earners
                        </Link>
                        <Link to="/earnings-overview" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Earnings Overview
                        </Link>
                        <Link to="/make-more-money" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          Make More Money
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mobile Menu Button - Only show on mobile */}
          {isMobile && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-blue-200 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-expanded={isMenuOpen}
                aria-label="Toggle menu"
              >
                <span className="text-2xl">
                  {isMenuOpen ? '✕' : '☰'}
                </span>
                {/* Total notifications indicator for mobile menu button */}
                {(notifications.quoteRequests + notifications.activeJobs) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.quoteRequests + notifications.activeJobs > 9 ? '9+' : 
                     notifications.quoteRequests + notifications.activeJobs}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu - Only show on mobile when open */}
        {isMobile && isMenuOpen && (
          <div 
            className="bg-blue-700 rounded-md mt-2 p-1 shadow-lg border border-blue-500"
            onClick={handleMenuClick}
          >
            {!currentUser ? (
              <>
                <Link 
                  to="/login" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  Login
                </Link>
                <Link 
                  to="/register-customer" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {userType !== 'tradesman' && (
                  <Link 
                    to="/browse" 
                    className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                    onClick={closeMenu}
                  >
                    Browse Tradesmen
                  </Link>
                )}
                
                {/* MOVED TO FIRST: Manage Availability - Tradesman Only */}
                {userType === 'tradesman' && (
                  <Link 
                    to="/manage-availability" 
                    className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                    onClick={closeMenu}
                  >
                    Manage Availability
                  </Link>
                )}
                
                {/* Quote Requests with Mobile Notification */}
                <Link 
                  to="/quote-requests" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium relative"
                  onClick={() => {
                    clearNotifications('quoteRequests');
                    closeMenu();
                  }}
                >
                  Quote Requests
                  {notifications.quoteRequests > 0 && (
                    <span className="absolute top-2 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {notifications.quoteRequests}
                    </span>
                  )}
                </Link>

                {/* Weekly Jobs */}
                <Link 
                  to="/weekly-jobs" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  Weekly Jobs
                </Link>

                {/* Active Jobs with Mobile Notification */}
                <Link 
                  to="/active-jobs" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium relative"
                  onClick={() => {
                    clearNotifications('activeJobs');
                    closeMenu();
                  }}
                >
                  Active Jobs
                  {notifications.activeJobs > 0 && (
                    <span className="absolute top-2 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {notifications.activeJobs}
                    </span>
                  )}
                </Link>
                
                {/* Customer Dashboard Mobile with Dropdown */}
                {userType === 'customer' && (
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomerDashboardOpen(!isCustomerDashboardOpen);
                      }}
                      className="block w-full text-left px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium flex items-center justify-between"
                    >
                      Dashboard
                      <span className={`text-xs transition-transform ${isCustomerDashboardOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isCustomerDashboardOpen && (
                      <div className="bg-blue-800 ml-4">
                        <Link 
                          to="/customer-dashboard" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Dashboard Home
                        </Link>
                        <Link 
                          to="/customer-how-it-works" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          How It Works
                        </Link>
                        <Link 
                          to="/top-performers" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Top Performers
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Tradesman Dashboard Mobile with Top Earners */}
                {userType === 'tradesman' && (
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDashboardOpen(!isDashboardOpen);
                      }}
                      className="block w-full text-left px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium flex items-center justify-between"
                    >
                      Dashboard
                      <span className={`text-xs transition-transform ${isDashboardOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isDashboardOpen && (
                      <div className="bg-blue-800 ml-4">
                        <Link 
                          to="/tradesman-dashboard" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Dashboard Home
                        </Link>
                        <Link 
                          to="/tradesman-how-it-works" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          How It Works
                        </Link>
                        <Link 
                          to="/top-earners" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Top Earners
                        </Link>
                        <Link 
                          to="/earnings-overview" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Earnings Overview
                        </Link>
                        <Link 
                          to="/make-more-money" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          Make More Money
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="border-t border-blue-500 mt-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 text-white hover:bg-red-600 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

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
  const [quoteRequestsCount, setQuoteRequestsCount] = useState(0); // Updated variable name
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

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

  // 🆕 NEW BULLETPROOF LISTENER - No more race conditions!
  useEffect(() => {
    if (!currentUser) {
      setQuoteRequestsCount(0);
      return;
    }

    try {
      let quotesQuery;
      if (userType === 'customer') {
        quotesQuery = query(
          collection(db, 'quote_requests'), // 🆕 NEW COLLECTION
          where('customer_id', '==', currentUser.uid)
        );
      } else if (userType === 'tradesman') {
        quotesQuery = query(
          collection(db, 'quote_requests'), // 🆕 NEW COLLECTION
          where('tradesman_id', '==', currentUser.uid)
        );
      }

      if (quotesQuery) {
        const unsubscribe = onSnapshot(
          quotesQuery, 
          (snapshot) => {
            setQuoteRequestsCount(snapshot.docs.length);
          },
          (error) => {
            console.error('Error listening to quote requests:', error);
            setQuoteRequestsCount(0);
          }
        );

        return () => unsubscribe();
      }
    } catch (error) {
      console.error('Error setting up quote requests listener:', error);
      setQuoteRequestsCount(0);
    }
  }, [currentUser, userType]);

  // Handle logout function
  const handleLogout = async () => {
    try {
      setIsMenuOpen(false); // Close mobile menu first
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
  };

  // Prevent menu clicks from bubbling up
  const handleMenuClick = (e) => {
    e.stopPropagation();
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
                      Browse
                    </Link>
                  )}
                  
                  {/* 🆕 NEW ROUTE: Quote Requests */}
                  <Link 
                    to="/quote-requests" 
                    className="hover:text-blue-200 transition-colors"
                  >
                    Quote Requests
                    {quoteRequestsCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {quoteRequestsCount}
                      </span>
                    )}
                  </Link>

                  {/* 🆕 NEW ROUTE: Weekly Jobs */}
                  <Link to="/weekly-jobs" className="hover:text-blue-200 transition-colors">
                    Weekly Jobs
                  </Link>

                  {/* 🆕 NEW ROUTE: Active Jobs */}
                  <Link to="/active-jobs" className="hover:text-blue-200 transition-colors">
                    Active Jobs
                  </Link>

                  {userType === 'tradesman' && (
                    <Link to="/manage-availability" className="hover:text-blue-200 transition-colors">
                      Manage Availability
                    </Link>
                  )}

                  
                  {userType === 'customer' && (
                    <Link to="/customer-dashboard" className="hover:text-blue-200 transition-colors">
                      Dashboard
                    </Link>
                  )}
                  
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
                        <Link to="/earnings-overview" className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors">
                          💰 Earnings Overview
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
                
                {/* 🆕 NEW ROUTE: Quote Requests */}
                <Link 
                  to="/quote-requests" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  Quote Requests
                  {quoteRequestsCount > 0 && (
                    <span className="absolute top-2 right-3 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {quoteRequestsCount}
                    </span>
                  )}
                </Link>

                {/* 🆕 NEW ROUTE: Weekly Jobs */}
                <Link 
                  to="/weekly-jobs" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  📅 Weekly Jobs
                </Link>

                {/* 🆕 NEW ROUTE: Active Jobs */}
                <Link 
                  to="/active-jobs" 
                  className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                  onClick={closeMenu}
                >
                  Active Jobs
                </Link>

                {userType === 'tradesman' && (
                  <Link 
                    to="/manage-availability" 
                    className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                    onClick={closeMenu}
                  >
                    Manage Availability
                  </Link>
                )}

                
                {userType === 'customer' && (
                  <Link 
                    to="/customer-dashboard" 
                    className="block px-4 py-3 text-white hover:bg-blue-600 transition-colors font-medium"
                    onClick={closeMenu}
                  >
                    Dashboard
                  </Link>
                )}
                
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
                          to="/earnings-overview" 
                          className="block px-4 py-2 text-white hover:bg-blue-600 transition-colors text-sm"
                          onClick={closeMenu}
                        >
                          💰 Earnings Overview
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

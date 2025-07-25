import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';

const Navbar = () => {
  const { currentUser, userType } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bookingRequestsCount, setBookingRequestsCount] = useState(0);

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for booking requests
  useEffect(() => {
    if (!currentUser) {
      setBookingRequestsCount(0);
      return;
    }

    let bookingQuery;
    if (userType === 'customer') {
      // Customers see their own requests
      bookingQuery = query(
        collection(db, 'bookings'),
        where('customer_id', '==', currentUser.uid),
        where('status', '==', 'Quote Requested')
      );
    } else if (userType === 'tradesman') {
      // Tradesmen see requests for them
      bookingQuery = query(
        collection(db, 'bookings'),
        where('tradesman_id', '==', currentUser.uid),
        where('status', '==', 'Quote Requested')
      );
    }

    if (bookingQuery) {
      const unsubscribe = onSnapshot(bookingQuery, (snapshot) => {
        setBookingRequestsCount(snapshot.docs.length);
      });

      return () => unsubscribe();
    }
  }, [currentUser, userType]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
            <img 
              src="/src/assets/patchwork-logo.png" 
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
              <Link to="/" className="hover:text-blue-200">
                Home
              </Link>
              
              {!currentUser ? (
                <>
                  <Link to="/login" className="hover:text-blue-200">
                    Login
                  </Link>
                  <Link to="/register-customer" className="hover:text-blue-200">
                    Register
                  </Link>
                </>
              ) : (
                <>
                  {userType !== 'tradesman' && (
                    <Link to="/browse" className="hover:text-blue-200">
                      Browse
                    </Link>
                  )}
                  
                  {/* Booking Requests - Both user types */}
                  <Link 
                    to="/booking-requests" 
                    className={`relative ${
                      bookingRequestsCount > 0 
                        ? 'text-yellow-300 hover:text-yellow-200 font-semibold' 
                        : 'hover:text-blue-200'
                    }`}
                  >
                    Booking Requests
                    {bookingRequestsCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {bookingRequestsCount}
                      </span>
                    )}
                  </Link>

                  {userType === 'tradesman' && (
                    <Link to="/manage-availability" className="hover:text-blue-200">
                      Manage Availability
                    </Link>
                  )}
                  
                  {userType === 'customer' && (
                    <Link to="/customer-dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                  )}
                  
                  {userType === 'tradesman' && (
                    <Link to="/tradesman-dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mobile Menu Button - Only show on mobile */}
          {isMobile && (
            <div>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-blue-200 hover:bg-blue-700"
                style={{ fontSize: '24px' }}
              >
                {isMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu - Only show on mobile when open */}
        {isMobile && isMenuOpen && (
          <div className="bg-blue-700 rounded-md mt-2 p-2">
            <Link 
              to="/" 
              className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
              onClick={closeMenu}
            >
              🏠 Home
            </Link>
            
            {!currentUser ? (
              <>
                <Link 
                  to="/login" 
                  className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                  onClick={closeMenu}
                >
                  🔑 Login
                </Link>
                <Link 
                  to="/register-customer" 
                  className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                  onClick={closeMenu}
                >
                  📝 Register
                </Link>
              </>
            ) : (
              <>
                {userType !== 'tradesman' && (
                  <Link 
                    to="/browse" 
                    className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                    onClick={closeMenu}
                  >
                    🔍 Browse Tradesmen
                  </Link>
                )}
                
                {/* Booking Requests - Mobile */}
                <Link 
                  to="/booking-requests" 
                  className={`block px-3 py-2 rounded-md text-white hover:bg-blue-600 relative ${
                    bookingRequestsCount > 0 ? 'font-bold' : ''
                  }`}
                  onClick={closeMenu}
                  style={{ 
                    backgroundColor: bookingRequestsCount > 0 ? '#f59e0b' : '#1e40af', 
                    border: '2px solid white' 
                  }}
                >
                  📋 BOOKING REQUESTS
                  {bookingRequestsCount > 0 && (
                    <span className="absolute top-1 right-2 bg-white text-yellow-600 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {bookingRequestsCount}
                    </span>
                  )}
                </Link>

                {userType === 'tradesman' && (
                  <Link 
                    to="/manage-availability" 
                    className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                    onClick={closeMenu}
                  >
                    📅 Manage Availability
                  </Link>
                )}
                
                {userType === 'customer' && (
                  <Link 
                    to="/customer-dashboard" 
                    className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                    onClick={closeMenu}
                  >
                    📊 Customer Dashboard
                  </Link>
                )}
                
                {userType === 'tradesman' && (
                  <Link 
                    to="/tradesman-dashboard" 
                    className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                    onClick={closeMenu}
                  >
                    🔧 Tradesman Dashboard
                  </Link>
                )}
                
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-blue-600"
                >
                  🚪 Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

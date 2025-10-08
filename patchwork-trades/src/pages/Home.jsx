import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom'; // 🆕 ADDED useSearchParams
import { useAuth } from '../context/AuthContext';
import { trackReferralVisit } from '../utils/referralTracker'; // 🆕 NEW IMPORT

const Home = () => {
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userState, setUserState] = useState({ currentUser: null, userType: null });
  const location = useLocation();
  const [searchParams] = useSearchParams(); // 🆕 NEW: Get URL parameters
  
  // Get redirect message from navigation state
  const redirectMessage = location.state?.message;
  const showRegister = location.state?.showRegister;
  const returnTo = location.state?.returnTo;

  // 🆕 NEW: Check for referral code in URL and track it
  useEffect(() => {
    const referralCode = searchParams.get('ref');
    
    if (referralCode) {
      trackReferralVisit(referralCode);
      console.log('🔗 Referral code detected:', referralCode);
    }
  }, [searchParams]);

  // Load auth state asynchronously - don't block page render
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const { currentUser, userType } = useAuth();
        setUserState({ currentUser, userType });
      } catch (error) {
        console.log('Auth loading...', error);
      }
      setAuthLoaded(true);
    }, 100); // Small delay to prevent blocking

    return () => clearTimeout(timer);
  }, []);

  // Dynamic button logic - with fallbacks
  const getTradesmanButtonLink = () => {
    if (authLoaded && userState.currentUser && userState.userType === 'tradesman') {
      return '/manage-availability';
    }
    return '/register-tradesman';
  };

  const getTradesmanButtonText = () => {
    if (authLoaded && userState.currentUser && userState.userType === 'tradesman') {
      return 'Manage Your Availability';
    }
    return 'List Your Availability';
  };

  const getCustomerButtonLink = () => {
    // If there's a returnTo (booking redirect), handle it specially
    if (returnTo) {
      if (authLoaded && userState.currentUser && userState.userType === 'customer') {
        return returnTo; // Go directly to booking form
      }
      // Need to register as customer
      return '/register-customer';
    }
    
    // Normal flow
    if (authLoaded && userState.currentUser && userState.userType === 'customer') {
      return '/browse';
    }
    return '/register-customer';
  };

  const getCustomerButtonState = () => {
    // Pass returnTo state only when redirecting to register
    if (returnTo && (!authLoaded || !userState.currentUser || userState.userType !== 'customer')) {
      return { returnTo, message: redirectMessage };
    }
    return undefined;
  };

  const getCustomerButtonText = () => {
    if (returnTo) {
      return 'Book This Tradesman';
    }
    return 'Find a Tradesman';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Show redirect message if it exists */}
          {redirectMessage && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6 max-w-2xl mx-auto">
              <div className="flex items-center">
                <span className="text-blue-500 mr-2">ℹ️</span>
                {redirectMessage}
              </div>
            </div>
          )}

          {/* Optimized Logo - Smaller and faster */}
          <div className="mb-8">
            <img 
              src="/patchwork-logo.png" 
              alt="Patchwork Trades Logo" 
              className="h-32 w-32 mx-auto object-contain"
              loading="eager"
              style={{ 
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))'
              }}
              onError={(e) => {
                // Immediate fallback
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            {/* CSS Fallback Logo - Always ready */}
            <div 
              className="h-32 w-32 mx-auto rounded-2xl relative overflow-hidden shadow-lg"
              style={{ display: 'none' }}
            >
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="bg-orange-400"></div>
                <div className="bg-teal-400"></div>
                <div className="bg-green-500"></div>
                <div className="bg-yellow-400"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-2xl font-bold">🔧</div>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Patchwork Trades
          </h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            On-Demand Tradesmen for Homes & Building Sites
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Find trusted local professionals or fill last-minute jobs — fast.
          </p>
          
          {/* CTA Buttons - Show immediately */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              to={getCustomerButtonLink()}
              state={getCustomerButtonState()}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {getCustomerButtonText()}
            </Link>
            <Link 
              to={getTradesmanButtonLink()}
              className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
            >
              {getTradesmanButtonText()}
            </Link>
          </div>

          {/* Show login option if there's a redirect */}
          {returnTo && (
            <div className="mb-16">
              <p className="text-gray-600 mb-4">Already have an account?</p>
              <Link 
                to="/login"
                state={{ returnTo, message: redirectMessage }}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-700 transition-colors"
              >
                Log In Instead
              </Link>
            </div>
          )}

          {/* How It Works Section */}
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Step 1 */}
              <div className="text-center">
                <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-blue-600 text-lg font-bold">1</span>
                </div>
                <h4 className="text-base font-semibold mb-2">Tradesmen List Days</h4>
                <p className="text-gray-600 text-sm">Professionals set their available calendar</p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="bg-orange-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-orange-600 text-lg font-bold">2</span>
                </div>
                <h4 className="text-base font-semibold mb-2">Find Available Tradesmen</h4>
                <p className="text-gray-600 text-sm">Browse local professionals with open dates</p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-green-600 text-lg font-bold">3</span>
                </div>
                <h4 className="text-base font-semibold mb-2">Message & Agree</h4>
                <p className="text-gray-600 text-sm">Chat to discuss the job and confirm booking</p>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-purple-600 text-lg font-bold">4</span>
                </div>
                <h4 className="text-base font-semibold mb-2">Get It Done</h4>
                <p className="text-gray-600 text-sm">A Patchwork professional gets the job done</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-blue-600 text-2xl">🔧</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Skilled Tradesmen</h3>
            <p className="text-gray-600">Connect with verified professionals in your area</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-green-600 text-2xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
            <p className="text-gray-600">Book available dates that work for you</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-purple-600 text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Direct Communication</h3>
            <p className="text-gray-600">Chat directly with tradesmen through our platform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

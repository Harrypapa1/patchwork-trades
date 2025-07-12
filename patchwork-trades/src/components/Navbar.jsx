import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const Navbar = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold" onClick={closeMenu}>
            Patchwork Trades
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
                  <Link to="/browse" className="hover:text-blue-200">
                    Browse
                  </Link>
                  
                  <Link to="/messages" className="hover:text-blue-200">
                    Messages
                  </Link>
                  
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
                  
                  <button
                    onClick={handleLogout}
                    className="hover:text-blue-200"
                  >
                    Logout
                  </button>
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
                <Link 
                  to="/browse" 
                  className="block px-3 py-2 rounded-md text-white hover:bg-blue-600"
                  onClick={closeMenu}
                >
                  🔍 Browse Tradesmen
                </Link>
                
                <Link 
                  to="/messages" 
                  className="block px-3 py-2 rounded-md text-white hover:bg-blue-600 font-bold"
                  onClick={closeMenu}
                  style={{ backgroundColor: '#1e40af', border: '2px solid white' }}
                >
                  📨 MESSAGES
                </Link>
                
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

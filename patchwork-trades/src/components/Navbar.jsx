import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const Navbar = () => {
  const { currentUser, userType } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold">
            Patchwork Trades
          </Link>
          
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
                  Browse Tradesmen
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

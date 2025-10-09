import React from 'react';
import { useNavigate } from 'react-router-dom';

const AuthModal = ({ isOpen, onClose, tradesmanName, tradesmanId }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    // Save booking intent to sessionStorage
    sessionStorage.setItem('bookingIntent', JSON.stringify({
      tradesmanId,
      tradesmanName,
      timestamp: Date.now()
    }));
    
    navigate('/login', { state: { from: 'booking', tradesmanId } });
  };

  const handleSignup = () => {
    // Save booking intent to sessionStorage
    sessionStorage.setItem('bookingIntent', JSON.stringify({
      tradesmanId,
      tradesmanName,
      timestamp: Date.now()
    }));
    
    navigate('/register-customer', { state: { from: 'booking', tradesmanId } });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Create an account to book
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 text-center mb-6">
          {tradesmanName ? `Sign up or log in to request a quote from ${tradesmanName}` : 'Sign up or log in to request a quote from this tradesperson'}
        </p>

        {/* Benefits */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-medium mb-2">With an account you can:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Request quotes from tradespeople</li>
            <li>✓ Track your job requests</li>
            <li>✓ Message tradespeople directly</li>
            <li>✓ Leave reviews after job completion</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignup}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Account
          </button>
          
          <button
            onClick={handleLogin}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Log In
          </button>
        </div>

        {/* Footer text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Takes 30 seconds • Free to sign up • No credit card required
        </p>
      </div>
    </div>
  );
};

export default AuthModal;

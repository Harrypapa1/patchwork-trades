import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const ResetConfirmation = () => {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="mb-6">
          {/* Email Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent a password reset link to:
          </p>
          {email && (
            <p className="text-blue-600 font-medium mt-1">{email}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">What's next?</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. Check your email inbox (and spam folder)</p>
            <p>2. Click the reset link in the email</p>
            <p>3. Create your new password</p>
            <p>4. Log in with your new password</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          
          <div className="flex space-x-4">
            <Link
              to="/forgot-password"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Send Again
            </Link>
            <Link
              to="/login"
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors text-sm"
            >
              Back to Login
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you continue to have trouble, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmation;

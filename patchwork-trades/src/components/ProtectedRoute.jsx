import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, userType }) => {
  const { currentUser, userType: currentUserType, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // After loading completes, check if user is authenticated
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check if specific user type is required
  if (userType && currentUserType !== userType) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;

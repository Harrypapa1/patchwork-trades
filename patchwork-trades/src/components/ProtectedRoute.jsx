import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, userType }) => {
  const { currentUser, userType: currentUserType } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (userType && currentUserType !== userType) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
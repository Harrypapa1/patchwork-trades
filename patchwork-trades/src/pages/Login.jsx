import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect information
  const redirectMessage = location.state?.message;
  const returnTo = location.state?.returnTo;
  
  // DEBUG: Check what state we received
  console.log('Login page state:', location.state);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      // Check if there's a specific place to redirect to
      if (returnTo) {
        console.log('Storing redirect in localStorage:', returnTo);
        localStorage.setItem('pendingRedirect', returnTo);
      }

      console.log('Proceeding with normal login flow');

      console.log('Proceeding with normal login flow');

      // Otherwise, check user type and redirect to appropriate dashboard
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.user_type === 'customer') {
          
          // Check for stored redirect for customers
          const storedRedirect = localStorage.getItem('pendingRedirect');
          if (storedRedirect) {
            console.log('Customer login - using stored redirect:', storedRedirect);
            localStorage.removeItem('pendingRedirect');
            navigate(storedRedirect);
            return;
          }
          
          console.log('Customer login - normal dashboard');
          navigate('/customer-dashboard');
        }
      } else {
        // Check if user is a tradesman
        const tradesmanDoc = await getDoc(doc(db, 'tradesmen_profiles', userCredential.user.uid));
        if (tradesmanDoc.exists()) {
          // Clear any stored redirect for tradesmen
          localStorage.removeItem('pendingRedirect');
          navigate('/tradesman-dashboard');
        } else {
          setError('User profile not found');
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
      
      {/* Show redirect message if it exists */}
      {redirectMessage && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <span className="text-blue-500 mr-2">ℹ️</span>
            {redirectMessage}
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register-customer" className="text-blue-600 hover:underline">
            Register as Customer
          </Link>
          {' '}or{' '}
          <Link to="/register-tradesman" className="text-blue-600 hover:underline">
            Register as Tradesman
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

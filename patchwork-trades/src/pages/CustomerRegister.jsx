import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getReferralCodeFromSession, recordReferral, getUserReferralCode } from '../utils/referralTracker'; // 🆕 NEW IMPORT

const CustomerRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    postcode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  const redirectMessage = location.state?.message;
  const returnTo = location.state?.returnTo;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getCoordinatesFromPostcode = async (postcode) => {
    try {
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
      const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
      const data = await response.json();
      
      if (data.status === 200) {
        return {
          latitude: data.result.latitude,
          longitude: data.result.longitude
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get coordinates from postcode
      let coordinates = { latitude: 0, longitude: 0 };
      if (formData.postcode) {
        const coords = await getCoordinatesFromPostcode(formData.postcode);
        if (coords) {
          coordinates = coords;
        } else {
          setError('Invalid postcode. Please check and try again.');
          setLoading(false);
          return;
        }
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      // 🆕 NEW: Get referral code from session (if they were referred)
      const referralCode = getReferralCodeFromSession();
      
      // 🆕 NEW: Generate this user's own referral code
      const myReferralCode = await getUserReferralCode(
        userCredential.user.uid,
        formData.name,
        'customer'
      );

      // Create Firestore document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        postcode: formData.postcode,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        user_type: 'customer',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(), // Added for consistency
        userId: userCredential.user.uid,
        // 🆕 NEW: Referral fields
        referral_code: myReferralCode,
        referral_link: `https://patchworktrades.com/?ref=${myReferralCode}`,
        total_referrals: 0,
        referred_by: referralCode || null // Track who referred them
      });

      // 🆕 NEW: Record the referral if they were referred by someone
      if (referralCode) {
        await recordReferral(
          userCredential.user.uid,
          formData.name,
          formData.email,
          'customer',
          referralCode
        );
        console.log('🎉 Referral recorded!');
      }

      // Redirect based on where they came from
      if (returnTo) {
        console.log('Registration success - redirecting to:', returnTo);
        navigate(returnTo);
      } else {
        console.log('Registration success - normal dashboard');
        navigate('/customer-dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Register as Customer</h2>
      
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Postcode *
          </label>
          <input
            type="text"
            name="postcode"
            value={formData.postcode}
            onChange={handleChange}
            placeholder="e.g., M1 1AA"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Used to find tradespeople near you
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default CustomerRegister;

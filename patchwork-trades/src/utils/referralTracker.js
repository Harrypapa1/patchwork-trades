// Member Referral Tracking System
// Tracks which users are referring new signups

import { addDoc, collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Generate a unique referral code for a user
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @returns {string} Referral code (e.g., "MIKE-BUILDER-A3X9")
 */
export const generateReferralCode = (userId, userName) => {
  // Create code from name + random string
  const namePart = userName
    .toUpperCase()
    .replace(/[^A-Z]/g, '-')
    .substring(0, 12);
  
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${namePart}-${randomPart}`;
};

/**
 * Get or create referral code for a user
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} userType - 'customer' or 'tradesman'
 * @returns {Promise<string>} Referral code
 */
export const getUserReferralCode = async (userId, userName, userType) => {
  try {
    // Check if user already has a referral code
    const userCollection = userType === 'tradesman' ? 'tradesmen_profiles' : 'users';
    const userRef = doc(db, userCollection, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().referral_code) {
      return userDoc.data().referral_code;
    }
    
    // Generate new referral code
    const referralCode = generateReferralCode(userId, userName);
    
    // Save to user profile
    await updateDoc(userRef, {
      referral_code: referralCode,
      referral_link: `https://patchworktrades.com/?ref=${referralCode}`,
      total_referrals: 0,
      created_referral_code_at: new Date().toISOString()
    });
    
    return referralCode;
    
  } catch (error) {
    console.error('Error getting referral code:', error);
    return null;
  }
};

/**
 * Track when someone visits with a referral code
 * Store in session until they sign up
 * @param {string} referralCode - The referral code from URL
 */
export const trackReferralVisit = (referralCode) => {
  if (!referralCode) return;
  
  // Store referral code in sessionStorage so we can use it on signup
  sessionStorage.setItem('signup_referral_code', referralCode);
  sessionStorage.setItem('referral_visit_time', new Date().toISOString());
  
  console.log('🔗 Referral visit tracked:', referralCode);
};

/**
 * Get referral code from session (used during signup)
 * @returns {string|null} Referral code or null
 */
export const getReferralCodeFromSession = () => {
  return sessionStorage.getItem('signup_referral_code');
};

/**
 * Record a successful referral (call this after user signs up)
 * @param {string} newUserId - ID of the new user who signed up
 * @param {string} newUserName - Name of the new user
 * @param {string} newUserEmail - Email of the new user
 * @param {string} newUserType - 'customer' or 'tradesman'
 * @param {string} referralCode - The referral code they used
 */
export const recordReferral = async (newUserId, newUserName, newUserEmail, newUserType, referralCode) => {
  try {
    if (!referralCode) return;
    
    // Find the referrer by referral code
    const referrer = await findUserByReferralCode(referralCode);
    
    if (!referrer) {
      console.log('Referral code not found:', referralCode);
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Create referral record
    const referralData = {
      // Referrer info
      referrer_id: referrer.id,
      referrer_name: referrer.name,
      referrer_email: referrer.email,
      referrer_type: referrer.user_type,
      referral_code: referralCode,
      
      // New user info
      referred_user_id: newUserId,
      referred_user_name: newUserName,
      referred_user_email: newUserEmail,
      referred_user_type: newUserType,
      
      // Tracking
      timestamp: timestamp,
      date: timestamp.split('T')[0],
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      
      // Status
      status: 'signed_up', // signed_up -> first_job -> active_user
      conversion_value: 0, // Will be updated when they complete first job
      
      // Attribution
      visit_time: sessionStorage.getItem('referral_visit_time'),
      signup_time: timestamp
    };
    
    // Save referral record
    await addDoc(collection(db, 'referrals'), referralData);
    
    // Update referrer's total referral count
    const referrerCollection = referrer.user_type === 'tradesman' ? 'tradesmen_profiles' : 'users';
    const referrerRef = doc(db, referrerCollection, referrer.id);
    await updateDoc(referrerRef, {
      total_referrals: increment(1),
      last_referral_at: timestamp
    });
    
    // Clear referral code from session
    sessionStorage.removeItem('signup_referral_code');
    sessionStorage.removeItem('referral_visit_time');
    
    console.log('🎉 Referral recorded:', referrer.name, '→', newUserName);
    
  } catch (error) {
    console.error('Error recording referral:', error);
  }
};

/**
 * Find user by referral code
 * @param {string} referralCode - Referral code
 * @returns {Promise<Object|null>} User data or null
 */
const findUserByReferralCode = async (referralCode) => {
  try {
    // Search in customers
    const customersQuery = query(
      collection(db, 'users'),
      where('referral_code', '==', referralCode)
    );
    const customersSnapshot = await getDocs(customersQuery);
    
    if (!customersSnapshot.empty) {
      const userData = customersSnapshot.docs[0].data();
      return {
        id: customersSnapshot.docs[0].id,
        name: userData.name,
        email: userData.email,
        user_type: 'customer'
      };
    }
    
    // Search in tradesmen
    const tradesmenQuery = query(
      collection(db, 'tradesmen_profiles'),
      where('referral_code', '==', referralCode)
    );
    const tradesmenSnapshot = await getDocs(tradesmenQuery);
    
    if (!tradesmenSnapshot.empty) {
      const userData = tradesmenSnapshot.docs[0].data();
      return {
        id: tradesmenSnapshot.docs[0].id,
        name: userData.name,
        email: userData.email,
        user_type: 'tradesman'
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error finding user by referral code:', error);
    return null;
  }
};

/**
 * Get referral statistics for a user
 * @param {string} userId - User ID
 * @param {string} userType - 'customer' or 'tradesman'
 * @returns {Promise<Object>} Referral statistics
 */
export const getUserReferralStats = async (userId, userType) => {
  try {
    const referralsQuery = query(
      collection(db, 'referrals'),
      where('referrer_id', '==', userId)
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    const allReferrals = referralsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate stats
    const totalReferrals = allReferrals.length;
    
    // This month's referrals
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const thisMonthReferrals = allReferrals.filter(ref => 
      ref.month === currentMonth && ref.year === currentYear
    ).length;
    
    // Referral breakdown by type
    const customerReferrals = allReferrals.filter(ref => ref.referred_user_type === 'customer').length;
    const tradesmanReferrals = allReferrals.filter(ref => ref.referred_user_type === 'tradesman').length;
    
    // Total conversion value (revenue generated from referrals)
    const totalValue = allReferrals.reduce((sum, ref) => sum + (ref.conversion_value || 0), 0);
    
    // Recent referrals (last 5)
    const recentReferrals = allReferrals
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    return {
      totalReferrals,
      thisMonthReferrals,
      customerReferrals,
      tradesmanReferrals,
      totalValue,
      recentReferrals,
      allReferrals
    };
    
  } catch (error) {
    console.error('Error getting referral stats:', error);
    return {
      totalReferrals: 0,
      thisMonthReferrals: 0,
      customerReferrals: 0,
      tradesmanReferrals: 0,
      totalValue: 0,
      recentReferrals: [],
      allReferrals: []
    };
  }
};

/**
 * Get top referrers (for admin dashboard)
 * @param {number} limit - Number of top referrers to return
 * @returns {Promise<Array>} Array of top referrers
 */
export const getTopReferrers = async (limit = 10) => {
  try {
    const referralsSnapshot = await getDocs(collection(db, 'referrals'));
    const allReferrals = referralsSnapshot.docs.map(doc => doc.data());
    
    // Count referrals per user
    const referrerCounts = {};
    allReferrals.forEach(ref => {
      const id = ref.referrer_id;
      if (!referrerCounts[id]) {
        referrerCounts[id] = {
          referrer_id: id,
          referrer_name: ref.referrer_name,
          referrer_email: ref.referrer_email,
          referrer_type: ref.referrer_type,
          total_referrals: 0,
          this_month_referrals: 0,
          customer_referrals: 0,
          tradesman_referrals: 0,
          total_value: 0
        };
      }
      
      referrerCounts[id].total_referrals++;
      referrerCounts[id].total_value += (ref.conversion_value || 0);
      
      // Count by type
      if (ref.referred_user_type === 'customer') {
        referrerCounts[id].customer_referrals++;
      } else {
        referrerCounts[id].tradesman_referrals++;
      }
      
      // Count this month
      const now = new Date();
      if (ref.month === now.getMonth() + 1 && ref.year === now.getFullYear()) {
        referrerCounts[id].this_month_referrals++;
      }
    });
    
    // Convert to array and sort by total referrals
    const topReferrers = Object.values(referrerCounts)
      .sort((a, b) => b.total_referrals - a.total_referrals)
      .slice(0, limit);
    
    return topReferrers;
    
  } catch (error) {
    console.error('Error getting top referrers:', error);
    return [];
  }
};

/**
 * Update referral conversion value when referred user completes first job
 * @param {string} referredUserId - ID of the referred user
 * @param {number} jobValue - Value of the job (platform fee)
 */
export const updateReferralValue = async (referredUserId, jobValue) => {
  try {
    // Find the referral record for this user
    const referralsQuery = query(
      collection(db, 'referrals'),
      where('referred_user_id', '==', referredUserId),
      where('status', '==', 'signed_up')
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    
    if (!referralsSnapshot.empty) {
      const referralDoc = referralsSnapshot.docs[0];
      await updateDoc(doc(db, 'referrals', referralDoc.id), {
        status: 'first_job',
        conversion_value: jobValue,
        first_job_completed_at: new Date().toISOString()
      });
      
      console.log('💰 Referral value updated:', jobValue);
    }
    
  } catch (error) {
    console.error('Error updating referral value:', error);
  }
};

export default {
  generateReferralCode,
  getUserReferralCode,
  trackReferralVisit,
  getReferralCodeFromSession,
  recordReferral,
  getUserReferralStats,
  getTopReferrers,
  updateReferralValue
};

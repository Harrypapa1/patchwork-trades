// Violation Tracking System
// Logs violations to Firebase and manages account suspension

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Check if user account is suspended
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} { suspended: boolean, violationCount: number, violations: Array }
 */
export const checkUserStatus = async (userId) => {
  try {
    const userViolationDoc = await getDoc(doc(db, 'user_violations', userId));
    
    if (!userViolationDoc.exists()) {
      return {
        suspended: false,
        violationCount: 0,
        violations: [],
        accountStatus: 'active'
      };
    }

    const data = userViolationDoc.data();
    
    return {
      suspended: data.account_status === 'suspended',
      violationCount: data.violation_count || 0,
      violations: data.violations || [],
      accountStatus: data.account_status || 'active',
      suspendedAt: data.suspended_at || null,
      suspendedReason: data.suspended_reason || null
    };
  } catch (error) {
    console.error('Error checking user status:', error);
    return {
      suspended: false,
      violationCount: 0,
      violations: [],
      accountStatus: 'active'
    };
  }
};

/**
 * Log a violation attempt to Firebase
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} userName - User name
 * @param {string} userType - 'customer' or 'tradesman'
 * @param {Object} violationData - Details about the violation
 * @returns {Promise<Object>} { suspended: boolean, violationCount: number, message: string }
 */
export const logViolation = async (userId, userEmail, userName, userType, violationData) => {
  try {
    const userViolationRef = doc(db, 'user_violations', userId);
    const userViolationDoc = await getDoc(userViolationRef);

    const timestamp = new Date().toISOString();
    
    const violationEntry = {
      timestamp,
      location: violationData.location, // e.g., 'booking_request_form', 'quote_comment'
      detected_content: violationData.detectedContent, // What was detected
      violation_types: violationData.violationTypes, // ['phone', 'email', etc.]
      blocked_text: violationData.blockedText ? violationData.blockedText.substring(0, 100) : '', // First 100 chars
      user_agent: navigator.userAgent,
      ip_address: null // Would need backend integration for real IP
    };

    if (!userViolationDoc.exists()) {
      // First violation - create new document
      await setDoc(userViolationRef, {
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_type: userType,
        violation_count: 1,
        account_status: 'active',
        violations: [violationEntry],
        first_violation_at: timestamp,
        last_violation_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp
      });

      return {
        suspended: false,
        violationCount: 1,
        message: 'First violation logged. Warning issued.'
      };
    } else {
      // Existing violations - increment count
      const currentData = userViolationDoc.data();
      const newViolationCount = (currentData.violation_count || 0) + 1;

      // Check if this triggers suspension (3rd violation)
      const shouldSuspend = newViolationCount >= 3;

      const updateData = {
        violation_count: increment(1),
        violations: arrayUnion(violationEntry),
        last_violation_at: timestamp,
        updated_at: timestamp
      };

      if (shouldSuspend) {
        updateData.account_status = 'suspended';
        updateData.suspended_at = timestamp;
        updateData.suspended_reason = 'Multiple attempts to share contact information before job confirmation';
        updateData.suspended_by_system = true;
      }

      await updateDoc(userViolationRef, updateData);

      // Also update the user's main profile to mark as suspended
      if (shouldSuspend) {
        const userCollection = userType === 'tradesman' ? 'tradesmen_profiles' : 'users';
        const userProfileRef = doc(db, userCollection, userId);
        
        try {
          await updateDoc(userProfileRef, {
            account_status: 'suspended',
            suspended_at: timestamp,
            suspended_reason: 'Policy violations - contact info sharing'
          });
        } catch (error) {
          console.error('Error updating user profile suspension status:', error);
        }
      }

      return {
        suspended: shouldSuspend,
        violationCount: newViolationCount,
        message: shouldSuspend 
          ? 'Account suspended after 3rd violation.' 
          : `Violation ${newViolationCount} logged. ${3 - newViolationCount} warning(s) remaining.`
      };
    }
  } catch (error) {
    console.error('Error logging violation:', error);
    throw error;
  }
};

/**
 * Check if user can perform actions (not suspended)
 * @param {string} userId - User ID to check
 * @returns {Promise<Object>} { allowed: boolean, reason: string }
 */
export const canUserPerformAction = async (userId) => {
  try {
    const status = await checkUserStatus(userId);
    
    if (status.suspended) {
      return {
        allowed: false,
        reason: 'Account suspended for policy violations. Contact support@patchworktrades.com to appeal.',
        violationCount: status.violationCount
      };
    }

    return {
      allowed: true,
      reason: null,
      violationCount: status.violationCount
    };
  } catch (error) {
    console.error('Error checking user action permissions:', error);
    // Fail open - allow action if check fails
    return {
      allowed: true,
      reason: null,
      violationCount: 0
    };
  }
};

/**
 * Admin function to unsuspend a user
 * @param {string} userId - User ID to unsuspend
 * @param {string} adminId - Admin user ID performing the action
 * @param {string} userType - 'customer' or 'tradesman'
 * @param {string} notes - Admin notes about unsuspension
 * @returns {Promise<boolean>} Success status
 */
export const unsuspendUser = async (userId, adminId, userType, notes = '') => {
  try {
    const timestamp = new Date().toISOString();
    
    // Update violation record
    const userViolationRef = doc(db, 'user_violations', userId);
    await updateDoc(userViolationRef, {
      account_status: 'active',
      unsuspended_at: timestamp,
      unsuspended_by: adminId,
      unsuspension_notes: notes,
      updated_at: timestamp
    });

    // Update user profile
    const userCollection = userType === 'tradesman' ? 'tradesmen_profiles' : 'users';
    const userProfileRef = doc(db, userCollection, userId);
    await updateDoc(userProfileRef, {
      account_status: 'active',
      unsuspended_at: timestamp,
      unsuspended_by: adminId
    });

    return true;
  } catch (error) {
    console.error('Error unsuspending user:', error);
    return false;
  }
};

/**
 * Get violation statistics for admin dashboard
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User violation stats
 */
export const getUserViolationStats = async (userId) => {
  try {
    const userViolationDoc = await getDoc(doc(db, 'user_violations', userId));
    
    if (!userViolationDoc.exists()) {
      return {
        hasViolations: false,
        violationCount: 0,
        accountStatus: 'active'
      };
    }

    const data = userViolationDoc.data();
    
    return {
      hasViolations: true,
      violationCount: data.violation_count || 0,
      accountStatus: data.account_status || 'active',
      firstViolation: data.first_violation_at,
      lastViolation: data.last_violation_at,
      violations: data.violations || [],
      suspendedAt: data.suspended_at,
      suspendedReason: data.suspended_reason
    };
  } catch (error) {
    console.error('Error getting user violation stats:', error);
    return {
      hasViolations: false,
      violationCount: 0,
      accountStatus: 'active'
    };
  }
};

/**
 * Clear user violations (admin function - use with caution)
 * @param {string} userId - User ID
 * @param {string} adminId - Admin performing action
 * @returns {Promise<boolean>}
 */
export const clearUserViolations = async (userId, adminId) => {
  try {
    const timestamp = new Date().toISOString();
    
    const userViolationRef = doc(db, 'user_violations', userId);
    await updateDoc(userViolationRef, {
      violation_count: 0,
      account_status: 'active',
      violations_cleared_at: timestamp,
      cleared_by: adminId,
      updated_at: timestamp
    });

    return true;
  } catch (error) {
    console.error('Error clearing violations:', error);
    return false;
  }
};

export default {
  checkUserStatus,
  logViolation,
  canUserPerformAction,
  unsuspendUser,
  getUserViolationStats,
  clearUserViolations
};
